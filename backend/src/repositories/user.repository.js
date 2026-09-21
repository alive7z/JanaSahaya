import { query, getOne } from '../config/database.js';

export const USER_COLUMNS = `
  id, full_name, email, phone, city, ward, bio, profile_picture,
  points, email_verified_at, is_banned, last_login_at, created_at
`;

export async function getUser(id) {
  return getOne(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [id]);
}

export async function getUserByEmail(email) {
  return getOne('SELECT * FROM users WHERE email = ?', [email]);
}

export async function getUserRoles(userId) {
  const rows = await query(
    `SELECT r.id AS role_id, r.name, r.description, ur.department_id
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ?`,
    [userId],
  );
  return rows;
}

export async function createUser({ fullName, email, phone, passwordHash, city, ward }) {
  const result = await query(
    `INSERT INTO users (full_name, email, phone, password_hash, city, ward)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [fullName, email, phone, passwordHash, city, ward],
  );
  return result.insertId;
}

export async function assignRole(userId, roleName, departmentId = null) {
  const [role] = await query("SELECT id FROM roles WHERE name = ?", [roleName]);
  if (!role) throw new Error(`Unknown role: ${roleName}`);
  await query(
    `INSERT INTO user_roles (user_id, role_id, department_id) VALUES (?, ?, ?)`,
    [userId, role.id, departmentId],
  );
}

export async function hasRole(userId, roleName) {
  const rows = await query(
    `SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.name = ?`,
    [userId, roleName],
  );
  return rows.length > 0;
}

export async function recordLastLogin(userId) {
  await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [userId]);
}

export async function addPoints(userId, points) {
  await query('UPDATE users SET points = points + ? WHERE id = ?', [points, userId]);
}

export async function updateProfile(userId, fields) {
  const sets = [];
  const params = [];
  const allowed = {
    full_name: 'fullName',
    email: 'email',
    phone: 'phone',
    city: 'city',
    ward: 'ward',
    bio: 'bio',
    profile_picture: 'profilePicture',
  };
  for (const [col, prop] of Object.entries(allowed)) {
    if (fields[prop] !== undefined) {
      sets.push(`${col} = ?`);
      params.push(fields[prop]);
    }
  }
  if (sets.length === 0) return;
  params.push(userId);
  await query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
}

export async function listUsers({ page = 1, limit = 20, search = '' } = {}) {
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];
  if (search) {
    where.push('(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows, total] = await Promise.all([
    query(
      `SELECT ${USER_COLUMNS} FROM users ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    ),
    query(`SELECT COUNT(*) AS n FROM users ${whereSql}`, params),
  ]);

  const ids = rows.map((r) => r.id);
  const roleMap = {};
  if (ids.length) {
    const roleRows = await query(
      `SELECT ur.user_id, r.name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
    for (const row of roleRows) {
      (roleMap[row.user_id] ??= []).push(row.name);
    }
  }
  const users = rows.map((u) => ({ ...u, roles: roleMap[u.id] ?? ['CITIZEN'] }));

  return { users, total: total[0]?.n ?? 0, page, pages: Math.ceil((total[0]?.n ?? 0) / limit) };
}