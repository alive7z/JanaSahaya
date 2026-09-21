-- 003_user_bio.sql
-- Add a short bio for user profiles (used by abuse/reputation signals and profile page).

ALTER TABLE users
  ADD COLUMN bio VARCHAR(500) NULL AFTER ward;