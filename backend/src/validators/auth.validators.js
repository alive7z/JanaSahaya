import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware.js';

export const registerValidator = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ max: 120 }).withMessage('Full name too long'),
  body('email')
    .trim()
    .isEmail().withMessage('A valid email is required')
    .normalizeEmail(),
  body('phone')
    .optional({ values: 'falsy' })
    .isLength({ min: 7, max: 20 }).withMessage('Phone must be 7-20 characters'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/).withMessage('Password needs upper, lower and a digit'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
  body('city').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('ward').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  validate,
];

export const loginValidator = [
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

export const changePasswordValidator = [
  body('oldPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/).withMessage('Password needs upper, lower and a digit'),
  validate,
];

export const refreshValidator = [
  body('refreshToken').optional({ values: 'falsy' }).isString(),
  validate,
];