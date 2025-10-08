import redisClient from './redis.js';
import axios from 'axios';
import db from '../db.js';

async function processWebhookEvent(event) {
    if (event.object_type === 'activity' && event.aspect_type === 'create') {
        const activityId = event.object_id;
        const userId = event.owner_id;

        const userSettings = await getUserSettings(userId);
        const matchingWindow = (userSettings.matching_window_minutes || 10) * 60;

        const key = `user:${userId}:activity:${activityId}`;
        await redisClient.set(key, JSON.stringify(event), {
            EX: matchingWindow,
        });

        console.log(`Activity ${activityId} stored in Redis for user ${userId}`);

        await findAndMergeMatches(userId, userSettings);
    }
}

async function findAndMergeMatches(userId, userSettings) {
    const keys = await redisClient.keys(`user:${userId}:activity:*`);
    if (keys.length < 2) {
        return;
    }

    const activities = await Promise.all(keys.map(key => redisClient.get(key).then(JSON.parse)));
    const matchingWindowMs = (userSettings.matching_window_minutes || 10) * 60 * 1000;

    for (let i = 0; i < activities.length; i++) {
        for (let j = i + 1; j < activities.length; j++) {
            const activityA = activities[i];
            const activityB = activities[j];

            const timeDiff = Math.abs(new Date(activityA.event_time * 1000) - new Date(activityB.event_time * 1000));

            if (timeDiff < matchingWindowMs) {
                console.log(`Found potential match: ${activityA.object_id} and ${activityB.object_id}`);
                await mergeActivities(userId, activityA, activityB, userSettings);

                await redisClient.del(`user:${userId}:activity:${activityA.object_id}`);
                await redisClient.del(`user:${userId}:activity:${activityB.object_id}`);
                return;
            }
        }
    }
}

