import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
    try {
        if (!req.session?.user?.id) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const userId = String(req.session.user.id);

        // Fetch merge logs from Firestore
        // Note: This query requires a composite index for optimal performance
        // If you get an index error, click the link in the error to create it
        try {
            const logsSnapshot = await db.collection('merge_logs')
                .where('user_id', '==', userId)
                .orderBy('merged_at', 'desc')
                .limit(50)
                .get();

            const logs = [];
            logsSnapshot.forEach(doc => {
                const data = doc.data();
                logs.push({
                    id: doc.id,
                    master_activity_id: data.master_activity_id,
                    source_activity_id: data.source_activity_id,
                    status: data.status,
                    details: data.error_message || data.details,
                    created_at: data.merged_at?.toDate?.() ? data.merged_at.toDate().toISOString() : new Date().toISOString(),
                });
            });

            res.json(logs);
        } catch (indexError) {
            // If index doesn't exist, fall back to unordered query
            console.warn('Index not found, falling back to unordered query. Create index at:', indexError.message);

            const logsSnapshot = await db.collection('merge_logs')
                .where('user_id', '==', userId)
                .limit(50)
                .get();

            const logs = [];
            logsSnapshot.forEach(doc => {
                const data = doc.data();
                logs.push({
                    id: doc.id,
                    master_activity_id: data.master_activity_id,
                    source_activity_id: data.source_activity_id,
                    status: data.status,
                    details: data.error_message || data.details,
                    created_at: data.merged_at?.toDate?.() ? data.merged_at.toDate().toISOString() : new Date().toISOString(),
                });
            });

            // Sort in memory (less efficient, but works without index)
            logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            res.json(logs);
        }
    } catch (error) {
        console.error('Error fetching merge logs:', error);
        res.status(500).json({ error: 'Failed to fetch merge logs' });
    }
});

export default router;
