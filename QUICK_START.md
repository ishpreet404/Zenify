# 🚀 Quick Start Guide - Zenify Production Architecture

## What's New?

Zenify has been upgraded with **proper authentication**, **secure API proxying**, and a **production-ready backend**. No more client-side API keys — everything is now server-side only.

## 5-Minute Setup

### Step 1: Get Dependencies
```bash
npm install
pip install -r backend/requirements.txt
```

### Step 2: Create Environment Files

**Frontend (.env):**
```bash
cp .env.example .env
```

**Backend (backend/.env):**
```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env`:
```env
OPENROUTER_API_KEY=sk_xxxxx...  # Get from https://openrouter.ai/keys
JWT_SECRET=your_super_secret_key_at_least_32_characters_long_please
```

### Step 3: Start Both Services

**Terminal 1 - Frontend:**
```bash
npm run dev
# Open http://localhost:5173
```

**Terminal 2 - Backend:**
```bash
npm run dev:backend
# Server at http://localhost:8000, docs at /docs
```

### Step 4: Use the App

1. Go to http://localhost:5173
2. Click "Register" to create an account
3. Login and start chatting!

## Key Changes

| Before | After |
|--------|-------|
| GitHub API key in browser (❌ unsafe) | Backend proxies OpenRouter (✅ secure) |
| localStorage isAdmin flag | JWT tokens + server-side User table |
| Hardcoded localhost URLs | Environment-based API_BASE_URL |
| No authentication | Full auth system with registration/login |

## File Structure of Changes

**New Files:**
```
backend/main.py                    # FastAPI server with auth & LLM proxy
backend/requirements.txt           # Python dependencies
src/context/AuthContext.tsx        # Auth state management
src/pages/AuthPage.tsx             # Login/register UI
src/components/auth/ProtectedRoute.tsx
src/utils/api.ts                   # API client with token handling
src/utils/auth.ts                  # Auth service
src/types/auth.ts                  # TypeScript interfaces
DEPLOYMENT_GUIDE.md                # Full deployment documentation
```

**Modified Files:**
- `src/main.tsx` - Added AuthProvider wrapper
- `src/App.tsx` - Auth routing, protected pages
- `src/utils/chat.ts` - Backend API instead of GitHub Models
- `src/utils/enhancedSuicideDetection.ts` - Env-based API URL
- `src/components/layout/Navbar.tsx` - Logout button
- `src/components/layout/Sidebar.tsx` - Auth-based admin check
- `src/pages/ProfilePage.tsx` - Show auth user name
- `src/pages/SettingsPage.tsx` - Updated data policy
- `package.json` - Added dev:backend script
- `.env.example` - Removed GitHub token, added API_BASE_URL

## Common Tasks

**View API docs:**
```bash
# Go to http://localhost:8000/docs while backend is running
```

**Login as admin:**
Edit `backend/main.py` and set `is_admin=True` when creating a test user:
```python
user = User(
    email=payload.email,
    ...
    is_admin=True  # For testing admin features
)
```

**Use different LLM model:**
Edit backend request to OpenRouter:
```python
json={
    'model': 'anthropic/claude-3-sonnet',  # Change model
    'messages': [m.dict() for m in payload.messages],
}
```

## Troubleshooting

**"CORS error" when calling API?**
- Verify backend is running: `http://localhost:8000/health`
- Frontend must be on `localhost:5173`

**"Invalid token" after login?**
- Make sure `JWT_SECRET` is set and 32+ characters
- Try logging out and re-logging in

**Database issues?**
- Delete `backend/zenify.db` and restart backend to reset

**Can't find OpenRouter key?**
- Go to https://openrouter.ai/keys
- Create a new key
- Paste into `backend/.env`

## Next Steps

1. ✅ **Verify it works locally** (current)
2. 📱 **Connect frontend to backend** (done:  already configured)
3. 🔑 **Set OPENROUTER_API_KEY** (must do)
4. ☁️ **Deploy to cloud** (see `DEPLOYMENT_GUIDE.md`)
5. 🔐 **Setup production secrets** (see Deployment Guide)

## Architecture at a Glance

```
Your Browser (http://localhost:5173)
        ↓ (REST API with JWT token)
FastAPI Backend (http://localhost:8000)
        ↓ (OpenRouter API Key)
OpenRouter LLM
        ↓
Your Answer
```

## Get Help

- Check `DEPLOYMENT_GUIDE.md` for detailed setup
- Run `npm run build` to test production build
- Backend docs at http://localhost:8000/docs

---

**You're all set!** Start both servers and go enjoy the new auth system. 🎉
