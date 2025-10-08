import { Router } from 'express';
import { processWebhookEvent } from '../core/merger.js';

const router = Router();

const STRAVA_VERIFY_TOKEN = process.env.STRAVA_VERIFY_TOKEN;

// Used for the initial webhook subscription handshake with Strava.
router.get('/strava', (req, res) => {
    const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;

    if (mode === 'subscribe' && token === STRAVA_VERIFY_TOKEN) {
        console.log('Webhook verified');
        res.json({ 'hub.challenge': challenge });
    } else {
        res.sendStatus(403);
    }
});

// Receives webhook events from Strava.
router.post('/strava', async (req, res) => {
    console.log('Webhook event received:', req.body);

    // Asynchronously process the event
    processWebhookEvent(req.body).catch(error => {
        console.error('Error processing webhook event:', error);
    });

    res.status(200).send('EVENT_RECEIVED');
});

export default router;
