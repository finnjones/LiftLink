CREATE TABLE merge_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT NOT NULL REFERENCES users(id),
    master_activity_id BIGINT NOT NULL,
    source_activity_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'FAILURE'
    details TEXT, -- For error messages
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);