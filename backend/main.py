from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import os
from functools import lru_cache
import json
import base64
import hashlib
import hmac
import secrets
import re
import threading

from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, EmailStr
from jwt import encode, decode, PyJWTError
import requests
from dotenv import load_dotenv

try:
    import joblib
    import sklearn
except ImportError:
    joblib = None
    sklearn = None

load_dotenv()

# Configuration
OPENROUTER_API_KEY = (os.getenv('OPENROUTER_API_KEY') or '').strip()
OPENROUTER_BASE_URL = (os.getenv('OPENROUTER_BASE_URL') or 'https://openrouter.ai/api/v1').rstrip('/')
APP_BASE_URL = (os.getenv('APP_BASE_URL') or '').strip()
APP_NAME = (os.getenv('APP_NAME') or 'Zenify').strip()
SERVER_KEEPALIVE_ENABLED = (os.getenv('SERVER_KEEPALIVE_ENABLED', 'true').strip().lower() in {'1', 'true', 'yes', 'on'})
SERVER_KEEPALIVE_INTERVAL_SECONDS = max(60, int(os.getenv('SERVER_KEEPALIVE_INTERVAL_SECONDS', 180)))
SERVER_KEEPALIVE_TARGET_URL = (os.getenv('SERVER_KEEPALIVE_TARGET_URL') or '').strip()
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./zenify.db')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', 480))
DEFAULT_CHAT_MODEL = os.getenv('DEFAULT_CHAT_MODEL', 'openai/gpt-4o-mini')
OPENROUTER_ENABLE_REASONING = os.getenv('OPENROUTER_ENABLE_REASONING', 'true').strip().lower() in {'1', 'true', 'yes', 'on'}
FRONTEND_ORIGINS = [
    origin.strip().rstrip('/')
    for origin in os.getenv('FRONTEND_ORIGINS', 'http://localhost:5173').split(',')
    if origin.strip()
]
FRONTEND_ORIGIN_REGEX = os.getenv('FRONTEND_ORIGIN_REGEX', r'https://.*\.vercel\.app').strip()
# Normalize common env escaping mistakes like https://.*\\.vercel\\.app
FRONTEND_ORIGIN_REGEX = FRONTEND_ORIGIN_REGEX.replace('\\\\', '\\')
if not FRONTEND_ORIGIN_REGEX:
    FRONTEND_ORIGIN_REGEX = r'https://.*\.vercel\.app'
try:
    re.compile(FRONTEND_ORIGIN_REGEX)
except re.error:
    FRONTEND_ORIGIN_REGEX = r'https://.*\.vercel\.app'
PASSWORD_HASH_ITERATIONS = int(os.getenv('PASSWORD_HASH_ITERATIONS', 210000))
ADMIN_EMAILS = {
    email.strip().lower()
    for email in os.getenv('ADMIN_EMAILS', '').split(',')
    if email.strip()
}

# Use psycopg driver for PostgreSQL connections (Render Python 3.14 compatible)
if DATABASE_URL.startswith('postgresql://') and '+psycopg' not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg://', 1)

if len(JWT_SECRET) < 32:
    raise ValueError('JWT_SECRET must be at least 32 characters')

