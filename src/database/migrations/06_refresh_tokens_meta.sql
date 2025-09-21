ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS user_agent text;

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS ip text;