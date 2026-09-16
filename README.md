# Stock Management App — Vercel Deployment Guide

This project is configured for deployment both in Google AI Studio / Cloud Run containers and as a serverless application on **Vercel** via your Git repository (GitHub, GitLab, or Bitbucket).

---

## 🚀 How to Deploy on Vercel via Git Repository

### 1. Push to Your Git Repository
Make sure your project changes are committed and pushed to your GitHub/GitLab repository:
```bash
git add .
git commit -m "Configure Vercel serverless deployment"
git push origin main
```

### 2. Import into Vercel
1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Click **"Add New..."** > **"Project"**.
3. Select your Git repository and click **Import**.
4. Vercel will automatically detect:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `vite build` (or `npm run build`)
   - **Output Directory**: `dist`

### 3. Configure Environment Variables in Vercel
In the Vercel project configuration page (or in **Settings** > **Environment Variables**):

| Variable Name | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Your Google Gemini API key for the AI Stock Assistant and Voice Transcription features. Obtain one at [Google AI Studio](https://aistudio.google.com/app/apikey). |

Click **Deploy**!

---

## 🔐 Firebase Authentication on Vercel

When your app is deployed to `https://<your-project-name>.vercel.app`, Google Sign-In requires your Vercel domain to be whitelisted in Firebase:

1. Copy your Vercel URL domain (e.g. `<project>.vercel.app`).
2. Open [Firebase Console](https://console.firebase.google.com/).
3. Navigate to **Authentication** > **Settings** > **Authorized domains**.
4. Click **Add domain**, paste `<project>.vercel.app`, and save.

> 💡 **Instant Quick Access**: Even before adding your domain to Firebase, you can click **"Connect Now (Quick Pass)"** in the app to immediately sync with the Cloud Firestore database without any domain configuration!

---

## 🛠 Project Architecture for Vercel

- **Frontend**: React 19 + Vite SPA with Tailwind CSS v4, compiled to `dist/`.
- **Backend API**: Serverless Express router in `api/index.ts` automatically handled by Vercel Node.js Serverless Functions.
- **Routing**: `vercel.json` routes all `/api/*` requests to the serverless function and rewrites all frontend routes to `index.html` for client-side SPA navigation.
- **Local Dev**: `server.ts` mounts the identical `api/index.ts` router, ensuring local development and production behave identically.
