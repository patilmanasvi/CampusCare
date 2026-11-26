/**
 * CampusCare Profile Controller
 * Secure user profile management with strict protection against privilege escalation
 */
const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const { AVATARS_DIR } = require('../middleware/uploadMiddleware');

const removeAvatarFile = (filePath) => {
  if (!filePath) return;
  const resolved = path.resolve(filePath);
  if (resolved.startsWith(`${path.resolve(AVATARS_DIR)}${path.sep}`) && fs.existsSync(resolved) && fs.lstatSync(resolved).isFile()) {
    fs.unlinkSync(resolved);
  }
};

// Explicitly protected fields that teachers/users are strictly forbidden from modifying
const FORBIDDEN_PROFILE_FIELDS = [
  'id',
  'email',
  'role',
  'role_id',
  'roleId',
  'password',
  'password_hash',
  'passwordHash',
  'account_status',
  'accountStatus',
  'created_at',
  'createdAt',
  'avatarUrl',
];

// Permitted editable profile fields
const EDITABLE_FIELDS = ['phone', 'department', 'designation', 'avatar'];

/**
 * Formats user database row into safe profile DTO
 */
const formatProfileDto = (user) => ({
  id: user.id,
  fullName: user.full_name,
  name: user.full_name,
  email: user.email,
  phone: user.phone || null,
  department: user.department || null,
  designation: user.designation || null,
  avatarUrl: user.avatar_url || null,
  role: user.role || 'TEACHER',
  accountStatus: user.account_status,
  editableFields: EDITABLE_FIELDS,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

/**
 * GET /api/profile & GET /api/teacher/profile
 * Retrieves authenticated user's profile
 */
const getProfile = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.email,
        u.full_name,
        u.phone,
        u.department,
        u.designation,
        u.avatar_url,
        u.account_status,
        u.created_at,
        u.updated_at,
        r.name AS role
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
      LIMIT 1
    `;

    const result = await db.query(query, [req.user.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    const profile = formatProfileDto(result.rows[0]);

    return res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully.',
      data: profile,
      profile, // Compatibility with Member 1
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/profile & PATCH /api/teacher/profile
 * Updates permitted profile fields with strict security checks
 */
const updateProfile = async (req, res, next) => {
  try {
    const updates = req.body;

    // 1. Enforce protection against modifying sensitive/privilege fields
    for (const field of FORBIDDEN_PROFILE_FIELDS) {
      if (updates[field] !== undefined) {
        return res.status(403).json({
          success: false,
          message: `Security violation: Modifying the '${field}' field is strictly forbidden.`,
          code: 'PROTECTED_FIELD_MODIFICATION',
          field,
        });
      }
    }

    const phone = updates.phone !== undefined ? String(updates.phone).trim() : null;
    const department = updates.department !== undefined ? String(updates.department).trim() : null;
    const designation = updates.designation !== undefined ? String(updates.designation).trim() : null;

    // 2. Perform parameterized update in PostgreSQL
    const query = `
      UPDATE users
      SET
        phone = COALESCE($1, phone),
        department = COALESCE($2, department),
        designation = COALESCE($3, designation),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const updateRes = await db.query(query, [phone, department, designation, req.user.id]);

    if (updateRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    const updatedRow = {
      ...updateRes.rows[0],
      role: req.user.role,
    };
    const profile = formatProfileDto(updatedRow);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: profile,
      profile,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/profile/avatar & POST /api/teacher/profile/avatar
 * Upload and update teacher avatar image
 */
const uploadAvatar = async (req, res, next) => {
  let oldAvatarPath;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No avatar image file was provided.',
        code: 'FILE_REQUIRED',
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    oldAvatarPath = req.user.avatarUrl;

    const updateQuery = `
      UPDATE users
      SET 
        avatar_url = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const updateRes = await db.query(updateQuery, [avatarUrl, req.user.id]);
    if (updateRes.rowCount === 0) {
      removeAvatarFile(req.file.path);
      return res.status(404).json({ success: false, message: 'User not found.', code: 'USER_NOT_FOUND' });
    }
    const profile = formatProfileDto({ ...updateRes.rows[0], role: req.user.role });
    if (oldAvatarPath && oldAvatarPath !== avatarUrl && oldAvatarPath.startsWith('/uploads/avatars/')) {
      removeAvatarFile(path.join(AVATARS_DIR, path.basename(oldAvatarPath)));
    }

    return res.status(200).json({
      success: true,
      message: 'Avatar uploaded and profile updated successfully.',
      data: profile,
      profile,
    });
  } catch (error) {
    if (req.file?.path) {
      try { removeAvatarFile(req.file.path); } catch (cleanupError) {
        console.error(`[Profile Controller] Could not remove failed avatar upload: ${cleanupError.message}`);
      }
    }
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  formatProfileDto,
  FORBIDDEN_PROFILE_FIELDS,
  EDITABLE_FIELDS,
};
