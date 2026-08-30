/**
 * Google OAuth — backend authorization code flow.
 *
 * FLOW:
 *   1. Frontend redirects user to /auth/google (this server builds the
 *      Google consent URL and redirects there).
 *   2. User logs in on Google's page.
 *   3. Google redirects back to GOOGLE_REDIRECT_URI (must match EXACTLY
 *      what you put in Google Cloud Console) with a `code` query param.
 *   4. This server exchanges that code for tokens + the user's profile,
 *      creates a session, and redirects the user back into the app.
 *
 * DEPLOYED ON RENDER (backend) + VERCEL (frontend) — these are different
 * domains, so this is a cross-site cookie setup. Two things had to change
 * from the localhost version for this to work in production:
 *   1. CORS must allow your exact Vercel origin, with credentials enabled.
 *   2. The cookie needs `sameSite: 'none'` + `secure: true` — required by
 *      browsers for any cookie sent cross-site. `secure: true` means it
 *      ONLY works over https, which Render gives you by default, but it
 *      also means it will NOT work over plain http://localhost during
 *      local dev — see the conditional below.
 *
 * npm install express express-session axios dotenv cors
 */

const express = require('express');
const session = require('express-session');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// CORS: must name your exact frontend origin (not '*') when using
// credentials (cookies) across domains.
app.use(
  cors({
    origin: process.env.FRONTEND_URL,   // e.g. https://your-app.vercel.app
    credentials: true,
  })
);

app.set('trust proxy', 1);   // required on Render (and most PaaS) for secure cookies to work behind their proxy

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,               // https only in production
      sameSite: isProduction ? 'none' : 'lax',  // 'none' required for cross-site (Render <-> Vercel)
    },
  })
);

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,   // e.g. http://localhost:5000/auth/google/callback
  FRONTEND_URL,          // e.g. http://localhost:3000
} = process.env;

// Step 1: kick off login — redirect the user to Google's consent screen
app.get('/auth/google', (req, res) => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',   // request a refresh_token
    prompt: 'consent',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Step 3-4: Google redirects here with ?code=... — exchange it for tokens
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing authorization code');

  try {
    // Exchange the code for access_token / id_token / refresh_token
    const { data: tokens } = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }
    );

    // Fetch the user's profile using the access_token
    const { data: profile } = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );

    // profile = { id, email, name, picture, ... }
    // TODO: upsert this user into your `users` table (Supabase or otherwise),
    // keyed on profile.id or profile.email, then store a session.

    req.session.user = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    };

    res.redirect(FRONTEND_URL);   // back into your React app, now logged in
  } catch (err) {
    console.error('Google OAuth callback error:', err.response?.data || err.message);
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
});

// Lets the frontend check "am I logged in?" on page load
app.get('/auth/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ user: null });
  res.json({ user: req.session.user });
});
// NOTE: your frontend's fetch/axios calls to this endpoint (and any other
// authenticated route) MUST include `credentials: 'include'` (fetch) or
// `withCredentials: true` (axios), or the browser won't send the session
// cookie cross-site at all.

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.sendStatus(200));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Auth server running on port ${PORT}`));
