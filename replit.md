# Replit setup

This project is a React + Vite TypeScript web app.

## Run

The Replit workflow runs:

```bash
npm run dev
```

The Vite server is configured to listen on `0.0.0.0:5000` and allow Replit's proxied preview host.

## Optional services

- Firebase Auth and Firestore use the imported `firebase-applet-config.json`.
- Routing works with the public OSRM fallback. Set `VITE_ORS_API_KEY` in Secrets if OpenRouteService routing is needed.
- Supabase-backed features require `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Add `GEMINI_API_KEY` only if Gemini-powered features are enabled.