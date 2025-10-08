Of course. Here is the entire project brief formatted as a single Markdown file. You can copy the content below and save it as LIFTLINK_PROJECT_BRIEF.md.
Markdown

# Project Brief & Technical Specification: LiftLink

**Version:** 1.0
**Date:** 17 September 2025
**Author:** Gemini, Project Architect

---

## 1. Project Overview

### 1.1. Vision
LiftLink is a "Set it and forget it" web service for athletes who use Strava. Its purpose is to automatically clean up and enrich their Strava feed by merging duplicate workout entries from different sources (e.g., a Garmin watch and a workout logging app like Hevy) into a single, complete activity.

### 1.2. Core Problem
Athletes often record a single workout on two devices: a GPS/HRM watch (like Garmin) to capture physiological data, and a mobile app (like Hevy or Strong) to log specific exercises, sets, and reps. When synced to Strava, this creates two incomplete, duplicate entries. Users must then manually copy details from one activity to the other and delete the duplicate—a tedious and repetitive task.

### 1.3. Solution
LiftLink will automate this process. By securely connecting to a user's Strava account, it will detect these workout pairs, intelligently merge the detailed notes into the primary data-rich activity, and delete the redundant entry, leaving a single, perfect record of the workout.

### 1.4. Target User
Any Strava user who records strength training or gym workouts using both a wearable device and a separate mobile logging application.

---

## 2. Functional Requirements & User Stories

### 2.1. Onboarding & Authentication
- **As a new user,** I want to connect my Strava account with a single click so that I can quickly and securely authorize LiftLink.
- **As a user,** I must be shown the exact permissions LiftLink requires (view, modify, delete activities) and why they are needed, so I can grant access with confidence.

### 2.2. Core Merging Logic (Automated)
- **As a user,** I want LiftLink to automatically detect when I upload a workout from my Garmin watch and a corresponding workout from my logging app (Hevy, Strong, etc.).
- **As a user,** I want LiftLink to copy the title and description (sets, reps, notes) from my logging app's activity.
- **As a user,** I want LiftLink to paste this information into the corresponding Garmin activity on Strava.
- **As a user,** I want LiftLink to automatically delete the redundant activity from my logging app after a successful merge to keep my feed clean.

### 2.3. Dashboard & Logging
- **As a user,** I want to see a status indicator confirming that LiftLink is actively monitoring my account.
- **As a user,** I want to view a historical log of all the merges LiftLink has performed for me, so I can see it's working.

### 2.4. Manual Intervention (V1.1 Feature)
- **As a user,** I want to see a list of potential merges that the automation missed (e.g., due to a sync delay).
- **As a user,** I want to be able to manually trigger a merge or dismiss the suggestion for each pair.

### 2.5. Settings & Customization (V1.1 Feature)
- **As a user,** I want to be able to customize the time window for automatic matching (e.g., 5, 10, 15 minutes).
- **As a user,** I want to create a template for my workout titles (e.g., "🏋️‍♂️ [Workout Title]") to maintain consistency.
- **As a user,** I want to be able to set my default "Gym" gear to be automatically added to merged activities.

---

## 3. Technical Architecture & Stack

### 3.1. Frontend
- **Framework:** React (using Vite for tooling).
- **Styling:** Tailwind CSS for a utility-first approach.
- **State Management:** React Context or Zustand for simple global state (user auth status).

### 3.2. Backend
- **Runtime:** Node.js.
- **Framework:** Express.js for routing and API endpoints.
- **Temporary Data Store:** Redis. To be used for the "waiting room" logic, caching unmatched activities for a short period.
- **Database:** PostgreSQL. For persistent storage of user data, settings, and merge logs.

### 3.3. Authentication
- The system MUST use **Strava's OAuth 2.0** flow exclusively. User credentials will not be stored. We will store the `access_token`, `refresh_token`, and `expiry_at` timestamp for each user to make API calls on their behalf.

### 3.4. Deployment
- **Frontend:** Vercel.
- **Backend:** Render or Fly.io.
- **Database:** Managed PostgreSQL service (e.g., from Render or Supabase).
- **Redis:** Upstash (Serverless Redis provider).

### 3.5. Required Environment Variables

STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
DATABASE_URL
REDIS_URL
SESSION_SECRET
APP_BASE_URL


---

## 4. API Specification (Backend)

The backend will expose a RESTful API.

- **Authentication:**
  - `GET /auth/strava`: Redirects the user to the Strava OAuth consent screen.
  - `GET /auth/strava/callback`: Strava redirects here after authorization. The backend will exchange the code for tokens and create a user session.
  - `POST /auth/logout`: Clears the user's session.

- **Webhook:**
  - `POST /api/webhooks/strava`: Receives webhook events from Strava. This is the entry point for the core merging logic.
  - `GET /api/webhooks/strava`: Used for the initial webhook subscription handshake with Strava.

- **User & Settings:**
  - `GET /api/user/me`: Returns the logged-in user's information and status.
  - `GET /api/user/settings`: Returns the user's current settings.
  - `POST /api/user/settings`: Updates the user's settings.

- **Logs & Actions:**
  - `GET /api/logs`: Retrieves the user's merge history.
  - `GET /api/merges/pending`: Retrieves potential merges for manual action.
  - `POST /api/merges/manual`: Manually triggers a merge for a given pair of activity IDs.

---

## 5. Data Models (PostgreSQL Schema)

**Table: `users`**
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY, -- Strava Athlete ID
    strava_access_token TEXT NOT NULL,
    strava_refresh_token TEXT NOT NULL,
    strava_token_expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

Table: user_settings
SQL

CREATE TABLE user_settings (
    user_id BIGINT PRIMARY KEY REFERENCES users(id),
    matching_window_minutes INT DEFAULT 10,
    title_template VARCHAR(255) DEFAULT '[workout_title]',
    default_gear_id VARCHAR(255)
);

Table: merge_logs
SQL

CREATE TABLE merge_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(id),
    master_activity_id BIGINT NOT NULL,
    source_activity_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'FAILURE'
    details TEXT, -- For error messages
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

6. Phased Rollout Plan

    Phase 1 (MVP Build):

        Implement Strava OAuth 2.0.

        Build the core backend webhook listener and merging logic using Redis for the waiting room.

        Create a minimal frontend with a login page and a simple dashboard that only displays the status and the merge log.

        Deploy the initial version.

    Phase 2 (V1.1 Feature Build):

        Build the Settings page on the frontend.

        Implement the corresponding API endpoints to save and retrieve settings.

        Update the backend merging logic to use the user's custom settings.

        Implement the Manual Merge UI and API endpoints.