# Database setup
engine = create_engine(DATABASE_URL, connect_args={'check_same_thread': False} if 'sqlite' in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database models
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column('hashed_password', String)
    full_name = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class FlaggedEvent(Base):
    __tablename__ = 'flagged_events'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    user_email = Column(String, nullable=False)
    conversation_id = Column(String, nullable=True, index=True)
    content_type = Column(String, nullable=False, default='chat')
    content = Column(String, nullable=False)
    reason = Column(String, nullable=False)
    risk_level = Column(String, nullable=False, index=True)
    reviewed = Column(Boolean, default=False)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

Base.metadata.create_all(bind=engine)

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    is_admin: bool

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserResponse

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: str = DEFAULT_CHAT_MODEL

class ChatResponse(BaseModel):
    content: str
    role: str = 'assistant'

# Suicide Risk Analysis Models
class SuicideAnalysisRequest(BaseModel):
    text: str
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None
    context_messages: List[Dict[str, Any]] = []

class RiskAnalysisResponse(BaseModel):
    risk_level: str
    confidence: float
    risk_factors: List[str]
    contextual_cues: List[str]
    mcp_classification: bool
    recommended_action: str
    flagged: bool
    knowledge_base_matches: List[str]


class FlaggedEventCreate(BaseModel):
    conversation_id: Optional[str] = None
    type: str = 'chat'
    content: str
    reason: str
    risk_level: str


class FlaggedEventReview(BaseModel):
    reviewed: bool = True
    reviewed_by: Optional[str] = None


class FlaggedEventResponse(BaseModel):
    id: str
    type: str
    content: str
    reason: str
    riskLevel: str
    timestamp: int
    reviewed: bool
    reviewedAt: Optional[int] = None
    reviewedBy: Optional[str] = None
    userId: Optional[str] = None
    userEmail: Optional[str] = None

# FastAPI app
app = FastAPI(title='Zenify API', version='1.0.0')

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_origin_regex=FRONTEND_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# ========== SUICIDE DETECTION RAG SYSTEM ==========

class SimplifiedSuicideDetectionRAG:
    """ML-powered suicide risk detection system using logistic regression and pattern matching"""
    
    def __init__(self):
        self.mcp_model = None
        self.mcp_vectorizer = None
        self.load_models()
        self.load_patterns()
    
    def load_models(self):
        """Load pre-trained ML models from MCP directory"""
        if not joblib:
            print("Warning: joblib not available, ML models will not be loaded")
            return
        
        try:
            mcp_path = os.path.join(os.path.dirname(__file__), '..', 'MCP')
            vectorizer_path = os.path.join(mcp_path, 'vectorizer.joblib')
            model_path = os.path.join(mcp_path, 'logreg_model.joblib')
            
            if os.path.exists(vectorizer_path) and os.path.exists(model_path):
                self.mcp_vectorizer = joblib.load(vectorizer_path)
                self.mcp_model = joblib.load(model_path)
                print("✓ ML models loaded successfully from MCP directory")
            else:
                print(f"Warning: Model files not found in {mcp_path}")
        except Exception as e:
            print(f"Warning: Could not load ML models: {e}")
    
    def load_patterns(self):
        """Load suicide detection patterns"""
        self.direct_patterns = [
            'i want to kill myself', 'i am going to kill myself', 'i plan to end my life',
            'i am going to commit suicide', 'i have decided to die', 'i will take my own life',
            'tonight is my last night', 'i have a plan to', 'i already have the', 'i know how i will',
            'i want to die', 'i should be dead', 'i am done with life', 'i am ending it all'
        ]
        
        self.indirect_patterns = [
            'i can\'t go on anymore', 'there\'s no point in living', 'everyone would be better without me',
            'i feel like giving up', 'life is too hard', 'i don\'t see a way out',
            'i feel trapped', 'nothing will ever get better', 'i am a burden to everyone',
            'i just want the pain to stop', 'hopeless', 'worthless', 'empty', 'numb',
            'i am tired of being here', 'i wish i could disappear', 'no reason to wake up'
        ]
        
        self.method_patterns = [
            'pills', 'rope', 'bridge', 'gun', 'knife', 'overdose',
            'hanging', 'jumping', 'drowning', 'cutting', 'poison',
            'carbon monoxide', 'razor', 'train tracks'
        ]
        
        self.temporal_patterns = [
            'tonight is my last', 'today i will end', 'tomorrow i plan to', 'this weekend i will',
            'when i get home tonight', 'after this conversation', 'in the morning i will',
            'by tonight', 'before tomorrow', 'very soon i will',
            'right now', 'goodbye everyone', 'final message'
        ]

        self.protective_patterns = [
            'i am safe', 'i am not suicidal', 'i do not want to die', 'i don\'t want to kill myself',
            'i reached out for help', 'i called 988', 'my family needs me', 'i want to get better',
            'i have a therapist', 'i have support', 'i will not hurt myself', 'i have no plan'
        ]
    
    def mcp_classify(self, text: str) -> tuple[bool, float]:
        """Use ML model for suicide detection"""
        if not self.mcp_vectorizer or not self.mcp_model:
            return False, 0.0
        
        try:
            X = self.mcp_vectorizer.transform([text])
            prediction = self.mcp_model.predict(X)[0]
            probability = self.mcp_model.predict_proba(X)[0]
            confidence = max(probability)
            return bool(prediction), float(confidence)
        except Exception as e:
            print(f"ML classification error: {e}")
            return False, 0.0
    
    def analyze_patterns(self, text: str) -> tuple[int, List[str]]:
        """Analyze text for suicide risk patterns"""
        text_lower = text.lower()
        risk_score: float = 0
        risk_factors = []
        
        for pattern in self.direct_patterns:
            if pattern in text_lower:
                risk_score += 10
                risk_factors.append(f"Direct threat: {pattern}")
        
        for pattern in self.indirect_patterns:
            if pattern in text_lower:
                risk_score += 6
                risk_factors.append(f"Indirect indicator: {pattern}")
        
        for pattern in self.method_patterns:
            if pattern in text_lower:
                risk_score += 8
                risk_factors.append(f"Method reference: {pattern}")
        
        for pattern in self.temporal_patterns:
            if pattern in text_lower:
                risk_score += 7
                risk_factors.append(f"Temporal indicator: {pattern}")
        
        return int(risk_score), risk_factors

    def analyze_protective_signals(self, text: str) -> tuple[int, List[str]]:
        """Detect statements indicating safety intent or active help-seeking"""
        text_lower = text.lower()
        protective_score = 0
        protective_cues: List[str] = []

        for pattern in self.protective_patterns:
            if pattern in text_lower:
                protective_score += 3
                protective_cues.append(f"Protective factor: {pattern}")

        # Extra boost when user explicitly asks for support/help
        for cue in ['can you help me', 'i need help', 'i need support', 'i want help']:
            if cue in text_lower:
                protective_score += 2
                protective_cues.append(f"Help-seeking cue: {cue}")

        return protective_score, protective_cues
    
    def analyze_context(self, messages: List[Dict[str, Any]]) -> tuple[int, List[str]]:
        """Analyze conversation context for risk escalation"""
        if not messages:
            return 0, []
        
        recent_messages = messages[-5:]
        user_messages = [msg for msg in recent_messages if msg.get("role") == "user"]
        
        risk_words = ["die", "kill", "suicide", "end", "pain", "hopeless", "trapped", "burden"]
        context_score = 0
        contextual_cues = []
        
        for i, msg in enumerate(user_messages):
            content = msg.get("content", "").lower()
            word_count = sum(1 for word in risk_words if word in content)
            if word_count > 0:
                weight = (i + 1) / len(user_messages)
                context_score += word_count * weight
                contextual_cues.append(f"Risk words in message {i+1}: {word_count}")
        
        if context_score > 2 and len(user_messages) >= 2:
            contextual_cues.append("Escalating pattern detected")
            context_score += 3
        
        return context_score, contextual_cues
    
    def determine_risk_level(self, pattern_score: int, context_score: int,
                           mcp_positive: bool, mcp_confidence: float,
                           protective_score: int, imminent_intent: bool) -> str:
        """Determine overall risk level with ML safeguard"""
        total_score = pattern_score + context_score - min(protective_score, 8)
        total_score = max(total_score, 0)
        
        if mcp_positive and (pattern_score > 0 or context_score > 0):
            total_score += mcp_confidence * 8

        if imminent_intent and (pattern_score >= 10 or mcp_positive):
            return "critical"
        
        if mcp_positive and (pattern_score >= 10 or total_score >= 20 or 
                           (pattern_score > 0 and mcp_confidence > 0.95)):
            return "critical"
        elif total_score >= 15 or (mcp_positive and (pattern_score >= 6 or 
                                                     (pattern_score > 0 and mcp_confidence > 0.8))):
            return "high"
        elif total_score >= 8 or (mcp_positive and (pattern_score >= 3 or 
                                                    (pattern_score > 0 and mcp_confidence > 0.6))):
            return "medium"
        else:
            return "low"
    
    def get_recommended_action(self, risk_level: str, confidence: float,
                               risk_factors: List[str], contextual_cues: List[str]) -> str:
        """Get recommended intervention action"""
        top_signals = ', '.join((risk_factors + contextual_cues)[:3]) or 'No strong indicators detected'

        if risk_level == 'critical':
            return (
                "1) Stay with the person and keep them talking. "
                "2) Contact emergency support now: call 988 (US) or local emergency services. "
                "3) Remove immediate means of self-harm if possible. "
                f"4) Escalate to human reviewer immediately. Confidence: {confidence:.2f}. "
                f"Key signals: {top_signals}."
            )
        if risk_level == 'high':
            return (
                "1) Encourage immediate connection to a trusted person and crisis support (988/text HOME to 741741). "
                "2) Complete a short safety plan (safe place, support contact, coping step). "
                f"3) Trigger priority human follow-up today. Confidence: {confidence:.2f}. "
                f"Key signals: {top_signals}."
            )
        if risk_level == 'medium':
            return (
                "1) Continue supportive conversation and assess intent/plan/means gently. "
                "2) Share non-urgent mental health resources and suggest professional follow-up in 24-48h. "
                f"3) Monitor for escalation. Confidence: {confidence:.2f}. "
                f"Key signals: {top_signals}."
            )

        return (
            "Supportive monitoring: validate feelings, encourage healthy coping, and provide resources if needed. "
            f"Confidence: {confidence:.2f}."
        )
    
    def get_knowledge_matches(self, risk_level: str) -> List[str]:
        """Get relevant knowledge base information"""
        if risk_level == "critical":
            return [
                "Crisis Resources: National Suicide Prevention Lifeline (988)",
                "Immediate Action: Contact emergency services",
                "Safety Protocol: Do not leave person alone",
                "Clinical Focus: Assess plan, means, timeframe"
            ]
        elif risk_level == "high":
            return [
                "Warning Signs: Expressions of hopelessness and specific plans",
                "Intervention: Professional mental health assessment needed",
                "Resources: Crisis text line (text HOME to 741741)",
                "Action: Build a written safety plan"
            ]
        elif risk_level == "medium":
            return [
                "Risk Factors: Emotional distress and concerning language",
                "Prevention: Supportive conversation and resource provision",
                "Follow-up: Encourage counseling within 24-48 hours"
            ]
        else:
            return ["Preventive Resources: Mental health support information"]
    
    def analyze_suicide_risk(self, request: SuicideAnalysisRequest) -> RiskAnalysisResponse:
        """Comprehensive suicide risk analysis"""
        # Pattern analysis
        pattern_score, risk_factors = self.analyze_patterns(request.text)

        # Protective signal analysis
        protective_score, protective_cues = self.analyze_protective_signals(request.text)
        
        # Context analysis
        context_score, contextual_cues = self.analyze_context(request.context_messages)
        contextual_cues.extend(protective_cues)
        
        # ML classification
        mcp_positive, mcp_confidence = self.mcp_classify(request.text)

        imminent_intent = any('Temporal indicator' in factor for factor in risk_factors) and any(
            marker in factor for marker in ['Direct threat', 'Method reference'] for factor in risk_factors
        )
        
        # Determine risk level
        risk_level = self.determine_risk_level(
            pattern_score,
            context_score,
            mcp_positive,
            mcp_confidence,
            protective_score,
            imminent_intent,
        )
        
        # Calculate confidence
        total_score = max(pattern_score + context_score - min(protective_score, 8), 0)
        confidence = min((total_score / 20) * 0.65 + (mcp_confidence * 0.35), 1.0)
        
        # Get recommendations
        recommended_action = self.get_recommended_action(risk_level, confidence, risk_factors, contextual_cues)
        knowledge_matches = self.get_knowledge_matches(risk_level)
        
        return RiskAnalysisResponse(
            risk_level=risk_level,
            confidence=confidence,
            risk_factors=risk_factors,
            contextual_cues=contextual_cues,
            mcp_classification=mcp_positive,
            recommended_action=recommended_action,
            flagged=risk_level != "low",
            knowledge_base_matches=knowledge_matches
        )

# Initialize RAG system at startup
_rag_system: Optional[SimplifiedSuicideDetectionRAG] = None
_rag_lock = threading.Lock()
_keepalive_thread: Optional[threading.Thread] = None
_keepalive_stop_event = threading.Event()

def get_rag_system() -> SimplifiedSuicideDetectionRAG:
    global _rag_system
    if _rag_system is None:
        with _rag_lock:
            if _rag_system is None:
                _rag_system = SimplifiedSuicideDetectionRAG()
    return _rag_system

def get_keepalive_target_url() -> str:
    if SERVER_KEEPALIVE_TARGET_URL:
        return SERVER_KEEPALIVE_TARGET_URL

    external_url = (os.getenv('RENDER_EXTERNAL_URL') or '').strip()
    if external_url:
        return f"{external_url.rstrip('/')}/health"

    port = (os.getenv('PORT') or '8000').strip()
    return f'http://127.0.0.1:{port}/health'

def keepalive_worker(stop_event: threading.Event, target_url: str, interval_seconds: int) -> None:
    while not stop_event.wait(interval_seconds):
        try:
            response = requests.get(target_url, timeout=10)
            if response.status_code >= 400:
                print(f"[keepalive] ping failed with status {response.status_code} for {target_url}")
        except Exception as e:
            print(f"[keepalive] ping error for {target_url}: {e}")

@app.on_event('startup')
def start_server_keepalive() -> None:
    global _keepalive_thread
    if not SERVER_KEEPALIVE_ENABLED:
        return

    if _keepalive_thread and _keepalive_thread.is_alive():
        return

    target_url = get_keepalive_target_url()
    _keepalive_stop_event.clear()
    _keepalive_thread = threading.Thread(
        target=keepalive_worker,
        args=(_keepalive_stop_event, target_url, SERVER_KEEPALIVE_INTERVAL_SECONDS),
        daemon=True,
        name='server-keepalive-worker',
    )
    _keepalive_thread.start()
    print(f"[keepalive] started loop -> {target_url} every {SERVER_KEEPALIVE_INTERVAL_SECONDS}s")

@app.on_event('shutdown')
def stop_server_keepalive() -> None:
    _keepalive_stop_event.set()

# Helper functions
def hash_password(password: str) -> str:
    iterations = max(120000, PASSWORD_HASH_ITERATIONS)
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, iterations)
    salt_b64 = base64.urlsafe_b64encode(salt).decode('ascii')
    digest_b64 = base64.urlsafe_b64encode(digest).decode('ascii')
    return f'pbkdf2_sha256${iterations}${salt_b64}${digest_b64}'

