-- 001_refresh_token_family.sql
-- Token families + rotation chaining so a reused/old refresh token can be detected
-- and the whole family revoked (theft detection).
ALTER TABLE refresh_tokens
  ADD COLUMN family_id      CHAR(36)    NULL AFTER token_hash,
  ADD COLUMN replaced_by_id BIGINT UNSIGNED NULL AFTER revoked_at,
  ADD INDEX idx_rt_family (family_id),
  ADD INDEX idx_rt_replaced_by (replaced_by_id);