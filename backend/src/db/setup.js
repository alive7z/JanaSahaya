import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import env from '../config/env.js';
import { buildSslConfig } from '../config/ssl.js';
import logger from '../utils/logger.js';
import { hashPassword } from '../utils/password.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runSchema(conn) {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  // Execute statement by statement so each CREATE runs independently.
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    // The managed database (e.g. Aiven defaultdb) already exists and the app
    // account has no CREATE DATABASE privilege, so skip database-level statements.
    if (/^\s*CREATE\s+DATABASE\b/i.test(stmt)) continue;
    if (/^\s*USE\b/i.test(stmt)) continue;
    await conn.query(stmt);
  }
  await conn.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
       name        VARCHAR(255) NOT NULL UNIQUE,
       applied_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     ) ENGINE = InnoDB`,
  );
  logger.info('Schema applied');
}

/** Run any not-yet-applied files in src/db/migrations (idempotent). */
async function runMigrations(conn) {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;
  const [appliedRows] = await conn.query('SELECT name FROM schema_migrations');
  const applied = new Set(appliedRows.map((r) => r.name));
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    logger.info('Applying migration: %s', file);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    for (const stmt of sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean)) {
      await conn.query(stmt);
    }
    await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
  }
}

async function seed(conn) {
  const [roles] = await conn.query(
    'SELECT id, name FROM roles',
  );
  const roleMap = Object.fromEntries(roles.map((r) => [r.name, r.id]));

  if (!roleMap.CITIZEN) {
    await conn.query(
      "INSERT INTO roles (name, description) VALUES ('CITIZEN','Regular citizen'), ('OFFICER','Department officer'), ('ADMIN','System administrator')",
    );
    logger.info('Roles seeded');
  }

  const departments = [
    ['Public Works', 'Roads, bridges, drainage and public infrastructure'],
    ['Sanitation', 'Garbage collection, waste management and cleanliness'],
    ['Electrical', 'Street lighting and public electrical infrastructure'],
    ['Water Supply', 'Drinking water supply and distribution'],
    ['Traffic & Transport', 'Traffic signals, roads safety and public transport'],
    ['Parks & Recreation', 'Parks, playgrounds and public open spaces'],
    ['Environmental Services', 'Pollution and environmental hazards'],
    ['Building & Housing', 'Building violations and housing issues'],
  ];
  for (const [name, description] of departments) {
    await conn.query(
      `INSERT IGNORE INTO departments (name, description) VALUES (?, ?)`,
      [name, description],
    );
  }
  logger.info('Departments seeded');

  const [deptRows] = await conn.query('SELECT id, name FROM departments');
  const deptMap = Object.fromEntries(deptRows.map((d) => [d.name, d.id]));

  const categories = [
    ['Pothole', 'pothole', 5, 'Public Works', 'map-pothole'],
    ['Road Damage', 'road-damage', 4, 'Public Works', 'road'],
    ['Street Lighting', 'street-lighting', 3, 'Electrical', 'lightbulb'],
    ['Garbage', 'garbage', 3, 'Sanitation', 'trash'],
    ['Illegal Dumping', 'illegal-dumping', 3, 'Sanitation', 'dump'],
    ['Drainage', 'drainage', 4, 'Public Works', 'waves'],
    ['Water Supply', 'water-supply', 4, 'Water Supply', 'droplet'],
    ['Sewage', 'sewage', 5, 'Sanitation', 'biohazard'],
    ['Traffic Signal', 'traffic-signal', 3, 'Traffic & Transport', 'traffic-cone'],
    ['Public Infrastructure', 'public-infrastructure', 3, 'Public Works', 'building'],
    ['Public Safety', 'public-safety', 4, 'Public Works', 'shield'],
    ['Other', 'other', 2, null, 'circle'],
  ];
  for (const [name, slug, severity, deptName] of categories) {
    await conn.query(
      `INSERT IGNORE INTO issue_categories (name, slug, severity, department_id, description)
       VALUES (?, ?, ?, ?,
         CONCAT('Issues related to "', ?, '"'))`,
      [name, slug, severity, deptName ? deptMap[deptName] : null, name],
    );
  }
  logger.info('Categories seeded');

  const sla = [
    ['CRITICAL', 24, 'Resolve critical issues within 24 hours'],
    ['HIGH', 72, 'Resolve high priority issues within 3 days'],
    ['MEDIUM', 168, 'Resolve medium priority issues within 7 days'],
    ['LOW', 336, 'Resolve low priority issues within 14 days'],
  ];
  for (const [priority, hours, description] of sla) {
    await conn.query(
      `INSERT IGNORE INTO sla_rules (priority, hours, description) VALUES (?, ?, ?)`,
      [priority, hours, description],
    );
  }
  logger.info('SLA rules seeded');

  const adminEmail = env.seed.adminEmail.toLowerCase();
  const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (existing.length === 0) {
    const passwordHash = await hashPassword(env.seed.adminPassword);
    await conn.query(
      `INSERT INTO users (full_name, email, phone, password_hash, city)
       VALUES (?, ?, ?, ?, ?)`,
      ['System Administrator', adminEmail, null, passwordHash, 'Dehradun'],
    );
    const [[adminRow]] = await conn.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
    const [adminRole] = await conn.query("SELECT id FROM roles WHERE name = 'ADMIN'");
    await conn.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
      [adminRow.id, adminRole[0].id],
    );
    logger.info('Owner admin seeded: %s', adminEmail);
  }

  const officerEmail = env.seed.officerEmail.toLowerCase();
  const [officerExists] = await conn.query('SELECT id FROM users WHERE email = ?', [officerEmail]);
  if (officerExists.length === 0) {
    const officerHash = await hashPassword(env.seed.officerPassword);
    await conn.query(
      `INSERT INTO users (full_name, email, phone, password_hash, city)
       VALUES (?, ?, ?, ?, ?)`,
      ['Public Works Officer', officerEmail, null, officerHash, 'Dehradun'],
    );
    const [[officerRow]] = await conn.query('SELECT id FROM users WHERE email = ?', [officerEmail]);
    const [officerRole] = await conn.query("SELECT id FROM roles WHERE name = 'OFFICER'");
    const pwDept = deptMap['Public Works'];
    await conn.query(
      'INSERT INTO user_roles (user_id, role_id, department_id) VALUES (?, ?, ?)',
      [officerRow.id, officerRole[0].id, pwDept],
    );
    logger.info('Example officer seeded: %s', officerEmail);
  }

  if (!env.seed.demoEnabled) return;

  const demoAccounts = [
    ['Citizen Demo', env.seed.demoCitizenEmail.toLowerCase(), env.seed.demoPassword, 'CITIZEN', 'Dehradun', null],
    ['Admin Demo', env.seed.demoAdminEmail.toLowerCase(), env.seed.demoPassword, 'ADMIN', 'Dehradun', null],
  ];
  for (const [fullName, email, password, roleName, city, phone] of demoAccounts) {
    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length === 0) {
      const passwordHash = await hashPassword(password);
      const [insertRes] = await conn.query(
        `INSERT INTO users (full_name, email, phone, password_hash, city)
         VALUES (?, ?, ?, ?, ?)`,
        [fullName, email, phone, passwordHash, city],
      );
      const [roleRows] = await conn.query('SELECT id FROM roles WHERE name = ?', [roleName]);
      await conn.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
        [insertRes.insertId, roleRows[0].id],
      );
      logger.info('Demo %s seeded: %s', roleName.toLowerCase(), email);
    }
  }

  const [[demoCitizen]] = await conn.query('SELECT id FROM users WHERE email = ?', [env.seed.demoCitizenEmail.toLowerCase()]);
  const [[demoOfficer]] = await conn.query('SELECT id FROM users WHERE email = ?', [officerEmail]);
  const demoIssues = [
    ['Large pothole near Clock Tower', 'A deep pothole is slowing traffic and is dangerous for two-wheelers.', 'Pothole', 30.3244, 78.0410, 'Clock Tower, Dehradun', 'Rajpur Road', 'SUBMITTED', 'HIGH', 78, null],
    ['Streetlight not working on Canal Road', 'Three consecutive streetlights have been dark for several nights.', 'Street Lighting', 30.3408, 78.0602, 'Canal Road, Dehradun', 'Jakhan', 'ASSIGNED', 'MEDIUM', 52, demoOfficer?.id ?? null],
    ['Garbage collection missed near Parade Ground', 'Waste has accumulated beside the public walkway after missed collection.', 'Garbage', 30.3211, 78.0452, 'Parade Ground, Dehradun', 'Dalanwala', 'IN_PROGRESS', 'MEDIUM', 61, demoOfficer?.id ?? null],
    ['Blocked roadside drain after rainfall', 'The roadside drain was blocked and caused waterlogging during rain.', 'Drainage', 30.3079, 78.0325, 'Patel Nagar, Dehradun', 'Patel Nagar', 'RESOLVED', 'HIGH', 84, demoOfficer?.id ?? null],
  ];
  for (const [title, description, categoryName, latitude, longitude, address, ward, status, priority, priorityScore, officerId] of demoIssues) {
    const [[category]] = await conn.query(
      `SELECT c.id, c.department_id FROM issue_categories c WHERE c.name = ?`,
      [categoryName],
    );
    if (!category || !demoCitizen) continue;
    const [existingIssue] = await conn.query('SELECT id FROM issues WHERE reporter_id = ? AND title = ?', [demoCitizen.id, title]);
    if (existingIssue.length) continue;
    const [issueResult] = await conn.query(
      `INSERT INTO issues
       (title, description, category_id, reporter_id, latitude, longitude, location_source,
        address, city, ward, status, priority, priority_score, department_id, assigned_officer_id,
        vote_count, comment_count, follower_count, resolution_deadline, resolved_at, last_activity_at)
       VALUES (?, ?, ?, ?, ?, ?, 'map', ?, 'Dehradun', ?, ?, ?, ?, ?, ?, ?, ?, ?,
               DATE_ADD(NOW(), INTERVAL 7 DAY), IF(? = 'RESOLVED', NOW(), NULL), NOW())`,
      [title, description, category.id, demoCitizen.id, latitude, longitude, address, ward, status,
        priority, priorityScore, category.department_id, officerId, Math.floor(priorityScore / 12),
        status === 'RESOLVED' ? 2 : 0, Math.floor(priorityScore / 20), status],
    );
    await conn.query(
      'INSERT INTO issue_status_history (issue_id, from_status, to_status, changed_by, note) VALUES (?, NULL, ?, ?, ?)',
      [issueResult.insertId, status, demoCitizen.id, 'Recruiter demo data'],
    );
  }
  logger.info('Recruiter demo issues seeded');
}

async function main() {
  logger.info(
    'Connecting to MySQL at %s:%s (database: %s)',
    env.db.host,
    env.db.port,
    env.db.database,
  );
  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    ssl: buildSslConfig(),
    multipleStatements: false,
  });

  try {
    logger.info('Database connection established');
    await runSchema(conn);
    await runMigrations(conn);
    await seed(conn);
    logger.info('Database setup complete');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  logger.error(
    { err },
    'Database setup failed for %s:%s/%s: %s',
    env.db.host,
    env.db.port,
    env.db.database,
    err.message,
  );
  process.exit(1);
});
