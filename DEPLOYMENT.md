# Deployment Guide for Render

## Quick Deploy Instructions

### Option 1: Render Dashboard (Recommended)

#### Backend Deployment
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo: `GarPav123/Lyzr`
4. Configure:
   - **Name**: `social-poll-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
5. Add Environment Variable:
   - Key: `PORT`, Value: `10000`
6. Click "Create Web Service"
7. Copy the URL: `https://social-poll-backend.onrender.com`

#### Frontend Deployment
1. Click "New +" → "Web Service"
2. Connect same GitHub repo: `GarPav123/Lyzr`
3. Configure:
   - **Name**: `social-poll-frontend`
   - **Root Directory**: `frontend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variable:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://social-poll-backend.onrender.com` (your backend URL)
5. Click "Create Web Service"

### Option 2: One-Click Deploy with render.yaml

1. Go to https://dashboard.render.com
2. Click "New +" → "Blueprint"
3. Connect your GitHub repo
4. Render will automatically detect `render.yaml` and deploy both services
5. You're done!

## Important Notes

- Backend will take 2-3 minutes to build and deploy
- Frontend depends on backend URL - update the environment variable after backend deploys
- Free tier has 750 hours/month and services spin down after 15 minutes of inactivity
- WebSocket connections will work automatically on Render

## Post-Deployment

1. Test backend: `https://your-backend-url.onrender.com/api/polls`
2. Test frontend: `https://your-frontend-url.onrender.com`
3. Check logs if there are any issues
4. Update environment variables in Render dashboard if needed
