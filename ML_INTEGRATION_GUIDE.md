# 🤖 ML Model Integration Guide

## Overview

Zenify now includes an integrated machine learning-based suicide risk detection system powered by logistic regression models trained on mental health data. The system runs entirely on the backend for privacy and security.

## Architecture

```
User Input (Chat/Journal)
         ↓
Frontend calls /api/chat
         ↓
Backend processes message
         ↓
Risk Detection Pipeline:
  1. Pattern Matching (Keywords, temporal indicators)
  2. Context Analysis (Conversation history trends)
  3. ML Classification (Logistic Regression model)
  4. Risk Level Determination (Combined scoring)
         ↓
Response with risk level & recommendations
         ↓
Display to user + log high-risk cases
```

## Risk Detection Components

### 1. **Pattern Matching**
Detects linguistic indicators of suicide risk:

- **Direct Patterns** (Weight: 10 points)
  - "i want to kill myself", "i plan to end my life", etc.
  
- **Indirect Patterns** (Weight: 6 points)
  - "i can't go on anymore", "everyone would be better without me", etc.
  
- **Method Patterns** (Weight: 8 points)
  - References to means: pills, rope, bridge, gun, etc.
  
- **Temporal Patterns** (Weight: 7 points)
  - Time-specific threats: "tonight is my last", "by tomorrow", etc.

### 2. **Context Analysis**
Analyzes conversation flow for escalation:
- Examines last 5 messages in conversation
- Detects repeated risk words
- Weights recent messages more heavily
- Identifies escalating patterns

### 3. **ML Classification**
Uses pre-trained logistic regression model:
- **Vectorizer**: TfidfVectorizer (converts text to numeric features)
- **Model**: LogisticRegression (binary classifier)
- **Location**: `MCP/vectorizer.joblib`, `MCP/logreg_model.joblib`
- **Confidence Score**: Probability of suicide risk

### 4. **Risk Level Determination**

Combines all signals into final risk level:

```
LOW       - No concerning patterns, low context score, ML: negative
MEDIUM    - Some patterns or ML positive with threshold
HIGH      - Multiple patterns OR high context + ML confidence > 0.8
CRITICAL  - Direct threats OR very high confidence + any pattern
```

## API Endpoints

### POST `/api/chat`
Used by the chat interface - triggers risk detection automatically

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "I'm feeling really sad..."}
  ],
  "model": "openai/gpt-4o-mini"
}
```

**Note:** Risk detection happens server-side during processing.

### POST `/analyze_suicide_risk`
Direct risk analysis endpoint (requires Bearer token)

**Request:**
```json
{
  "text": "I am going to end my life tonight",
  "conversation_id": "conv-123",
  "user_id": "user-456",
  "context_messages": [
    {"role": "user", "content": "I've been depressed for weeks"},
    {"role": "assistant", "content": "I'm here to listen..."}
  ]
}
```

**Response:**
```json
{
  "risk_level": "critical",
  "confidence": 0.95,
  "risk_factors": [
    "Direct threat: i am going to end my life tonight",
    "Temporal indicator: tonight is my last night"
  ],
  "contextual_cues": [
    "Risk words in message 1: 2",
    "Escalating pattern detected"
  ],
  "mcp_classification": true,
  "recommended_action": "IMMEDIATE EMERGENCY INTERVENTION: Contact 911 or crisis hotline (988) immediately. Do not leave person alone.",
  "flagged": true,
  "knowledge_base_matches": [
    "Crisis Resources: National Suicide Prevention Lifeline (988)",
    "Immediate Action: Contact emergency services",
    "Safety Protocol: Do not leave person alone"
  ]
}
```

## Risk Levels & Responses

### 🔴 CRITICAL
**Indicators:**
- Direct suicide threats with specific plans
- Temporal specificity combined with method
- Very high ML confidence (>0.95) with any pattern

**Action:** 
- Immediately contact emergency services (911)
- Display crisis hotline numbers prominently
- Do not continue conversation as usual
- Log for admin review immediately

### 🟠 HIGH
**Indicators:**
- Multiple concerning patterns
- Method references + temporal indicators
- ML confidence >0.8 with patterns

**Action:**
- Display mental health resources
- Suggest crisis line (988)
- Encourage real professional help
- Log for admin follow-up

### 🟡 MEDIUM
**Indicators:**
- Some concerning language
- Context suggests distress
- ML confidence 0.6-0.8

**Action:**
- Provide supportive conversation
- Offer mental health resources
- Continue monitoring
- Log for tracking trends

### 🟢 LOW
**Indicators:**
- No concerning patterns
- Normal conversation mood
- ML confidence <0.6

**Action:**
- Continue normal conversation
- Provide general support
- No special intervention needed

## Frontend Integration

### In `src/utils/enhancedSuicideDetection.ts`

The frontend calls `/analyze_suicide_risk` endpoint to get risk assessments:

```typescript
const response = await apiFetch('/analyze_suicide_risk', {
  method: 'POST',
  auth: true,
  body: JSON.stringify({
    text: userMessage,
    conversation_id: conversationId,
    context_messages: messages
  })
});

