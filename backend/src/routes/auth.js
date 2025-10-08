import { Router } from 'express';
import axios from 'axios';
import { URLSearchParams } from 'url';
import db from '../db.js';

const router = Router();

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const APP_BASE_URL = process.env.APP_BASE_URL;

const REDIRECT_URI = `${APP_BASE_URL}/auth/strava/callback`;

// Redirects the user to the Strava OAuth consent screen.
router.get('/strava', (req, res) => {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    approval_prompt: 'force',
    scope: 'read,activity:read_all,activity:write',
  });
  res.redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`);
});

// Strava redirects here after authorization.
router.get('/strava/callback', async (req, res) => {
  const { code, error } = req.query;

  console.log('OAuth callback hit:', { hasCode: !!code, error: error || 'none' });

  if (error) {
    console.error('Strava authorization error:', error);
    return res.redirect('/login?error=strava_denied');
  }

  if (!code) {
    console.error('No authorization code received');
    return res.redirect('/login?error=no_code');
  }

  try {
    console.log('Exchanging code for token with Strava...');
    const tokenResponse = await axios.post('https://www.strava.com/oauth/token', {
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    });

    console.log('✓ Token received from Strava');
    const { access_token, refresh_token, expires_at, athlete } = tokenResponse.data;

    console.log('Saving user to database (athlete id:', athlete.id, ')...');

    // Save or update user data in Firestore
    const userRef = db.collection('users').doc(String(athlete.id));
    await userRef.set({
      id: athlete.id,
      strava_access_token: access_token,
      strava_refresh_token: refresh_token,
      strava_token_expires_at: new Date(expires_at * 1000),
      updated_at: new Date(),
      created_at: new Date(),
    }, { merge: true });

    console.log('✓ User saved to database');
    req.session.user = { id: athlete.id };

    // Force session save before redirect to ensure it persists
    req.session.save((err) => {
      if (err) {
        console.error('✗ Session save error:', err);
        return res.redirect('/login?error=session');
      }
      console.log('✓ Session established and saved for user', athlete.id);
      console.log('  Redirecting to /dashboard...');
      res.redirect('/dashboard');
    });
  } catch (e) {
    console.error('✗ Error in OAuth flow:');
    console.error('  Message:', e.message);
    console.error('  Code:', e.code);
    if (e.response) {
      console.error('  HTTP Status:', e.response.status);
      console.error('  Response:', e.response.data);
    }
    if (e.code === 'ENETUNREACH' || e.message?.includes('ENETUNREACH')) {
      console.error('  ⚠ This is a database connection issue (IPv6 problem)');
    }
    res.redirect('/login?error=true');
  }
});

// Clears the user's session.
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out.' });
    }
    // Clear possible cookie names
    res.clearCookie('liftlink.sid', { path: '/' });
    res.clearCookie('connect.sid', { path: '/' });
    res.status(200).json({ message: 'Logged out successfully.' });
  });
});

export default router;
