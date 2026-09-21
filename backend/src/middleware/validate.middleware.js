import { validationResult } from 'express-validator';
import AppError from '../utils/AppError.js';

export function validate(req, _res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const details = errors.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));
  next(new AppError(422, 'Validation failed', details));
}