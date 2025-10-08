CREATE TABLE user_settings (
    user_id BIGINT PRIMARY KEY REFERENCES users(id),
    matching_window_minutes INT DEFAULT 10,
    title_template VARCHAR(255) DEFAULT '[workout_title]',
    default_gear_id VARCHAR(255)
);