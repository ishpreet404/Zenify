# Zenify - Production-Ready Mental Health AI Platform

## Overview

**Zenify** is an evolved version of the original local-first mental health support system. This production version adds:
- ✅ **Secure Authentication** (JWT-based user registration/login)
- ✅ **Backend API Service** (FastAPI + OpenRouter LLM proxy)
- ✅ **Protected Routes** (Auth-gated UI with role-based access)
- ✅ **Encrypted Secrets** (No API keys in frontend)
- ✅ **Database Persistence** (PostgreSQL/SQLite for users + data)
- ✅ **Deployment-Ready** (Docker, environment templates, guides)

---

## What Changed

### Frontend (React/Vite)
| Change | Why | File |
|--------|-----|------|
| Auth Context added | Centralized auth state management | `src/context/AuthContext.tsx` |
| Login/Register pages | User onboarding & credential handling | `src/pages/AuthPage.tsx` |
| Protected routes | Block unauthenticated access | `src/components/auth/ProtectedRoute.tsx` |
| Chat API call moved to backend | Remove client-side LLM keys | `src/utils/chat.ts` |
| API client utils | Centralized backend communication | `src/utils/api.ts`, `src/utils/auth.ts` |
| Env-based API URL | Support dev/staging/prod endpoints | `.env.example` |

### Backend (FastAPI)
| Component | Purpose | File |
|-----------|---------|------|
| Auth endpoints | Register, login, refresh tokens | `backend/main.py` |
| Chat proxy | Forward AI requests to OpenRouter with auth | `backend/main.py` |
| User model | Store users securely in DB | `backend/main.py` |
| CORS + security | Allow frontend cross-origin, prevent XSS | `backend/main.py` |

### Configuration
| File | Purpose |
|------|---------|
| `.env.example` | Frontend env template |
| `backend/.env.example` | Backend env template |
| `package.json` (scripts) | Dev server commands |
| `backend/requirements.txt` | Python dependencies |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│  ┌──────────────────────────────────────┐                       │
│  │  React App (Vite)                   │                       │
│  │  - Auth pages (login/register)      │                       │
│  │  - Protected routes (chat/journal)  │                       │
│  │  - Local mood/journal storage       │                       │
│  └──────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
           │ HTTP + JWT Token
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                            │
│  ┌──────────────────────────────────────┐                       │
│  │ Auth Service                         │                       │
│  │ - Register: Hash password, create user                      │
│  │ - Login: Verify, return JWT token                           │
│  │ - Protected: Verify token on all requests                   │
│  └──────────────────────────────────────┘                       │
│  ┌──────────────────────────────────────┐                       │
│  │ LLM Proxy (OpenRouter)               │                       │
│  │ - Accept chat message from frontend │                       │
│  │ - Call OpenRouter API (server-side) │                       │
│  │ - Return response securely          │                       │
│  └──────────────────────────────────────┘                       │
│  ┌──────────────────────────────────────┐                       │
│  │ Database (SQLite/PostgreSQL)        │                       │
│  │ - Users (email, password_hash)      │                       │
│  │ - Conversations (messages)          │                       │
│  │ - Flagged content (risk alerts)     │                       │
│  └──────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
           │ HTTPS
           ▼
┌─────────────────────────────────────────────────────────────────┐
│              OPENROUTER API (Secure)                            │
│  - GPT-4o, Claude, Mistral, etc.                               │
│  - Only backend has API key                                    │
│  - Frontend never sees secrets                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Setup & Development

