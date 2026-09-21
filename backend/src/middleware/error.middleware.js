import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

export function notFound(req, _res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let details = err.details;

  if (err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = duplicateEntryMessage(err.message);
  } else if (err.code?.startsWith('ER_')) {
    status = 500;
    message = 'Database error';
  } else if (err.name === 'MulterError') {
    status = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : `Upload error: ${err.code}`;
  } else if (err.name === 'SyntaxError') {
    status = 400;
    message = 'Malformed request body';
  }

  const requestId = req.requestId || req.id || null;

  if (status >= 500) {
    logger.error(
      { err, requestId, method: req.method, url: req.originalUrl },
      'Unhandled error: %s',
      err.message,
    );
  }

  const body = { success: false, message, requestId };
  if (details != null) body.errors = details;
  if (env().isDev && status >= 500) body.stack = err.stack;
  res.status(status).json(body);
}

function duplicateEntryMessage(dbMessage) {
  const match = /Duplicate entry '.*' for key '(\w+\.)?(\w+)'/.exec(dbMessage || '');
  const column = match?.[2];
  if (column === 'email') return 'An account with this email already exists';
  if (column === 'phone') return 'This phone number is already registered';
  return 'A record with this value already exists';
}

function env() {
  // Lazy import to avoid a hard dependency cycle at module load time.
  return { isDev: process.env.NODE_ENV !== 'production' };
}