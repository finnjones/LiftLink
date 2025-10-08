import { Router } from 'express';
import db from '../db.js';
import axios from 'axios';

const router = Router();

router.get('/me', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

router.get('/settings', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  const userId = String(req.session.user.id);

  try {
    const settingsDoc = await db.collection('user_settings').doc(userId).get();

    if (settingsDoc.exists) {
      res.json(settingsDoc.data());
    } else {
      // Return default settings if none are found
      res.json({
        user_id: userId,
        matching_window_minutes: 10,
        title_template: '[workout_title]',
        default_gear_id: null,
      });
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Error fetching settings' });
  }
});

router.post('/settings', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  const userId = String(req.session.user.id);
  const { matching_window_minutes, title_template, default_gear_id } = req.body;

  try {
    await db.collection('user_settings').doc(userId).set({
      user_id: userId,
      matching_window_minutes,
      title_template,
      default_gear_id,
    }, { merge: true });

    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ message: 'Error saving settings' });
  }
});

// Fetch recent Strava activities for the logged-in user
router.get('/history', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  const userId = String(req.session.user.id);

  try {
    // Load tokens from Firestore
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(400).json({ message: 'Missing Strava tokens' });
    }

    const userData = userDoc.data();
    let { strava_access_token: accessToken, strava_refresh_token: refreshToken, strava_token_expires_at: expiresAt } = userData;

    // Refresh token if expired or about to expire (within 1 min)
    const now = Math.floor(Date.now() / 1000);
    const exp = expiresAt?.toDate ? Math.floor(expiresAt.toDate().getTime() / 1000) : 0;

    if (!accessToken || (exp - now) < 60) {
      // Attempt refresh
      try {
        const r = await axios.post('https://www.strava.com/oauth/token', {
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        });
        accessToken = r.data.access_token;
        refreshToken = r.data.refresh_token || refreshToken;
        const newExpiresAt = new Date(r.data.expires_at * 1000);

        await db.collection('users').doc(userId).update({
          strava_access_token: accessToken,
          strava_refresh_token: refreshToken,
          strava_token_expires_at: newExpiresAt,
          updated_at: new Date(),
        });
      } catch (e) {
        console.error('Token refresh failed:', e.response?.data || e.message);
      }
    }

    // Fetch recent activities (last 30 entries)
    const { data } = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { per_page: 30, page: 1 },
    });

    res.json(data);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ message: 'Error fetching history' });
  }
});

export default router;
