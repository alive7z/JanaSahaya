/** Field allow-list used before a user record leaves the API. */
const PUBLIC_USER_FIELDS = [
  'id',
  'full_name',
  'email',
  'phone',
  'city',
  'ward',
  'profile_picture',
  'points',
  'email_verified_at',
  'is_banned',
  'last_login_at',
  'created_at',
];

/**
 * Returns a safe representation of a user row.
 * Never leaks password_hash or any other sensitive column.
 */
export function toPublicUser(user) {
  if (!user) return null;
  const out = {};
  for (const field of PUBLIC_USER_FIELDS) {
    if (user[field] !== undefined) out[field] = user[field];
  }
  return out;
}