async function mergeActivities(userId, sourceActivityId, masterActivityId) {
    console.log(`Starting merge for user ${userId}: source=${sourceActivityId}, master=${masterActivityId}`);

    const accessToken = await getAccessToken(userId);
    if (!accessToken) {
        throw new Error('No access token available');
    }

    console.log(`Using access token: ${accessToken.substring(0, 10)}...`);

    const userSettings = await getUserSettings(userId);
    const titleTemplate = userSettings?.title_template || '[workout_title]';

    try {
        // Fetch both activities to combine their data
        console.log(`Fetching source activity ${sourceActivityId}...`);
        const sourceActivity = await axios.get(
            `https://www.strava.com/api/v3/activities/${sourceActivityId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        console.log(`✓ Source activity fetched: ${sourceActivity.data.name}`);

        console.log(`Fetching master activity ${masterActivityId}...`);
        const masterActivity = await axios.get(
            `https://www.strava.com/api/v3/activities/${masterActivityId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        console.log(`✓ Master activity fetched: ${masterActivity.data.name}`);

        // Combine descriptions: keep master's description and append source's description
        const masterDesc = masterActivity.data.description || '';
        const sourceDesc = sourceActivity.data.description || '';
        let combinedDescription = masterDesc;

        if (sourceDesc && sourceDesc !== masterDesc) {
            // Add separator if master has content
            if (combinedDescription) {
                combinedDescription += '\n\n---\n\n';
            }
            combinedDescription += sourceDesc;
        }

        console.log(`Combined description length: ${combinedDescription.length} chars`);

        // Use the source activity's name (Hevy workout name with emoji)
        const newTitle = titleTemplate.replace('[workout_title]', sourceActivity.data.name);
        console.log(`New title (using source name): "${newTitle}"`);

        // Update master activity with source's name and combined description
        console.log(`Updating master activity ${masterActivityId}...`);
        await axios.put(
            `https://www.strava.com/api/v3/activities/${masterActivityId}`,
            { name: newTitle, description: combinedDescription },
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        console.log(`✓ Master activity updated with combined data`);

        // Mark source activity for deletion (Strava API doesn't allow deletion via API)
        console.log(`Marking source activity ${sourceActivityId} for deletion...`);
        try {
            await axios.put(
                `https://www.strava.com/api/v3/activities/${sourceActivityId}`,
                { name: 'DELETE' },
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            console.log(`✓ Source activity renamed to "DELETE" - manually delete it from Strava`);
        } catch (markError) {
            console.warn(`⚠️  Could not mark source activity for deletion: ${markError.response?.data?.message || markError.message}`);
            console.warn(`You may need to manually delete activity ${sourceActivityId} from Strava`);
        }

        // Copy photos from source to master if they exist
        if (sourceActivity.data.photos && sourceActivity.data.photos.count > 0) {
            console.log(`Source activity has ${sourceActivity.data.photos.count} photo(s). Note: Strava API doesn't support copying photos between activities.`);
            console.log(`You'll need to manually upload photos from the source activity to the master activity.`);
        }

        // Log the merge
        await db.collection('merge_logs').add({
            user_id: userId,
            source_activity_id: sourceActivityId,
            master_activity_id: masterActivityId,
            status: 'SUCCESS',
            merged_at: new Date(),
        });

        console.log(`✓ Merge completed successfully`);
        return { success: true };
    } catch (error) {
        console.error('❌ Error merging activities:', {
            message: error.response?.data || error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            headers: error.response?.headers,
            url: error.config?.url,
            method: error.config?.method,
        });

        // Log the failed merge
        await db.collection('merge_logs').add({
            user_id: userId,
            source_activity_id: sourceActivityId,
            master_activity_id: masterActivityId,
            status: 'FAILED',
            error_message: JSON.stringify(error.response?.data || error.message),
            merged_at: new Date(),
        });

        throw error;
    }
}

async function getUserSettings(userId) {
    const settingsDoc = await db.collection('user_settings').doc(String(userId)).get();
    // Return default settings if document doesn't exist
    if (!settingsDoc.exists) {
        return {
            matching_window_minutes: 10,
            title_template: '[workout_title]',
            default_gear_id: null,
        };
    }
    return settingsDoc.data();
}

async function getAccessToken(userId) {
    console.log(`Getting access token for user ${userId}...`);
    const userDoc = await db.collection('users').doc(String(userId)).get();
    if (!userDoc.exists) {
        console.error(`User ${userId} not found in database`);
        return null;
    }

    const userData = userDoc.data();
    let { strava_access_token: accessToken, strava_refresh_token: refreshToken, strava_token_expires_at: expiresAt } = userData;

    console.log(`Token info: hasToken=${!!accessToken}, hasRefresh=${!!refreshToken}`);

    // Refresh token if expired or about to expire (within 5 min)
    const now = Math.floor(Date.now() / 1000);
    const exp = expiresAt?.toDate ? Math.floor(expiresAt.toDate().getTime() / 1000) : 0;

    console.log(`Token expiry check: now=${now}, expires=${exp}, needsRefresh=${!accessToken || (exp - now) < 300}`);

    if (!accessToken || (exp - now) < 300) {
        console.log(`Token expired or expiring soon for user ${userId}, refreshing...`);
        try {
            console.log(`Calling Strava token refresh endpoint...`);
            const response = await axios.post('https://www.strava.com/oauth/token', {
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            });

            console.log(`✓ Received new token from Strava (expires: ${new Date(response.data.expires_at * 1000).toISOString()})`);

            accessToken = response.data.access_token;
            refreshToken = response.data.refresh_token || refreshToken;
            const newExpiresAt = new Date(response.data.expires_at * 1000);

            await db.collection('users').doc(String(userId)).update({
                strava_access_token: accessToken,
                strava_refresh_token: refreshToken,
                strava_token_expires_at: newExpiresAt,
                updated_at: new Date(),
            });

            console.log(`✓ Token refreshed and saved for user ${userId}`);
        } catch (e) {
            console.error('❌ Token refresh failed:', {
                error: e.response?.data || e.message,
                status: e.response?.status,
                statusText: e.response?.statusText,
            });
            return null;
        }
    } else {
        console.log(`✓ Token still valid for user ${userId} (expires in ${Math.floor((exp - now) / 60)} minutes)`);
    }

    return accessToken;
}

async function logMerge(userId, masterId, sourceId, status, details = null) {
    await db.collection('merge_logs').add({
        user_id: String(userId),
        master_activity_id: masterId,
        source_activity_id: sourceId,
        status,
        details,
        created_at: new Date(),
    });
}

export { processWebhookEvent, getUserSettings, mergeActivities };
