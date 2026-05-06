# BDB Planner — Production Deployment Guide

## Deploy to Railway (Recommended)

### Prerequisites
- Railway account at railway.app
- GitHub repo with this codebase pushed

### Steps

1. **Push to GitHub**
   git init (if not already)
   git add .
   git commit -m "Production ready"
   git remote add origin https://github.com/yourusername/bdb-planner.git
   git push -u origin main

2. **Create Railway Project**
   - Go to railway.app → New Project → Deploy from GitHub repo
   - Select your bdb-planner repository

3. **Add MySQL Database**
   - In Railway dashboard → Add Plugin → MySQL
   - Copy the DATABASE_URL from the plugin

4. **Set Environment Variables**
   In Railway → Variables tab, add all vars from .env.production.example:
   - DATABASE_URL (from Railway MySQL plugin)
   - JWT_SECRET (generate a new one)
   - ADMIN_EMAIL=leah@africacreativeagency.com
   - OPENAI_API_KEY
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - GOOGLE_REDIRECT_URI=https://your-app.railway.app/api/auth/google/callback
   - CORS_ORIGIN=https://your-app.railway.app
   - NODE_ENV=production
   - PORT=3000

5. **Update Google OAuth**
   - Go to Google Cloud Console → OAuth credentials
   - Add your Railway URL to authorized redirect URIs:
     https://your-app.railway.app/api/auth/google/callback

6. **Deploy**
   Railway auto-deploys on every git push to main.
   First deploy: Railway builds the Dockerfile and starts the server.

7. **Run Database Migrations**
   In Railway → your service → Shell:
   pnpm db:push

8. **Verify**
   - Visit https://your-app.railway.app/health → should return {"status":"ok"}
   - Visit https://your-app.railway.app → should show the BDB Planner landing page

## Custom Domain (Phase 8)
See Phase 8 instructions for setting up a custom domain.
