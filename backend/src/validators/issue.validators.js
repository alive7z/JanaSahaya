import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';
import { ALL_STATUSES } from '../services/status.service.js';

const coords = (field) =>
  body(field)
    .isFloat({ min: -90, max: 90 }).withMessage(`${field} must be a valid latitude`)
    .customSanitizer((v) => Number(v));

export const createIssueValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10, max: 3000 }).withMessage('Description must be 10-3000 characters'),
  body('categoryId')
    .isInt({ min: 1 }).withMessage('A valid category is required'),
  coords('latitude'),
  body('longitude')
    .isFloat({ min: -180, max: 180 }).withMessage('longitude must be valid')
    .customSanitizer((v) => Number(v)),
  body('locationSource')
    .isIn(['current_location', 'map', 'manual'])
    .withMessage('locationSource must be current_location, map, or manual'),
  body('address').trim().notEmpty().withMessage('A resolved address or coordinate label is required').isLength({ max: 255 }),
  body('city').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('ward').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  validate,
];

export const duplicateCheckValidator = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('categoryId').isInt({ min: 1 }),
  coords('latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).customSanitizer((v) => Number(v)),
  validate,
];

export const idParamValidator = [
  param('id').isInt({ min: 1 }).withMessage('Invalid id'),
  validate,
];

export const commentValidator = [
  body('content')
    .trim()
    .notEmpty().withMessage('Comment is required')
    .isLength({ max: 2000 }).withMessage('Comment too long'),
  body('parent_id').optional({ values: 'falsy' }).isInt({ min: 1 }),
  validate,
];

export const statusValidator = [
  param('id').isInt({ min: 1 }),
  body('status')
    .isIn(ALL_STATUSES).withMessage('Invalid status'),
  body('note').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  validate,
];

export const resolveValidator = [
  param('id').isInt({ min: 1 }),
  body('note')
    .trim()
    .notEmpty().withMessage('Resolution note is required')
    .isLength({ max: 1000 }),
  validate,
];

export const verifyValidator = [
  param('id').isInt({ min: 1 }),
  body('confirmed').isBoolean().withMessage('confirmed must be true or false'),
  validate,
];

export const assignOfficerValidator = [
  param('id').isInt({ min: 1 }),
  body('officer_id').isInt({ min: 1 }).withMessage('officer_id is required'),
  validate,
];

export const listQueryValidator = [
  query('status').optional().isString(),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  query('sort').optional().isIn(['newest', 'oldest', 'most_supported', 'priority', 'nearest']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
];

export const reportValidator = [
  body('reason').trim().notEmpty().withMessage('Reason is required').isLength({ max: 300 }),
  validate,
];
