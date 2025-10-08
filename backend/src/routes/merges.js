import { Router } from 'express';
import { mergeActivities, getUserSettings } from '../core/merger.js';
import redisClient from '../core/redis.js';
import axios from 'axios';
import db from '../db.js';

const router = Router();

// Retrieves potential merges for manual action.
router.get('/pending', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  const userId = String(req.session.user.id);

  try {
    // Load user settings for matching window (default 10 minutes)
    const settings = await getUserSettings(userId);
    const windowMinutes = settings?.matching_window_minutes ?? 10;
    const windowMs = windowMinutes * 60 * 1000;

    const accessToken = await getAccessToken(userId);
    if (!accessToken) {
      return res.status(401).json({ message: 'Unable to retrieve access token.' });
    }

    // Fetch recent activities directly from Strava API (last 30 activities)
    const { data: activities } = await axios.get('https://www.strava.com/api/v3/athlete/activities', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { per_page: 30, page: 1 },
    });

    if (!activities || activities.length < 2) {
      return res.json([]);
    }

    // Sort by start time to make pairing predictable
    activities.sort((a, b) => new Date(a.start_date || a.start_date_local) - new Date(b.start_date || b.start_date_local));

    // Build all pairs within the window (unique i < j)
    const pairs = [];
    for (let i = 0; i < activities.length; i++) {
      for (let j = i + 1; j < activities.length; j++) {
        const ai = activities[i];
        const aj = activities[j];
        const t1 = new Date(ai.start_date || ai.start_date_local).getTime();
        const t2 = new Date(aj.start_date || aj.start_date_local).getTime();

        // Check if activities are within the matching window
        if (Math.abs(t1 - t2) <= windowMs) {
          // Determine which is Hevy (source - copy description from) and which is not (master - keep this one)
          // Master = the one to KEEP and UPDATE (Garmin with HR data - NO emoji, NO "logged with hevy")
          // Source = the one to COPY DESCRIPTION FROM (Hevy with exercise list - HAS emoji or "logged with hevy")
          const aiIsHevy = (ai.description || '').toLowerCase().includes('logged with hevy') ||
            (ai.name || '').includes('🔥') ||
            (ai.name || '').toLowerCase().includes('hevy');
          const ajIsHevy = (aj.description || '').toLowerCase().includes('logged with hevy') ||
            (aj.name || '').includes('🔥') ||
            (aj.name || '').toLowerCase().includes('hevy');

          let master, source;
          if (aiIsHevy && !ajIsHevy) {
            // ai is Hevy (copy from), aj is Garmin (keep) -> aj is master, ai is source
            master = aj;
            source = ai;
          } else if (ajIsHevy && !aiIsHevy) {
            // aj is Hevy (copy from), ai is Garmin (keep) -> ai is master, aj is source
            master = ai;
            source = aj;
          } else {
            // Both Hevy or neither Hevy -> use original order
            master = ai;
            source = aj;
          }

          pairs.push({ master, source });
        }
      }
    }

    console.log(`Found ${pairs.length} potential merge pairs for user ${userId}`);
    return res.json(pairs);
  } catch (error) {
    console.error('Error fetching pending merges:', error);
    res.status(500).json({ message: 'Error fetching pending merges' });
  }
});

// Manually triggers a merge for a given pair of activity IDs.
router.post('/manual', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  const userId = req.session.user.id;
  const { masterActivityId, sourceActivityId } = req.body;

  console.log(`Manual merge request: user=${userId}, master=${masterActivityId}, source=${sourceActivityId}`);

  try {
    // Pass numeric IDs directly to mergeActivities
    await mergeActivities(userId, sourceActivityId, masterActivityId);

    // Clean up Redis after manual merge (optional, may not have these keys)
    await redisClient.del(`user:${userId}:activity:${masterActivityId}`).catch(() => { });
    await redisClient.del(`user:${userId}:activity:${sourceActivityId}`).catch(() => { });

    res.json({ message: 'Manual merge successful' });
  } catch (error) {
    console.error('Error performing manual merge:', error);
    res.status(500).json({ message: 'Error performing manual merge' });
  }
});

async function getAccessToken(userId) {
  const userDoc = await db.collection('users').doc(String(userId)).get();
  if (!userDoc.exists) return null;
  // TODO: Add refresh token logic
  return userDoc.data()?.strava_access_token;
}

export default router;
