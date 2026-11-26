/**
 * Reusable Common Validators for CampusCare API
 * Handles IDs, required fields, input lengths, and allowed enum values
 */
const { body, param, query } = require('express-validator');

/**
 * Validates a UUID path parameter (e.g. /users/:id, /tickets/:id)
 * @param {string} paramName - Name of the parameter in req.params
 */
const validateUuidParam = (paramName = 'id') => [
  param(paramName)
    .trim()
    .notEmpty()
    .withMessage(`Parameter ${paramName} is required`)
    .isUUID()
    .withMessage(`Parameter ${paramName} must be a valid UUID`),
];

/**
 * Validates a positive integer parameter (e.g. /roles/:id)
 * @param {string} paramName - Name of the parameter in req.params
 */
const validateIntParam = (paramName = 'id') => [
  param(paramName)
    .trim()
    .notEmpty()
    .withMessage(`Parameter ${paramName} is required`)
    .isInt({ min: 1 })
    .withMessage(`Parameter ${paramName} must be a positive integer`),
];

/**
 * Validates a required string field with length constraints
 * @param {string} fieldName - Field name in req.body
 * @param {number} min - Minimum characters
 * @param {number} max - Maximum characters
 */
const validateRequiredString = (fieldName, min = 1, max = 255) => [
  body(fieldName)
    .trim()
    .notEmpty()
    .withMessage(`${fieldName} is required`)
    .isLength({ min, max })
    .withMessage(`${fieldName} must be between ${min} and ${max} characters`),
];

/**
 * Validates an input field against an allowed array of values (Enum)
 * @param {string} fieldName - Field name in req.body
 * @param {Array<string>} allowed - Array of allowed string values
 */
const validateAllowedValues = (fieldName, allowed = []) => [
  body(fieldName)
    .trim()
    .notEmpty()
    .withMessage(`${fieldName} is required`)
    .isIn(allowed)
    .withMessage(`${fieldName} must be one of: ${allowed.join(', ')}`),
];

module.exports = {
  validateUuidParam,
  validateIntParam,
  validateRequiredString,
  validateAllowedValues,
};
