import { verifyAccessToken } from '../utils/jwt.js';
import { accessTokenRevoked } from '../services/tokenRevocation.js';
import { getUser, getUserRoles } from '../repositories/user.repository.js';
import AppError from '../utils/AppError.js';

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export async function authenticate(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) throw new AppError(401, 'Authentication required');

    const { payload, error } = verifyAccessToken(token);
    if (error) throw new AppError(401, 'Invalid or expired token');
    if (accessTokenRevoked(payload.jti)) {
      throw new AppError(401, 'Token has been revoked');
    }

    const user = await getUser(payload.sub);
    if (!user) throw new AppError(401, 'User no longer exists');
    if (user.is_banned) throw new AppError(403, 'Account is suspended');

    const roles = await getUserRoles(payload.sub);

    req.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      roles,
      departmentId: roles.find((r) => r.department_id)?.department_id ?? null,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowed) {
  return (req, _res, next) => {
    const names = (req.user?.roles || []).map((r) => r.name);
    if (!allowed.some((role) => names.includes(role))) {
      return next(new AppError(403, 'Insufficient permissions'));
    }
    next();
  };
}

/** Officers are restricted to their department unless they are an admin. */
export function requireOfficerOfDepartment(req, _res, next) {
  const names = (req.user?.roles || []).map((r) => r.name);
  if (names.includes('ADMIN')) return next();

  if (!names.includes('OFFICER')) {
    return next(new AppError(403, 'Insufficient permissions'));
  }
  next();
}