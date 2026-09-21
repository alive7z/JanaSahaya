-- CrowdSourced Civic Issues - MySQL 8.x schema
-- Execute as root: mysql -u root -p < src/db/schema.sql
-- or run: npm run db:setup

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS civic_issues
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE civic_issues;

-- ── Auth & users ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS roles (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(32) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name        VARCHAR(120) NOT NULL,
  email            VARCHAR(190) NOT NULL UNIQUE,
  phone            VARCHAR(24) NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  city             VARCHAR(100) NULL,
  ward             VARCHAR(100) NULL,
  profile_picture  VARCHAR(255) NULL,
  points           INT UNSIGNED NOT NULL DEFAULT 0,
  email_verified_at TIMESTAMP NULL,
  is_banned        TINYINT(1) NOT NULL DEFAULT 0,
  last_login_at    TIMESTAMP NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_users_email (email),
  KEY idx_users_city (city)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  DATETIME NOT NULL,
  ip          VARCHAR(45) NULL,
  user_agent  VARCHAR(255) NULL,
  revoked_at  DATETIME NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rt_user (user_id),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- ── Departments ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS departments (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(500) NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

-- ── RBAC ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_roles (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  role_id       BIGINT UNSIGNED NOT NULL,
  department_id BIGINT UNSIGNED NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_role (user_id, role_id),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_ur_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE = InnoDB;

-- ── Categories ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS issue_categories (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL UNIQUE,
  slug          VARCHAR(100) NOT NULL UNIQUE,
  description   VARCHAR(300) NULL,
  severity      TINYINT UNSIGNED NOT NULL DEFAULT 3,   -- 1..5
  icon          VARCHAR(60) NULL,
  department_id BIGINT UNSIGNED NULL,                  -- default auto-routing
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ic_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE = InnoDB;

-- ── Issues ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS issues (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title               VARCHAR(200) NOT NULL,
  description         TEXT NOT NULL,
  category_id         BIGINT UNSIGNED NOT NULL,
  reporter_id         BIGINT UNSIGNED NOT NULL,
  latitude            DECIMAL(10,7) NOT NULL,
  longitude           DECIMAL(10,7) NOT NULL,
  address             VARCHAR(255) NULL,
  city                VARCHAR(100) NULL,
  ward                VARCHAR(100) NULL,
  status              ENUM('SUBMITTED','UNDER_REVIEW','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED','REJECTED','DUPLICATE','REOPENED')
                        NOT NULL DEFAULT 'SUBMITTED',
  priority            ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  priority_score      INT NOT NULL DEFAULT 0,
  department_id       BIGINT UNSIGNED NULL,
  assigned_officer_id BIGINT UNSIGNED NULL,
  duplicate_of_id     BIGINT UNSIGNED NULL,
  vote_count          INT UNSIGNED NOT NULL DEFAULT 0,
  comment_count       INT UNSIGNED NOT NULL DEFAULT 0,
  follower_count      INT UNSIGNED NOT NULL DEFAULT 0,
  resolution_deadline DATETIME NULL,
  resolved_at         DATETIME NULL,
  closed_at           DATETIME NULL,
  last_activity_at    TIMESTAMP NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_issues_status (status),
  KEY idx_issues_category (category_id),
  KEY idx_issues_department (department_id),
  KEY idx_issues_priority (priority),
  KEY idx_issues_created (created_at),
  KEY idx_issues_status_priority (status, priority),
  KEY idx_issues_reporter (reporter_id),
  KEY idx_issues_location (latitude, longitude),
  CONSTRAINT fk_i_cat      FOREIGN KEY (category_id) REFERENCES issue_categories(id),
  CONSTRAINT fk_i_reporter FOREIGN KEY (reporter_id) REFERENCES users(id),
  CONSTRAINT fk_i_dept     FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_i_officer  FOREIGN KEY (assigned_officer_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_i_dup      FOREIGN KEY (duplicate_of_id) REFERENCES issues(id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS issue_images (
  id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  issue_id               BIGINT UNSIGNED NOT NULL,
  filename               VARCHAR(255) NOT NULL,
  filepath               VARCHAR(255) NOT NULL,
  mime_type              VARCHAR(80) NOT NULL,
  size                   INT UNSIGNED NOT NULL,
  is_resolution_evidence TINYINT(1) NOT NULL DEFAULT 0,
  uploaded_by            BIGINT UNSIGNED NULL,
  created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ii_issue (issue_id),
  CONSTRAINT fk_ii_issue     FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  CONSTRAINT fk_ii_uploader  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE = InnoDB;

-- ── Voting / comments / following ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS issue_votes (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  issue_id   BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vote (issue_id, user_id),
  KEY idx_vote_user (user_id),
  CONSTRAINT fk_v_issue FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  CONSTRAINT fk_v_user  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS issue_comments (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  issue_id   BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  parent_id  BIGINT UNSIGNED NULL,
  content    TEXT NOT NULL,
  is_hidden  TINYINT(1) NOT NULL DEFAULT 0,
  is_edited  TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_comment_issue (issue_id, created_at),
  CONSTRAINT fk_c_issue  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  CONSTRAINT fk_c_user   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_c_parent FOREIGN KEY (parent_id) REFERENCES issue_comments(id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS issue_followers (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  issue_id   BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_follower (issue_id, user_id),
  CONSTRAINT fk_f_issue FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  CONSTRAINT fk_f_user  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- ── Lifecycle & work                          ─────────────────────────────────

CREATE TABLE IF NOT EXISTS issue_assignments (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  issue_id      BIGINT UNSIGNED NOT NULL,
  department_id BIGINT UNSIGNED NULL,
  officer_id    BIGINT UNSIGNED NULL,
  assigned_by   BIGINT UNSIGNED NULL,
  assigned_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ia_issue (issue_id, assigned_at),
  CONSTRAINT fk_ia_issue FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  CONSTRAINT fk_ia_dept  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_ia_officer FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_ia_by    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS issue_status_history (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  issue_id    BIGINT UNSIGNED NOT NULL,
  from_status VARCHAR(32) NULL,
  to_status   VARCHAR(32) NOT NULL,
  changed_by  BIGINT UNSIGNED NULL,
  note        VARCHAR(500) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ish_issue (issue_id, created_at),
  CONSTRAINT fk_ish_issue FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  CONSTRAINT fk_ish_user  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS issue_resolutions (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  issue_id        BIGINT UNSIGNED NOT NULL,
  officer_id      BIGINT UNSIGNED NOT NULL,
  note            VARCHAR(1000) NOT NULL,
  image_path      VARCHAR(255) NULL,
  confirmed_count INT UNSIGNED NOT NULL DEFAULT 0,
  reopened_count  INT UNSIGNED NOT NULL DEFAULT 0,
  confirmed_at    TIMESTAMP NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ir_issue (issue_id),
  CONSTRAINT fk_ir_issue  FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  CONSTRAINT fk_ir_officer FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS issue_confirmation_votes (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  issue_id      BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NOT NULL,
  resolution_id BIGINT UNSIGNED NULL,
  confirmed     TINYINT(1) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_confirm (issue_id, user_id),
  CONSTRAINT fk_icv_issue FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  CONSTRAINT fk_icv_user  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_icv_res   FOREIGN KEY (resolution_id) REFERENCES issue_resolutions(id) ON DELETE SET NULL
) ENGINE = InnoDB;

-- ── Duplicates & priority ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS duplicate_candidates (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  issue_id         BIGINT UNSIGNED NOT NULL,
  duplicate_of_id  BIGINT UNSIGNED NOT NULL,
  score            INT NOT NULL,
  category_hit     TINYINT(1) NOT NULL DEFAULT 0,
  distance_metres  INT NOT NULL DEFAULT 0,
  text_similarity  DECIMAL(5,2) NOT NULL DEFAULT 0,
  status           ENUM('SUGGESTED','ACCEPTED','IGNORED') NOT NULL DEFAULT 'SUGGESTED',
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_dc_issue (issue_id),
  KEY idx_dc_dup (duplicate_of_id),
  CONSTRAINT fk_dc_issue FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  CONSTRAINT fk_dc_dup   FOREIGN KEY (duplicate_of_id) REFERENCES issues(id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS priority_history (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  issue_id       BIGINT UNSIGNED NOT NULL,
  priority       ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL,
  priority_score INT NOT NULL,
  reasons_json   JSON NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ph_issue (issue_id, created_at),
  CONSTRAINT fk_ph_issue FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- ── SLA & escalation ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sla_rules (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  priority    ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL UNIQUE,
  hours       INT UNSIGNED NOT NULL,
  description VARCHAR(255) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS issue_escalations (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  issue_id            BIGINT UNSIGNED NOT NULL,
  escalation_level    INT UNSIGNED NOT NULL DEFAULT 1,
  reason              VARCHAR(500) NOT NULL,
  escalated_to_user_id BIGINT UNSIGNED NULL,
  status              ENUM('OPEN','RESOLVED') NOT NULL DEFAULT 'OPEN',
  created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at         TIMESTAMP NULL,
  KEY idx_ie_issue (issue_id, status),
  CONSTRAINT fk_ie_issue FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
  CONSTRAINT fk_ie_user  FOREIGN KEY (escalated_to_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE = InnoDB;

-- ── Notifications ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  type       VARCHAR(40) NOT NULL,
  title      VARCHAR(160) NOT NULL,
  body       VARCHAR(500) NULL,
  link       VARCHAR(255) NULL,
  payload    JSON NULL,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notif_user (user_id, is_read, created_at),
  CONSTRAINT fk_n_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- ── Reports / moderation ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reports (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reporter_id BIGINT UNSIGNED NOT NULL,
  content_type ENUM('ISSUE','COMMENT','USER') NOT NULL,
  content_id  BIGINT UNSIGNED NOT NULL,
  reason      VARCHAR(300) NOT NULL,
  status      ENUM('OPEN','RESOLVED','DISMISSED') NOT NULL DEFAULT 'OPEN',
  handled_by  BIGINT UNSIGNED NULL,
  handled_at  TIMESTAMP NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_reports_status (status, created_at),
  CONSTRAINT fk_r_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_r_handler  FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE = InnoDB;

-- ── Audit ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id      BIGINT UNSIGNED NULL,
  actor_role    VARCHAR(32) NULL,
  action        VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64) NULL,
  resource_id   BIGINT UNSIGNED NULL,
  old_value     JSON NULL,
  new_value     JSON NULL,
  ip            VARCHAR(45) NULL,
  user_agent    VARCHAR(255) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_actor (actor_id),
  KEY idx_audit_resource (resource_type, resource_id),
  KEY idx_audit_created (created_at)
) ENGINE = InnoDB;

SET FOREIGN_KEY_CHECKS = 1;