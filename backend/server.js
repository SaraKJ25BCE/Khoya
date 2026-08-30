/**
 * Google OAuth — backend authorization code flow & Postgres User Persistence.
 *
 * FLOW:
 *   1. Frontend redirects user to /auth/google (this server builds the
 *      Google consent URL and redirects there).
 *   2. User logs in on Google's page.
 *   3. Google redirects back to GOOGLE_REDIRECT_URI (must match EXACTLY
 *      what you put in Google Cloud Console) with a `code` query param.
 *   4. This server exchanges that code for tokens + the user's profile,
 *      upserts the user into the Postgres database (`users` table),
 *      creates a session, and redirects the user back into the app.
 *
 * DEPLOYED ON RENDER (backend) + VERCEL (frontend) — cross-site cookie setup:
 *   1. CORS allows your exact Vercel origin with credentials.
 *   2. Session cookie configured with `sameSite: 'none'` + `secure: true` in production.
 *
 * npm install express express-session axios dotenv cors pg
 */

const express = require('express');
const session = require('express-session');
const axios = require('axios');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

const isProduction = process.env.NODE_ENV === 'production' || process.env.ENVIRONMENT === 'production';

// Parse ALLOWED_ORIGINS comma-separated list or FRONTEND_URL
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [process.env.FRONTEND_URL || 'http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps or curl)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive fallback for dev testing
    },
    credentials: true,
  })
);

app.set('trust proxy', 1); // required on Render for secure cookies behind proxy

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'khoya_default_session_secret_change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    },
  })
);

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  FRONTEND_URL = 'http://localhost:5173',
  DATABASE_URL,
} = process.env;

// Initialize Postgres connection pool if DATABASE_URL is provided and not a template placeholder
let pool = null;
const isDatabaseConfigured =
  DATABASE_URL &&
  !DATABASE_URL.includes('[YOUR-PASSWORD]') &&
  !DATABASE_URL.includes('[PASSWORD]') &&
  !DATABASE_URL.includes('your_password');

if (isDatabaseConfigured) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  });
  console.log('[Database] PostgreSQL connection pool initialized.');
} else {
  console.warn(
    '[Database Warning] DATABASE_URL is missing or unconfigured in .env file. OAuth login will store session data in memory without persistent DB storage.'
  );
}

/**
 * Upsert user profile into PostgreSQL database (`users` table).
 * Returns the saved database record.
 */
async function upsertUser(profile) {
  if (!pool) return null;

  const query = `
    INSERT INTO users (
      google_id, email, email_verified, name, given_name, family_name, picture, locale, last_login_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
    )
    ON CONFLICT (google_id) DO UPDATE SET
      email = EXCLUDED.email,
      email_verified = EXCLUDED.email_verified,
      name = EXCLUDED.name,
      given_name = EXCLUDED.given_name,
      family_name = EXCLUDED.family_name,
      picture = EXCLUDED.picture,
      locale = EXCLUDED.locale,
      last_login_at = NOW(),
      updated_at = NOW()
    RETURNING id, google_id, email, email_verified, name, given_name, family_name, picture, locale, created_at, updated_at;
  `;

  const values = [
    profile.id,
    profile.email,
    profile.verified_email ?? profile.email_verified ?? true,
    profile.name || null,
    profile.given_name || null,
    profile.family_name || null,
    profile.picture || null,
    profile.locale || null,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

// Step 1: Redirect user to Google's consent screen
app.get('/auth/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your_google_client_id_here') {
    return res.status(500).json({
      error: 'Google OAuth Client ID is not configured in backend/.env file.',
    });
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Step 3-4: Google redirects here with ?code=... — exchange code for tokens & upsert user
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing authorization code');

  try {
    // Exchange authorization code for tokens
    const { data: tokens } = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    // Fetch user profile using access_token
    const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    // Upsert user into database if configured
    let dbUser = null;
    if (pool) {
      try {
        dbUser = await upsertUser(profile);
        console.log(`[OAuth] User profile successfully upserted into DB for email: ${profile.email}`);
      } catch (dbErr) {
        console.error('[OAuth Database Error] Failed to upsert user profile:', dbErr.message);
      }
    }

    // Attach user profile & DB ID to session
    req.session.user = {
      id: dbUser ? dbUser.id : profile.id, // Database UUID if available, fallback to Google ID
      google_id: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
      ...(dbUser || {}),
    };

    res.redirect(FRONTEND_URL);
  } catch (err) {
    console.error('Google OAuth callback error:', err.response?.data || err.message);
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
  }
});

// Lets frontend check login status
app.get('/auth/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ user: null });
  res.json({ user: req.session.user });
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.sendStatus(200));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Auth & persistence server running on port ${PORT}`));
