const { body } = require('express-validator');

const updateProfileRules = [
  body().custom((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    const allowed = ['phone', 'department', 'designation'];
    const protectedFields = ['id', 'email', 'role', 'role_id', 'roleId', 'password', 'password_hash', 'passwordHash', 'account_status', 'accountStatus', 'created_at', 'createdAt', 'avatarUrl'];
    return keys.length > 0 && keys.every((key) => allowed.includes(key) || protectedFields.includes(key));
  }).withMessage('Provide one or more supported profile fields'),
  body('phone').optional({ nullable: true }).isString().trim().isLength({ max: 25 })
    .matches(/^\+?[0-9\s-]*$/).withMessage('phone may contain digits, spaces, +, or -'),
  body('department').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
  body('designation').optional({ nullable: true }).isString().trim().isLength({ max: 100 }),
];

module.exports = { updateProfileRules };
