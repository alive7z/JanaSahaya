-- 002_review_workflow.sql
-- Issue verification + acknowledgement + soft delete (moderation & review workflow).

ALTER TABLE issues
  ADD COLUMN verification_status ENUM('PENDING','VERIFIED','UNVERIFIED','REJECTED')
    NOT NULL DEFAULT 'PENDING' AFTER status,
  ADD COLUMN verified_by        BIGINT UNSIGNED NULL AFTER verification_status,
  ADD COLUMN verified_at        DATETIME NULL,
  ADD COLUMN verification_note  VARCHAR(500) NULL,
  ADD COLUMN acknowledged_by    BIGINT UNSIGNED NULL,
  ADD COLUMN acknowledged_at    DATETIME NULL,
  ADD COLUMN rejection_reason   VARCHAR(500) NULL,
  ADD COLUMN deleted_at         DATETIME NULL,
  ADD COLUMN deleted_by         BIGINT UNSIGNED NULL,
  ADD COLUMN deletion_reason    VARCHAR(500) NULL,
  ADD INDEX idx_issues_verification (verification_status),
  ADD INDEX idx_issues_deleted (deleted_at),
  ADD CONSTRAINT fk_i_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_i_ack_by       FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_i_deleted_by   FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE issue_escalations
  ADD COLUMN acknowledged_by BIGINT UNSIGNED NULL AFTER status,
  ADD COLUMN acknowledged_at DATETIME NULL,
  ADD CONSTRAINT fk_escalation_ack_by FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE issue_comments
  ADD COLUMN deleted_at DATETIME NULL,
  ADD COLUMN deleted_by BIGINT UNSIGNED NULL,
  ADD INDEX idx_comments_deleted (deleted_at),
  ADD CONSTRAINT fk_comments_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;