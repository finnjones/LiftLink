# Firestore Setup Guide

## Collections Structure

### 1. `users`
Stores Strava user authentication data.

**Document ID**: `{strava_user_id}` (string)
 
**Fields**:
- `id` (number): Strava user ID
- `username` (string): Strava username
- `strava_access_token` (string): Current access token
- `strava_refresh_token` (string): Refresh token
- `strava_token_expires_at` (timestamp): Token expiration time
- `created_at` (timestamp): User creation timestamp
- `updated_at` (timestamp): Last update timestamp

**Indexes**: None required (queries by document ID)
 
---

### 2. `user_settings`
Stores user-specific merge settings.

**Document ID**: `{strava_user_id}` (string)

**Fields**:
- `user_id` (string): Strava user ID
- `matching_window_minutes` (number): Time window for matching activities (default: 10)
- `title_template` (string): Template for merged activity titles (default: "[workout_title]")
- `default_gear_id` (string, nullable): Default gear ID for merged activities

**Indexes**: None required (queries by document ID)

---

### 3. `merge_logs`
Stores history of all merge operations (automatic and manual).

**Document ID**: Auto-generated

**Fields**:
- `user_id` (string): Strava user ID
- `master_activity_id` (number): ID of the activity that was kept
- `source_activity_id` (number): ID of the activity that was merged/deleted
- `status` (string): "SUCCESS" or "FAILED"
- `error_message` (string, optional): Error details if status is FAILED
- `details` (string, optional): Additional details
- `merged_at` (timestamp): When the merge occurred

**Required Composite Index**:
```
Collection: merge_logs
Fields indexed:
  - user_id (Ascending)
  - merged_at (Descending)
Query scope: Collection
```

**To create this index**:
1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Set:
   - Collection ID: `merge_logs`
   - Field 1: `user_id` (Ascending)
   - Field 2: `merged_at` (Descending)
   - Query scope: Collection
4. Click "Create"

Or use the Firebase CLI with this command:
```bash
firebase firestore:indexes
```

And add this to your `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "merge_logs",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "user_id",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "merged_at",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

---

## Security Rules

Add these Firestore security rules to protect user data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read their own user document
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Only backend can write
    }
    
    // Users can read/write their own settings
    match /user_settings/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only read their own merge logs
    match /merge_logs/{logId} {
      allow read: if request.auth != null && resource.data.user_id == request.auth.uid;
      allow write: if false; // Only backend can write
    }
  }
}
```

**Note**: Since the app uses session-based auth (not Firebase Auth), you may want to use more permissive rules for development:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Only use in development!
    }
  }
}
```

For production, implement proper authentication checks in your backend routes.

---

## Environment Variables

Make sure these are set in your `.env` file:

```env
# Strava OAuth
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_CALLBACK_URL=http://localhost:3001/auth/strava/callback

# Session
SESSION_SECRET=your_random_secret_key

# App
APP_BASE_URL=http://localhost:5173
PORT=3001
NODE_ENV=development
```

---

## Data Flow

### Manual Merge Flow:
1. User clicks "Merge Activities" on frontend
2. Frontend calls `POST /api/merges/manual`
3. Backend calls `mergeActivities()` in `merger.js`
4. Merge is performed via Strava API
5. Success/failure logged to `merge_logs` collection
6. Frontend `MergeLog` component displays history from `GET /api/logs`

### Automatic Merge Flow:
1. Strava webhook fires when activity is created
2. Webhook calls `POST /api/webhooks/strava`
3. Event stored in Redis with TTL
4. `findAndMergeMatches()` checks for duplicate activities
5. If match found, calls `mergeActivities()`
6. Merge logged to `merge_logs` collection
7. Frontend displays merge in history

---

## Testing

To verify the setup works:

1. **Check logs appear on dashboard**:
   - Perform a manual merge
   - Visit the dashboard
   - Merge history should show the recent merge

2. **Check Firestore data**:
   - Open Firebase Console → Firestore Database
   - Navigate to `merge_logs` collection
   - Verify entries have correct structure

3. **Test index**:
   - If you see an error about missing index, click the provided link in the error message
   - Firebase will auto-create the index for you

---

## Troubleshooting

### "The query requires an index" error
- The composite index for `merge_logs` hasn't been created yet
- Click the link in the error message to create it automatically
- Or create it manually following the instructions above

### Merge logs not appearing
- Check backend logs for errors in `/api/logs` route
- Verify `req.session.user.id` exists (user is authenticated)
- Check Firestore rules aren't blocking reads
- Verify `merged_at` field exists in log documents

### Old PostgreSQL references
- This app now uses Firestore exclusively
- The `db/` folder with `.sql` files is for reference only
- All data operations use the Firestore SDK
