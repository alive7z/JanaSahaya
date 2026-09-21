import { getOne, query } from '../config/database.js';

/**
 * Department routing engine.
 * Categories store their responsible department (via issue_categories.department_id).
 * Admins adjust the mapping; officers are members of a department via user_roles.
 */
export async function routeDepartmentForCategory(categoryId) {
  const row = await getOne(
    `SELECT c.id AS category_id, c.department_id, d.name AS department_name
     FROM issue_categories c
     LEFT JOIN departments d ON d.id = c.department_id
     WHERE c.id = ?`,
    [categoryId],
  );
  return row?.department_id ?? null;
}

export async function listDepartments() {
  return query(
    'SELECT id, name, description, is_active FROM departments ORDER BY name',
  );
}

export async function getDepartment(id) {
  return getOne('SELECT id, name, description, is_active FROM departments WHERE id = ?', [id]);
}

export async function createDepartment({ name, description }) {
  const result = await query(
    'INSERT INTO departments (name, description) VALUES (?, ?)',
    [name, description],
  );
  return result.insertId;
}

export async function updateDepartment(id, { name, description, isActive }) {
  await query(
    'UPDATE departments SET name = COALESCE(?, name), description = COALESCE(?, description), is_active = COALESCE(?, is_active) WHERE id = ?',
    [name ?? null, description ?? null, isActive ?? null, id],
  );
}

export async function updateCategoryRouting(categoryId, departmentId) {
  await query(
    'UPDATE issue_categories SET department_id = ? WHERE id = ?',
    [departmentId ?? null, categoryId],
  );
}

/** Officers belonging to a department. */
export async function departmentOfficers(departmentId) {
  return query(
    `SELECT u.id, u.full_name, u.email, u.phone
     FROM user_roles ur
     JOIN users u ON u.id = ur.user_id
     JOIN roles r ON r.id = ur.role_id
     WHERE r.name = 'OFFICER' AND ur.department_id = ?
     ORDER BY u.full_name`,
    [departmentId],
  );
}

export async function assignIssueOfficer(issueId, officerId, assignedBy) {
  await query(
    `UPDATE issues
     SET assigned_officer_id = ?, department_id = (SELECT department_id FROM user_roles WHERE user_id = ? AND role_id = (SELECT id FROM roles WHERE name = 'OFFICER') LIMIT 1)
     WHERE id = ?`,
    [officerId, officerId, issueId],
  );
}