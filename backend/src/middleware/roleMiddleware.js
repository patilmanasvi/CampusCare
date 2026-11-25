/**
 * CampusCare Role-Based Access Control (RBAC) Middleware
 * Enforces role restrictions for Teachers, Admins, and IT Support personnel
 */

/**
 * Reusable middleware factory that restricts access to specific institutional roles
 *
 * @param  {...string} allowedRoles - List of permitted roles (e.g. 'TEACHER', 'ADMIN')
 * @returns {import('express').RequestHandler}
 */
const authorizeRoles = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

  return (req, res, next) => {
    // Ensure request has already passed authenticate middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before role verification.',
        code: 'AUTH_REQUIRED',
      });
    }

    const userRole = (req.user.role || '').toUpperCase();

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of the following roles: [${allowedRoles.join(', ')}]. Your current role is '${req.user.role}'.`,
        code: 'FORBIDDEN_ROLE',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Reusable middleware that ensures a user can only access their own resources,
 * unless they are an institutional ADMIN or IT technician.
 *
 * Prevents teachers from viewing or tampering with another teacher's private data.
 *
 * @param {string} paramName - Request parameter containing the target user ID (default 'userId' or 'id')
 */
const requireSelfOrAdmin = (paramName = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'AUTH_REQUIRED',
      });
    }

    const targetUserId = req.params[paramName] || req.body[paramName] || req.query[paramName];
    const userRole = (req.user.role || '').toUpperCase();

    // Admins have campus-wide administrative authorization
    if (userRole === 'ADMIN') {
      return next();
    }

    // Users can only access/modify their own resource ID
    if (targetUserId && String(targetUserId) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view or modify another user\'s private data.',
        code: 'ACCESS_DENIED_NOT_OWNER',
      });
    }

    next();
  };
};

/**
 * Middleware that prevents teachers or regular users from modifying their own roles or privileges
 */
const preventRoleSelfEscalation = (req, res, next) => {
  if (req.body && (req.body.role || req.body.role_id || req.body.roleId)) {
    const userRole = (req.user?.role || '').toUpperCase();
    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot modify your own role or permissions.',
        code: 'ROLE_MODIFICATION_FORBIDDEN',
      });
    }
  }
  next();
};

// Ready-to-use role middleware presets
const requireTeacher = authorizeRoles('TEACHER');
const requireAdmin = authorizeRoles('ADMIN');
const requireAdminOrTechnician = authorizeRoles('ADMIN', 'TECHNICIAN');
const requireStaff = authorizeRoles('TEACHER', 'ADMIN', 'TECHNICIAN', 'LAB_ASSISTANT');

module.exports = {
  authorizeRoles,
  requireSelfOrAdmin,
  preventRoleSelfEscalation,
  requireTeacher,
  requireAdmin,
  requireAdminOrTechnician,
  requireStaff,
};