### 1. Prerequisites
- Node.js 18+
- Python 3.9+
- OpenRouter API key (https://openrouter.ai)

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Copy and edit environment
cp .env.example .env.local
# Edit .env.local:
# VITE_API_BASE_URL=http://localhost:8000
```

### 3. Backend Setup
```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/Scripts/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and edit environment
cp .env.example .env
# Edit .env with:
# OPENROUTER_API_KEY=sk_live_your_key_here
# JWT_SECRET=your_random_secret_here (min 32 chars)
# DATABASE_URL=sqlite:///./zenify.db
```

### 4. Run Development Servers
```bash
# Terminal 1: Frontend
npm run dev  # Runs on http://localhost:5173

# Terminal 2: Backend
cd backend
python main.py  # Runs on http://localhost:8000
```

### 5. Test Auth Flow
1. Visit http://localhost:5173
2. Click "Register" and create account
3. Login with your credentials
4. Access chat/journal features
5. AI responses proxied securely through backend

---

## Environment Variables

### Frontend (`.env.local`)
```env
# API base URL (backend must be running here)
VITE_API_BASE_URL=http://localhost:8000

# Default model hint (backend can override)
VITE_OPENROUTER_MODEL=openai/gpt-4o-mini
```

### Backend (`backend/.env`)
```env
# OpenRouter API Key (get at https://openrouter.ai)
OPENROUTER_API_KEY=sk_live_xxxxx

# Model to use (OpenRouter format)
OPENROUTER_MODEL=openai/gpt-4o-mini

# JWT signing secret (long random string)
JWT_SECRET=your_secret_min_32_chars_here

# Token expiration (minutes)
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Database connection
DATABASE_URL=sqlite:///./zenify.db

# CORS origins (frontend URL)
FRONTEND_ORIGINS=http://localhost:5173

# Info for OpenRouter request headers
OPENROUTER_APP_URL=http://localhost:5173
OPENROUTER_APP_NAME=Zenify
```

---

## Deployment

### Option A: Vercel (Frontend) + Render (Backend)

#### Step 1: Deploy Backend to Render
1. Push repo to GitHub
2. Go to https://render.com
3. Create new "Web Service"
4. Connect your GitHub repo
5. Set build command: `pip install -r backend/requirements.txt`
6. Set start command: `cd backend && uvicorn main:app --host 0.0.0.0 --port 8000`
7. Add environment variables (copy from `backend/.env.example`)
8. Set `FRONTEND_ORIGINS` to your frontend URL
9. Deploy

#### Step 2: Deploy Frontend to Vercel
1. Go to https://vercel.com
2. Import GitHub repo
3. Set root directory: `.` (project root)
4. Set build command: `npm run build`
5. Add env var: `VITE_API_BASE_URL=https://your-render-backend-url.onrender.com`
6. Deploy

### Option B: Docker + Docker Compose

```yaml
# docker-compose.yml (in project root)
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
      JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: sqlite:///./zenify.db
      FRONTEND_ORIGINS: http://localhost:5173
    volumes:
      - ./backend/zenify.db:/app/zenify.db

  frontend:
    build: .
    ports:
      - "5173:5173"
    environment:
      VITE_API_BASE_URL: http://backend:8000
    depends_on:
      - backend
```

Run: `docker-compose up`

### Option C: Fly.io (Full Stack)

See [DEPLOYMENT_FLY.md](./DEPLOYMENT_FLY.md)

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Sessions/Tokens
- Not persisted; JWT tokens are stateless
- Token expiration: 8 hours (configurable)

### Notes
- Conversations and journals still stored in browser localStorage (can migrate to DB later)
- Flagged content/admin alerts can be added to DB for persistence

---

## Security Best Practices

✅ **Do**
- Store `OPENROUTER_API_KEY` in backend `.env` only (never in frontend)
- Use HTTPS in production (Render/Vercel enforce this)
- Set strong `JWT_SECRET` (32+ random characters)
- Rotate secrets regularly
- CORS restricted to frontend domain only
- Rate limiting on auth endpoints (can add)

❌ **Don't**
- Commit `.env` files to Git
- Expose API keys in client code
- Log sensitive data
- Skip HTTPS in production

---

## Migration from Local-First

Old version stored everything in browser localStorage. New version:
- **Still uses localStorage** for conversations/journals (client-side state)
- **Users registered** in database (server-side auth)
- **Can migrate data** via export/import JSON feature

To preserve user data:
1. Export from old instance (Settings → Export Data)
2. Login to new instance
3. Import that JSON file (Settings → Import Data)
4. Data restored to localStorage in new app

---

## Testing Checklist

- [ ] Register new account
- [ ] Login with email/password
- [ ] Logout clears token
- [ ] Chat sends message with valid JWT
- [ ] Chat receives AI response from OpenRouter
- [ ] Risk detection triggers on concerning content
- [ ] Admin page only accessible to admin users
- [ ] Journal entries saved locally
- [ ] Mood tracking persists
- [ ] Export data as JSON
- [ ] Import JSON restores state
- [ ] Settings save to localStorage
- [ ] Dark mode toggle works
- [ ] Mobile responsive

---

## Known Limitations

1. **Data in localStorage** - Cleared if user clears browser cache
   - Solution: Add backend persistence (optional)
2. **No email verification** - Emails not validated
   - Solution: Add email verfication via Nodemailer/SendGrid
3. **Admin flag manual** - Set via `ADMIN_EMAILS` env variable
   - Solution: Add admin dashboard for user management
4. **No 2FA** - Could be added for enhanced security
5. **No rate limiting** - Could add via middleware

---

## Future Enhancements

- [ ] Email verification
- [ ] Multi-factor authentication (2FA)
- [ ] Database persistence for all data (not just users)
- [ ] Admin dashboard UI improvements
- [ ] Risk escalation via SMS/email alerts
- [ ] Real-time moderator notifications
- [ ] Analytics & usage reports
- [ ] HIPAA compliance audit
- [ ] Mobile app (React Native)

---

## Support & Contributing

Report issues on GitHub Issues. PRs welcome!

---

## License

MIT License - See LICENSE file

---

## Disclaimer

**Zenify is not a replacement for professional mental health care.**

If you or someone you know is in crisis:
- **Call 988** (US Suicide Prevention Lifeline)
- **Text HOME to 741741** (Crisis Text Line)
- **Call 911** (Emergency)

Always encourage users to seek professional help.

---

**Version:** 2.0 (Production-Ready)  
**Last Updated:** March 28, 2026