def verify_password(plain: str, hashed: str) -> bool:
    try:
        scheme, iter_str, salt_b64, digest_b64 = hashed.split('$', 3)
        if scheme != 'pbkdf2_sha256':
            return False

        iterations = int(iter_str)
        salt = base64.urlsafe_b64decode(salt_b64.encode('ascii'))
        expected = base64.urlsafe_b64decode(digest_b64.encode('ascii'))
        actual = hashlib.pbkdf2_hmac('sha256', plain.encode('utf-8'), salt, iterations)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False

def create_access_token(user_id: int, expires_delta: Optional[timedelta] = None) -> str:
    now = datetime.utcnow()
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {'sub': str(user_id), 'exp': expire}
    return encode(payload, JWT_SECRET, algorithm='HS256')

def verify_access_token(token: str) -> int:
    try:
        payload = decode(token, JWT_SECRET, algorithms=['HS256'])
        user_id = int(payload.get('sub'))
        return user_id
    except (PyJWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid or expired token',
            headers={'WWW-Authenticate': 'Bearer'},
        )

def is_admin_email(email: str) -> bool:
    return email.strip().lower() in ADMIN_EMAILS

def user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_admin=bool(user.is_admin or is_admin_email(user.email)),
    )


def flagged_event_to_response(event: FlaggedEvent) -> FlaggedEventResponse:
    reviewed_at = int(event.reviewed_at.timestamp() * 1000) if event.reviewed_at else None
    created_at = int(event.created_at.timestamp() * 1000) if event.created_at else int(datetime.utcnow().timestamp() * 1000)
    return FlaggedEventResponse(
        id=str(event.id),
        type=event.content_type,
        content=event.content,
        reason=event.reason,
        riskLevel=event.risk_level,
        timestamp=created_at,
        reviewed=bool(event.reviewed),
        reviewedAt=reviewed_at,
        reviewedBy=event.reviewed_by,
        userId=str(event.user_id),
        userEmail=event.user_email,
    )


