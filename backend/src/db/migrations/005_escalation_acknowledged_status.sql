-- Keep the database enum aligned with the escalation acknowledgement workflow.
ALTER TABLE issue_escalations
  MODIFY COLUMN status ENUM('OPEN','ACKNOWLEDGED','RESOLVED') NOT NULL DEFAULT 'OPEN';
