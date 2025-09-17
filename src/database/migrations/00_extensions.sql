CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- optional advanced constraints
CREATE EXTENSION IF NOT EXISTS citext;       -- case-insensitive text (email)