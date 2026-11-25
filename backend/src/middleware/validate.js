/**
 * CampusCare Validation Runner Middleware
 * Integrates express-validator with a standardized JSON error response
 */
const { validationResult } = require('express-validator');

/**
 * Executes an array of express-validator validation chains
 * Returns 400 Bad Request if any validation rule fails
 *
 * @param {Array} validations - Array of validation chains
 * @returns {Function} Express middleware function
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Execute all validation chains on the request
    if (Array.isArray(validations)) {
      await Promise.all(validations.map((validation) => validation.run(req)));
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors into a consistent structure
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param || 'unknown',
      message: err.msg,
      // Never reflect back raw passwords in validation errors
      ...(err.path !== 'password' && err.path !== 'newPassword' && { value: err.value }),
    }));

    return res.status(400).json({
      success: false,
      message: formattedErrors[0]?.message || 'Input validation failed',
      code: 'VALIDATION_ERROR',
      errors: formattedErrors,
    });
  };
};

module.exports = validate;
