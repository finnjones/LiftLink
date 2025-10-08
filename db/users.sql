CREATE TABLE users (
    id BIGINT PRIMARY KEY, -- Strava Athlete ID
    strava_access_token TEXT NOT NULL,
    strava_refresh_token TEXT NOT NULL,
    strava_token_expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);