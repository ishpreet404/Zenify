# Zenify Production Architecture Implementation

## Overview

This document describes the modernized architecture for Zenify, transitioning from a local-first demo to a production-ready mental health SaaS platform with proper authentication, secure API proxying, and multi-user support.

## What Changed?

### Summary Table

| Component | Before | After | Why |
|-----------|--------|-------|-----|
| **LLM API** | Direct client-side GitHub Models calls | Backend-proxied OpenRouter | Security: hide API keys, control rate limits, add logging |
| **Authentication** | localStorage isAdmin flag | JWT-based auth with User model | Multi-user support, secure role management, session control |
| **API Calls** | Hardcoded localhost URLs | Environment-based VITE_API_BASE_URL | Dev/staging/prod flexibility |
| **Chat Architecture** | GitHub Azure Inference client | FastAPI + OpenRouter integration | Simplified, maintainable, server-side only |
| **User Management** | In-memory profile object | SQLAlchemy User table with email/password | Persistent accounts, proper auth |

## Architecture Diagram

```
┌─────────────────────────┐
│  Browser (React App)    │
│  - AuthPage             │
│  - Protected Routes     │
│  - Chat, Journal, Mood  │
└────────────┬────────────┘
             │ REST API (JWT Bearer Token)
             │
┌────────────▼────────────────────────┐
│  Backend (FastAPI @ :8000)          │
│  - /api/auth/register               │
│  - /api/auth/login                  │
│  - /api/auth/me                     │
│  - /api/chat (proxy to OpenRouter)  │
│  - /analyze_suicide_risk (ML)       │
│  └─ SQLite/PostgreSQL               │
└────────────┬─────────────────────────┘
             │ OPENROUTER_API_KEY
             │
┌────────────▼──────────────────┐
│  OpenRouter (LLM Provider)    │
│  - GPT-4o-mini (default)      │
│  - Claude, Llama, etc.        │
└───────────────────────────────┘
```

## Development Setup

### Prerequisites

- **Node.js 18+** (for frontend)
- **Python 3.9+** (for backend)
- **pip** (Python package manager)

### Frontend Setup

```bash
# 1. Install frontend dependencies
npm install

# 2. Create .env file from template
cp .env.example .env

# 3. Update .env with backend URL
# VITE_API_BASE_URL=http://localhost:8000

# 4. Start dev server
npm run dev
# Runs on http://localhost:5173
```

### Backend Setup

```bash
# 1. Create .env file from template
cp backend/.env.example backend/.env

# 2. Set required variables in backend/.env
# OPENROUTER_API_KEY=sk_xxxxx_your_key_here
# JWT_SECRET=your_secret_key_must_be_at_least_32_characters_long

# 3. Install Python dependencies
pip install -r backend/requirements.txt

# 4. Start backend server
cd backend
uvicorn main:app --reload --port 8000
# Or use: npm run dev:backend (from project root)

# Server runs on http://localhost:8000
# Docs available at http://localhost:8000/docs
```

### Running Both Together

**Terminal 1 - Frontend:**
```bash
npm run dev
# Listens on http://localhost:5173
```

**Terminal 2 - Backend:**
```bash
npm run dev:backend
# Listens on http://localhost:8000
```

**In Browser:**
Navigate to `http://localhost:5173`, register a new account, and start using the app!

## Environment Variables

### Frontend (.env)

```env
# API Backend URL
VITE_API_BASE_URL=http://localhost:8000

# LLM Model (informational, backend is authoritative)
VITE_OPENROUTER_MODEL=openai/gpt-4o-mini
```

### Backend (backend/.env)