def get_user_from_request(request: Request, db: Session) -> User:
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Missing or invalid authorization header',
        )

    token = auth_header[7:]
    user_id = verify_access_token(token)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    return user


def require_admin(user: User) -> None:
    if not (user.is_admin or is_admin_email(user.email)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Admin access required')

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str, db: Session = Depends(get_db)) -> User:
    from fastapi import Header
    user_id = verify_access_token(token)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')
    return user

# Routes
@app.post('/api/auth/register', response_model=AuthResponse)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    try:
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Email already registered')

        user = User(
            email=payload.email,
            password_hash=hash_password(payload.password),
            full_name=payload.full_name,
            is_admin=is_admin_email(payload.email),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(user.id)
        return AuthResponse(
            access_token=token,
            user=user_to_response(user),
        )
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError as e:
        db.rollback()
        error_text = str(e.orig).lower() if getattr(e, 'orig', None) else str(e).lower()

        if 'username' in error_text and 'null' in error_text:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail='Database schema mismatch: users.username is required but backend does not use it. Recreate users table with latest schema.',
            )
        if 'email' in error_text and ('unique' in error_text or 'duplicate' in error_text):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Email already registered')

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Database constraint error while creating account',
        )
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Failed to create account',
        )

@app.post('/api/auth/login', response_model=AuthResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')

    # Keep DB role in sync with ADMIN_EMAILS configuration
    if is_admin_email(user.email) and not user.is_admin:
        user.is_admin = True
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id)
    return AuthResponse(
        access_token=token,
        user=user_to_response(user),
    )