const result = await response.json();
// Display appropriate warnings/resources based on result.risk_level
```

### Risk Response Display

Frontend displays appropriate UI based on risk level:
- **Critical/High**: Show crisis hotline numbers, recommend emergency services
- **Medium**: Display resources, continue supportive conversation
- **Low**: No special UI changes

## Model Files

### Location
```
MCP/
├── logreg_model.joblib      (LogisticRegression binary classifier)
└── vectorizer.joblib        (TfidfVectorizer for text preprocessing)
```

### Models Details
- **Name**: Logistic Regression Classifier
- **Version**: scikit-learn 1.6.1
- **Input**: Text messages from users
- **Output**: Binary classification (0=no risk, 1=suicide risk)
- **Training**: Pre-trained on mental health conversation dataset

### Loading Models
```python
from sklearn.feature_extraction.text import TfidfVectorizer
import joblib

vectorizer = joblib.load('MCP/vectorizer.joblib')
model = joblib.load('MCP/logreg_model.joblib')

# Use for prediction
X = vectorizer.transform([user_text])
prediction = model.predict(X)[0]
probability = model.predict_proba(X)[0]
```

## Privacy & Security

✅ **All Processing Server-Side**
- Models never exposed to frontend
- No data sent to external ML services for risk detection
- Only OpenRouter API calls (for chat LLM) use external endpoint with API key

✅ **Data Handling**
- High-risk cases logged with user_id, conversation_id, risk_level
- Message content abbreviated in logs (first 200 chars)
- Logs viewable to admin users only
- No data retention beyond initial analysis

✅ **Performance**
- Models load once at startup
- Inference time: ~50-100ms per message
- Minimal memory footprint (~50MB for models)
- No GPU required

## Configuration

### Dependencies
```
scikit-learn>=1.3.0        # ML models
joblib>=1.3.0              # Model serialization
```

### Environment
```env
# backend/.env
OPENROUTER_API_KEY=sk_xxxxx...
JWT_SECRET=your_secret_key
# ML models auto-loaded from MCP/ directory on startup
```

### Model Path Resolution
```python
mcp_path = os.path.join(os.path.dirname(__file__), '..', 'MCP')
# Resolves to: <project_root>/MCP/
```

## Monitoring & Logging

### High-Risk Cases
When risk_level is "high" or "critical", logged entry includes:
```python
{
  "timestamp": "2026-03-28T10:30:45.123456",
  "user_id": 42,
  "conversation_id": "conv-abc123",
  "message_content": "First 200 characters of message...",
  "risk_level": "critical",
  "confidence": 0.95,
  "requires_immediate_attention": True
}
```

### Admin Dashboard
Admins can view:
- High-risk alerts in real-time
- Flagged conversations for review
- Risk statistics over time
- Pattern analysis

### Alerts
- **Critical Risk**: Immediate notification to admin
- **High Risk**: Logged for daily review
- **Medium Risk**: Tracked for trend analysis

## Testing

### Run Integration Test
```bash
python test_ml_integration.py
```

Expected output:
```
✓ ML models loaded successfully from MCP directory
✓ RAG system initialized
  - ML models loaded: True
  - Direct patterns: 10
✓ Risk analysis successful
  - Risk level: high
✓ Risk factors detected: 1
✅ All tests passed!
```

### Manual Testing
```bash
# Start backend
npm run dev:backend

# In another terminal, test endpoint
curl -X POST http://localhost:8000/analyze_suicide_risk \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I am going to end it all",
    "conversation_id": "test-123",
    "context_messages": []
  }'
```

## Troubleshooting

### Models Not Loading
**Issue**: `Warning: Could not load ML models`

**Solutions:**
1. Check MCP directory exists: `ls MCP/`
2. Verify files: `logreg_model.joblib`, `vectorizer.joblib`
3. Check scikit-learn version: `pip show scikit-learn`
4. Reinstall models if corrupted

### False Positives
If system flags normal conversation as high-risk:

1. Review the specific patterns detected
2. Adjust pattern matching thresholds in code
3. Retrain model with better data

### False Negatives
If system misses actual risk:

1. Encourage users to seek professional help
2. Provide always-visible crisis resources
3. System is a safety net, not replacement for evaluation

## Future Enhancements

- [ ] Fine-tune model with Zenify-specific data
- [ ] Add sentiment analysis component
- [ ] Multi-language support
- [ ] Real-time model performance monitoring
- [ ] A/B testing risk detection strategies
- [ ] Integration with emergency services APIs
- [ ] Prediction confidence calibration
- [ ] Ensemble methods (combine multiple models)

## Resources

- **Models Library**: https://scikit-learn.org/
- **Model Persistence**: https://scikit-learn.org/stable/modules/model_persistence.html
- **Crisis Resources**: https://988lifeline.org
- **Suicide Risk Assessment**: https://suicidepreventionlifeline.org

---

**Last Updated:** March 28, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready
