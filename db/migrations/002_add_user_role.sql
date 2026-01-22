-- Migration: add role column to users
ALTER TABLE IF EXISTS users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Optional: promote existing emails to admin (replace with real admin emails)
-- UPDATE users SET role = 'admin' WHERE email IN ('admin@example.com');