@app.get('/api/auth/me', response_model=UserResponse)
async def get_me(request: Request, db: Session = Depends(get_db)):
    user = get_user_from_request(request, db)

    return user_to_response(user)


@app.post('/api/admin/flagged', response_model=FlaggedEventResponse)
async def create_flagged_event(payload: FlaggedEventCreate, request: Request, db: Session = Depends(get_db)):
    user = get_user_from_request(request, db)

    event = FlaggedEvent(
        user_id=user.id,
        user_email=user.email,
        conversation_id=payload.conversation_id,
        content_type=(payload.type or 'chat').strip().lower() or 'chat',
        content=payload.content,
        reason=payload.reason,
        risk_level=(payload.risk_level or 'low').strip().lower() or 'low',
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return flagged_event_to_response(event)


@app.get('/api/admin/flagged', response_model=List[FlaggedEventResponse])
async def list_flagged_events(request: Request, db: Session = Depends(get_db)):
    user = get_user_from_request(request, db)
    require_admin(user)

    events = db.query(FlaggedEvent).order_by(FlaggedEvent.created_at.desc()).limit(500).all()
    return [flagged_event_to_response(event) for event in events]


@app.patch('/api/admin/flagged/{event_id}', response_model=FlaggedEventResponse)
async def review_flagged_event(event_id: str, payload: FlaggedEventReview, request: Request, db: Session = Depends(get_db)):
    user = get_user_from_request(request, db)
    require_admin(user)

    try:
        numeric_event_id = int(event_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid flagged event id')

    event = db.query(FlaggedEvent).filter(FlaggedEvent.id == numeric_event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Flagged event not found')

    event.reviewed = bool(payload.reviewed)
    event.reviewed_at = datetime.utcnow() if event.reviewed else None
    event.reviewed_by = payload.reviewed_by or user.email

    db.add(event)
    db.commit()
    db.refresh(event)
    return flagged_event_to_response(event)

@app.post('/api/chat', response_model=ChatResponse)
async def chat(request: Request, payload: ChatRequest, db: Session = Depends(get_db)):
    user = get_user_from_request(request, db)

    if not OPENROUTER_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='OPENROUTER_API_KEY is not configured on the backend',
        )

    try:
        request_headers = {
            'Authorization': f'Bearer {OPENROUTER_API_KEY}',
            'Content-Type': 'application/json',
        }
        if APP_BASE_URL:
            request_headers['HTTP-Referer'] = APP_BASE_URL
        if APP_NAME:
            request_headers['X-Title'] = APP_NAME

        requested_model = (payload.model or '').strip() or DEFAULT_CHAT_MODEL
        request_body = {
            'model': requested_model,
            'messages': [m.dict() for m in payload.messages],
        }
        if OPENROUTER_ENABLE_REASONING:
            request_body['reasoning'] = {'enabled': True}

        response = requests.post(
            f'{OPENROUTER_BASE_URL}/chat/completions',
            headers=request_headers,
            json=request_body,
            timeout=30,
        )

        if response.status_code != 200:
            error_detail = ''
            try:
                response_json = response.json()
                error_detail = (
                    response_json.get('error', {}).get('message')
                    or response_json.get('message')
                    or ''
                )
            except ValueError:
                error_detail = (response.text or '').strip()

            if not error_detail:
                error_detail = f'OpenRouter returned HTTP {response.status_code}'

            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f'LLM API error: {error_detail}',
            )

        data = response.json()
        content = data['choices'][0]['message']['content']
        return ChatResponse(content=content)

    except requests.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f'Failed to reach LLM API: {str(e)}',
        )

