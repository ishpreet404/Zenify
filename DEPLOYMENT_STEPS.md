# Zenify Deployment Guide (Vercel + Render)

## Pre-Deployment Checklist

- [x] Frontend build passes: `npm run build` ✅
- [x] Backend syntax valid: `python -m py_compile backend/main.py` ✅
- [x] ML models integrated and tested ✅
- [x] Auth system implemented ✅

---

## Part 1: Deploy Backend to Render

### Step 1: Prepare Backend for Deployment

1. **Create production database on Render:**
   - Go to https://dashboard.render.com
   - Create a new PostgreSQL database
   - Copy the **External Database URL** (looks like: `postgresql://user:password@host/dbname`)

2. **Generate a strong JWT_SECRET:**
   ```
   Use: https://generate.plus/ or your terminal
   Generate a 32+ character random string
   Example: `sk-proj-8f9d2c5e1a7b4f3c9d8e2f5a7b1c3d4e`
   ```

3. **Prepare environment variables:**
   Create a `.env` file locally (don't commit):
   ```env
   DATABASE_URL=postgresql://user:password@host/dbname
   JWT_SECRET=your-strong-secret-key-here
   OPENROUTER_API_KEY=your-openrouter-api-key
   FRONTEND_ORIGINS=https://zenify.vercel.app
   ADMIN_EMAILS=your-email@example.com
   ```

### Step 2: Deploy Backend Code to Render

1. **Push code to GitHub (if not already):**
   ```bash
   cd d:\zenifyfinal\Zenify
   git init
   git add .
   git commit -m "Initial commit with auth and ML integration"
   git remote add origin https://github.com/YOUR_USERNAME/zenify.git
   git branch -M main
   git push -u origin main
   ```

2. **Create new Web Service on Render:**
   - Go to https://dashboard.render.com → New → Web Service
   - Connect GitHub repository
   - Select repository: `zenify`
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Add Environment Variables:
     - `DATABASE_URL` = your PostgreSQL URL
     - `JWT_SECRET` = your strong secret
     - `OPENROUTER_API_KEY` = your API key
     - `FRONTEND_ORIGINS` = https://zenify.vercel.app (or your domain)
     - `ADMIN_EMAILS` = your-email@example.com

3. **Deploy:**
   - Click "Create Web Service"
   - Render will automatically build and deploy
   - Wait for: "Your service is live" ✅
   - Copy the service URL: `https://zenify-******.onrender.com`

### Step 3: Test Backend Health Check

```bash
# Once deployed, test the health endpoint
curl https://zenify-******.onrender.com/health

# Expected response:
{
  "status": "ok",
  "version": "1.0.0",
  "rag_system": {
    "loaded": true,
    "ml_models": true,
    "patterns": true
  }
}
```

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Prepare Frontend

1. **Update API endpoint in `.env.local`:**
   Create `d:\zenifyfinal\Zenify\.env.local`:
   ```
   VITE_API_BASE_URL=https://zenify-******.onrender.com
   ```
   (Replace with your actual Render backend URL)

2. **Verify build:**
   ```bash
   npm run build
   ```
   Should show: `✓ built in 6.27s` ✅

### Step 2: Deploy to Vercel

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Click "Add New..." → Import Project
   - Import from GitHub: select your zenify repository

2. **Configure Project:**
   - **Framework Preset:** Vite
   - **Root Directory:** ./ (root)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Environment Variables:**
     ```
     VITE_API_BASE_URL=https://zenify-******.onrender.com
     ```

3. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Get your Vercel URL: `https://zenify.vercel.app`

### Step 3: Update CORS on Backend

**Update FRONTEND_ORIGINS environment variable on Render:**
- Go to Render Dashboard → Your zenify service
- Settings → Environment Variables
- Update `FRONTEND_ORIGINS`:
  ```
  https://zenify.vercel.app
  ```
- Service will auto-redeploy with new CORS settings

---

## Part 3: Database Initialization

### Step 1: Initialize PostgreSQL Database

Connect to your PostgreSQL database and run:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

Or use SQLAlchemy to auto-create:
```bash
# SSH into Render service and run
python -c "from backend.main import Base, engine; Base.metadata.create_all(engine)"
```

---

## Part 4: Post-Deployment Testing

### Test 1: Health Check
```bash
curl https://zenify-******.onrender.com/health
```

### Test 2: Register & Login
1. Open https://zenify.vercel.app
2. Click "Sign Up"
3. Register with test account
4. Should redirect to chat page
5. Check browser console for auth token in localStorage

### Test 3: Chat with ML Detection
1. In chat, send a test message
2. Should get response from OpenRouter
3. Check backend logs for risk analysis

```bash
# View backend logs on Render
# Dashboard → Service → Logs
```

### Test 4: Admin Dashboard
1. Log in as account with `is_admin=true`
2. Go to `/admin` route
3. Should see flagged content dashboard
4. Can filter by risk level

---

## Part 5: Troubleshooting

### Backend won't start
```bash
# Check Render logs for errors
# Common issues:
# 1. DATABASE_URL not set
# 2. JWT_SECRET not set
# 3. OPENROUTER_API_KEY not set
# 4. Python dependency missing
```

### Frontend can't connect to backend
```bash
# Check VITE_API_BASE_URL is correct
# Check CORS enabled on backend
# Check Render service is running
curl https://zenify-******.onrender.com/health
```

### ML models not loading
```bash
# MCP/ directory must be in repository
# Models: logreg_model.joblib, vectorizer.joblib
# Check Render logs for model loading errors
```

---

## Deployed URLs

| Component | URL | Status |
|-----------|-----|--------|
| Frontend | https://zenify.vercel.app | 🚀 |
| Backend API | https://zenify-******.onrender.com | 🚀 |
| Database | PostgreSQL on Render | 🚀 |

---

## Summary of Changes for Production

✅ **Frontend:**
- Auth integration with JWT tokens
- Protected routes for authenticated users
- Chat, journal, mood tracking with backend sync

✅ **Backend:**
- FastAPI with JWT authentication
- OpenRouter API proxy (server-side)
- ML-powered suicide risk detection
- Admin dashboard with flagged content
- PostgreSQL database

✅ **Security:**
- Password hashing with bcrypt
- JWT token expiration (8 hours)
- CORS configuration
- Server-side API key handling
- Admin role-based access control

✅ **ML System:**
- 45 risk detection patterns
- Real-time analysis on chat messages
- Risk level classification (LOW/MEDIUM/HIGH/CRITICAL)
- Admin logging of high-risk cases

---

## Next Steps

1. **Set up monitoring:** Add Sentry for error tracking
2. **Set up logs:** View backend logs on Render dashboard
3. **Monitor chat:** Check admin dashboard daily for flagged content
4. **Custom domain:** Update Vercel to use custom domain if available
5. **Analytics:** Add posthog or mixpanel for user insights

