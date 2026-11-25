/**
 * Authentication Input Validators
 * Rules for login credentials and user authentication inputs
 */
const { body } = require('express-validator');

/**
 * Validation rules for user/teacher login
 */
const loginRules = [
  body('email')
    .isString()
    .withMessage('Email address must be text')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please provide a valid institutional email address')
    .normalizeEmail({ gmail_remove_dots: false })
    .isLength({ max: 255 })
    .withMessage('Email address must not exceed 255 characters'),

  body('password')
    .isString()
    .withMessage('Password must be text')
    .bail()
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .isLength({ max: 128 })
    .withMessage('Password must not exceed 128 characters'),
];

module.exports = {
  loginRules,
};