@app.post('/analyze_suicide_risk', response_model=RiskAnalysisResponse)
async def analyze_suicide_risk(payload: SuicideAnalysisRequest, request: Request, db: Session = Depends(get_db)):
    """Analyze text for suicide risk using ML models and pattern matching"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Missing or invalid authorization header',
        )

    token = auth_header[7:]
    user_id = verify_access_token(token)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='User not found')

    try:
        # Perform risk analysis
        rag_system = get_rag_system()
        result = rag_system.analyze_suicide_risk(payload)
        
        # Log high-risk cases
        if result.risk_level in ["high", "critical"]:
            log_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user.id,
                "conversation_id": payload.conversation_id,
                "message_content": payload.text[:200],  # Log first 200 chars
                "risk_level": result.risk_level,
                "confidence": result.confidence,
                "requires_immediate_attention": result.risk_level == "critical"
            }
            print(f"⚠️ HIGH RISK CASE LOGGED: {json.dumps(log_entry, indent=2)}")
        
        return result
    except Exception as e:
        print(f"Error analyzing suicide risk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Risk analysis failed: {str(e)}'
        )

@app.get('/health')
def health_check():
    rag_loaded = _rag_system is not None
    ml_models_loaded = bool(_rag_system and _rag_system.mcp_model is not None)
    patterns_loaded = bool(_rag_system and len(_rag_system.direct_patterns) > 0)

    return {
        'status': 'ok',
        'database': 'connected',
        'rag_system': {
            'loaded': rag_loaded,
            'ml_models': ml_models_loaded,
            'patterns': patterns_loaded
        }
    }

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)
