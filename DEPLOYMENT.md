# Deployment Guide — Deploying Khoya on Render

This guide explains how to deploy the **Khoya** live options P&L attribution app (FastAPI backend + Vite React frontend) on [Render](https://render.com).

---

## Environment Variables Reference

Before deploying, make sure you understand the environment variables used across services:

### Backend Environment Variables (`backend/.env`)

| Variable | Description | Default | Render Production Setting |
| :--- | :--- | :--- | :--- |
| `PORT` | Web server listening port | `8000` | Injected automatically by Render |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed origins | `*` | `https://khoya-frontend.onrender.com` |
| `ENVIRONMENT` | Application mode (`development`/`production`) | `production` | `production` |
| `PYTHON_VERSION` | Python runtime version | `3.11.0` | `3.11.0` |

### Frontend Environment Variables (`frontend/.env`)

| Variable | Description | Default | Render Production Setting |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL for FastAPI backend | `/api` (local proxy) | `https://khoya-backend.onrender.com` |

Example files are provided in the repo:
- Root reference: [`.env.example`](file:///c:/Users/pcjou/Local/pnl/.env.example)
- Backend: [`backend/.env.example`](file:///c:/Users/pcjou/Local/pnl/backend/.env.example)
- Frontend: [`frontend/.env.example`](file:///c:/Users/pcjou/Local/pnl/frontend/.env.example)

---

## Option 1: Automatic 1-Click Deployment (Render Blueprint)

The repository includes a ready-to-use [`render.yaml`](file:///c:/Users/pcjou/Local/pnl/render.yaml) file for Render Blueprints.

1. Push your repository to GitHub or GitLab.
2. Log into [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** -> **Blueprint**.
4. Connect your GitHub/GitLab repository containing `render.yaml`.
5. Render will automatically detect the blueprint and configure:
   - **`khoya-backend`**: Python Web Service running `uvicorn app.main:app`.
   - **`khoya-frontend`**: Static Site running Vite build.
6. Click **Apply**.
7. Once deployed, note your backend service URL (`https://khoya-backend.onrender.com`) and update `ALLOWED_ORIGINS` / `VITE_API_BASE_URL` if your assigned domain names differ.

---

## Option 2: Manual Deployment via Render Dashboard

If you prefer configuring services manually in the Render UI:

### Step 1: Deploy Backend Web Service (`khoya-backend`)

1. Go to **Render Dashboard** -> **New +** -> **Web Service**.
2. Connect your repository.
3. Configure the following settings:
   - **Name**: `khoya-backend`
   - **Region**: Choose closest to target users (e.g. Singapore / Frankfurt / Oregon)
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
4. Under **Environment Variables**, add:
   - `PYTHON_VERSION` = `3.11.0`
   - `ALLOWED_ORIGINS` = `https://khoya-frontend.onrender.com`
   - `ENVIRONMENT` = `production`
5. Click **Create Web Service**.

### Step 2: Deploy Frontend Static Site (`khoya-frontend`)

1. Go to **Render Dashboard** -> **New +** -> **Static Site**.
2. Connect your repository.
3. Configure the following settings:
   - **Name**: `khoya-frontend`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
4. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = `https://khoya-backend.onrender.com` (use your actual backend URL)
5. Under **Redirects / Rewrites**, add:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`
6. Click **Create Static Site**.

---

## Verification

After deployment succeeds:

1. **Verify Backend Liveness**:
   ```bash
   curl https://khoya-backend.onrender.com/health
   # Expected response: {"status":"ok"}
   ```

2. **Verify Replay Endpoint**:
   ```bash
   curl https://khoya-backend.onrender.com/replay/straddle
   ```

3. **Verify Frontend**:
   Open `https://khoya-frontend.onrender.com` in your browser. The P&L attribution chart and table should render and display snapshots replayed from the backend.