```env
# REQUIRED: OpenRouter API Key
# Get from: https://openrouter.ai/keys
OPENROUTER_API_KEY=sk_xxxxx_your_key_here

# REQUIRED: JWT Secret (min 32 chars, use strong key in production)
JWT_SECRET=your_secret_key_must_be_at_least_32_characters_long_change_this

# Database URL (defaults to SQLite for dev)
# SQLite: sqlite:///./zenify.db
# PostgreSQL: postgresql://user:password@localhost:5432/zenify
DATABASE_URL=sqlite:///./zenify.db

# Token expiration in minutes
ACCESS_TOKEN_EXPIRE_MINUTES=480

# CORS allowed origins (comma-separated, no spaces)
FRONTEND_ORIGINS=http://localhost:5173,http://localhost:3000

# Optional: Admin email list (for future features)
ADMIN_EMAILS=admin@example.com
```

## API Endpoints

### Authentication

#### `POST /api/auth/register`
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "Jane Doe"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "Jane Doe",
    "is_admin": false
  }
}
```

#### `POST /api/auth/login`
Authenticate and get access token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:** Same as register

#### `GET /api/auth/me`
Get current user info (requires Bearer token).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "Jane Doe",
  "is_admin": false
}
```

### Chat

#### `POST /api/chat`
Send a message to the AI therapist (requires Bearer token).

**Request:**
```json
{
  "messages": [
    {"role": "system", "content": "You are Dr. Sarah..."},
    {"role": "user", "content": "I'm feeling anxious"}
  ],
  "model": "openai/gpt-4o-mini"
}
```

**Response:**
```json
{
  "content": "I hear you. Anxiety can feel overwhelming...",
  "role": "assistant"
}
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  full_name VARCHAR,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Future Tables
- `conversations` - Store chat history
- `journal_entries` - Store journal posts
- `mood_entries` - Store mood tracking
- `flagged_content` - Store crisis detection results

## Security Best Practices

### Do's ✅

- **Store secrets in .env files**, never commit them
- **Use strong JWT_SECRET** (32+ chars, random characters)
- **Validate all user input** on backend before processing
- **Hash passwords** with bcrypt (done automatically)
- **Use HTTPS in production** to encrypt tokens in transit
- **Set secure CORS origins** only for your frontend domain
- **Implement rate limiting** on auth endpoints (future)
- **Log security events** (failed logins, suspicious content)
- **Use environment-specific configs** for dev/staging/prod

### Don'ts ❌

- **Don't expose API keys** in frontend code or version control
- **Don't trust client-side auth flags** (use server tokens)
- **Don't hardcode URLs** - use environment variables
- **Don't send passwords** in URLs or logs
- **Don't skip input validation** on backend
- **Don't use default JWT_SECRET** in production
- **Don't allow unauthenticated access** to user data endpoints
- **Don't store sensitive data** in localStorage (except tokens)

## Testing Checklist

Before deploying, verify:

- [ ] Frontend builds without errors: `npm run build`
- [ ] Backend syntax is valid: `python -m py_compile backend/main.py`
- [ ] Can register new user via `/api/auth/register`
- [ ] Can login with registered credentials
- [ ] Token is stored in localStorage after login
- [ ] Can retrieve current user via `/api/auth/me`
- [ ] Protected routes redirect to `/auth` if not authenticated
- [ ] Chat messages are sent to backend, not directly to GitHub Models
- [ ] Admin user can see `/admin` route (set `is_admin=true` in DB)
- [ ] Logout clears token and redirects to `/auth`
- [ ] Dark theme toggle works
- [ ] Mood entries save correctly with mood + note
- [ ] Suicide risk detection calls backend endpoint
- [ ] Environment variables load correctly from .env files

## Deployment

### Option 1: Render + Vercel (Recommended)

**Frontend (Vercel):**
1. Push code to GitHub
2. Connect repo to Vercel
3. Set `VITE_API_BASE_URL` to your Render backend URL
4. Deploy automatically on push

**Backend (Render):**
1. Connect repo to Render
2. Set environment variables: `OPENROUTER_API_KEY`, `JWT_SECRET`, `DATABASE_URL` (PostgreSQL)
3. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Deploy
5. Update frontend `VITE_API_BASE_URL` to Render URL

### Option 2: Docker Compose (Local/VPS)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: zenify
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    environment:
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
      JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: postgresql://postgres:secure_password@postgres:5432/zenify
      FRONTEND_ORIGINS: https://yourdomain.com
    depends_on:
      - postgres
    ports:
      - "8000:8000"

  frontend:
    build: .
    environment:
      VITE_API_BASE_URL: https://api.yourdomain.com
    ports:
      - "3000:3000"
```

### Option 3: Fly.io

1. Install `flyctl`
2. Run `fly launch` in project root
3. Set secrets: `fly secrets set OPENROUTER_API_KEY=... JWT_SECRET=...`
4. Deploy: `fly deploy`

## Known Limitations & Future Enhancements

### Current Limitations
- Conversations stored in localStorage, not persisted to DB (migration needed)
- No email verification for registration
- No password reset flow
- No rate limiting on auth endpoints
- Single-tenant admin setup (no RBAC)
- Mobile UI not optimized for small screens

### Future Enhancements
- [ ] Persistent conversation history
- [ ] Email verification & password reset
- [ ] Rate limiting & abuse prevention
- [ ] Role-based access control (RBAC)
- [ ] Admin dashboard with user management
- [ ] Real-time notifications
- [ ] Data encryption at rest
- [ ] HIPAA compliance features
- [ ] Mobile app (React Native)
- [ ] WebSocket for real-time chat

## Troubleshooting

### "CORS error" when calling API
- Check `FRONTEND_ORIGINS` in `backend/.env`
- Verify frontend URL matches CORS config
- Ensure backend is running on correct port

### "Invalid or expired token" after login
- Verify `JWT_SECRET` is set and same in .env
- Check token expiration: `ACCESS_TOKEN_EXPIRE_MINUTES`
- Clear localStorage and re-login

### "OPENROUTER_API_KEY not set"
- Ensure `backend/.env` has `OPENROUTER_API_KEY=sk_xxxxx...`
- Get key from https://openrouter.ai/keys
- Restart backend after changing .env

### Database file not created
- Ensure `backend/` directory is writable
- Check `DATABASE_URL` path is valid
- SQLite creates DB automatically on first run

### Module not found errors
- Run `pip install -r backend/requirements.txt`
- Run `npm install` for frontend
- Use virtual environment: `python -m venv venv && source venv/bin/activate`

## File Structure

```
zenify/
├── src/                           # Frontend React app
│   ├── components/
│   │   ├── auth/
│   │   │   └── ProtectedRoute.tsx # Route guard component
│   │   └── layout/
│   │       ├── Navbar.tsx         # Updated with logout
│   │       └── Sidebar.tsx        # Uses auth context
│   ├── context/
│   │   └── AuthContext.tsx        # Auth state management
│   ├── pages/
│   │   ├── AuthPage.tsx           # Login/register
│   │   ├── ProfilePage.tsx        # Updated with auth user
│   │   └── ... (other pages)
│   ├── types/
│   │   └── auth.ts                # Auth TypeScript interfaces
│   ├── utils/
│   │   ├── api.ts                 # API client with token handling
│   │   ├── auth.ts                # Auth service
│   │   ├── chat.ts                # Updated to use backend API
│   │   └── ... (other utils)
│   └── App.tsx                    # Updated with auth routing
│
├── backend/                       # FastAPI backend
│   ├── main.py                    # FastAPI app with auth & chat
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Backend env template
│   └── zenify.db                  # SQLite database (created on first run)
│
├── .env.example                   # Frontend env template
├── package.json                   # Frontend dependencies
├── vite.config.ts                 # Vite bundler config
├── tsconfig.json                  # TypeScript config
└── README_PRODUCTION.md           # This file
```

## Support & Resources

- **FastAPI Docs:** https://fastapi.tiangolo.com
- **OpenRouter API:** https://openrouter.ai/docs
- **JWT Auth:** https://pyjwt.readthedocs.io
- **React Query:** https://tanstack.com/query/latest
- **Tailwind CSS:** https://tailwindcss.com

---

**Last Updated:** 2025  
**Version:** 1.0.0  
**Maintainers:** Zenify Development Team
