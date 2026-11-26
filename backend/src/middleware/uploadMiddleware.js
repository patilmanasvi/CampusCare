/**
 * CampusCare Secure Upload Middleware
 * Implements strict Multer configuration, MIME-type verification, and path traversal defense
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config/env');

// Base uploads directory located securely in backend
const UPLOAD_ROOT = path.resolve(process.cwd(), config.upload.dir || 'uploads');
const ATTACHMENTS_DIR = path.join(UPLOAD_ROOT, 'attachments');
const AVATARS_DIR = path.join(UPLOAD_ROOT, 'avatars');

// Ensure destination directories exist
fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
fs.mkdirSync(AVATARS_DIR, { recursive: true });

// Allowed MIME types and their validated extensions
const ALLOWED_MIME_TYPES = new Map([
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['image/webp', ['.webp']],
  ['application/pdf', ['.pdf']],
  ['text/plain', ['.txt', '.log']],
]);

/**
 * Validates file extension against its reported MIME type
 */
const isAllowedFile = (mimetype, originalname) => {
  const allowedExtensions = ALLOWED_MIME_TYPES.get(mimetype.toLowerCase());
  if (!allowedExtensions) return false;

  const ext = path.extname(originalname).toLowerCase();
  return allowedExtensions.includes(ext);
};

const hasValidSignature = (file) => {
  const prefix = Buffer.alloc(16);
  const fd = fs.openSync(file.path, 'r');
  let bytesRead;
  try { bytesRead = fs.readSync(fd, prefix, 0, prefix.length, 0); } finally { fs.closeSync(fd); }
  const bytes = prefix.subarray(0, bytesRead);
  switch (file.mimetype.toLowerCase()) {
    case 'image/jpeg': return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'image/png': return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case 'image/webp': return bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    case 'application/pdf': return bytes.toString('ascii', 0, 5) === '%PDF-';
    case 'text/plain': return !bytes.includes(0);
    default: return false;
  }
};

const validateFileContent = (req, res, next) => {
  if (!req.file || hasValidSignature(req.file)) return next();
  try { fs.unlinkSync(req.file.path); } catch (error) {
    console.error(`[Upload Middleware] Could not remove rejected file: ${error.message}`);
  }
  const error = new Error('File contents do not match the declared file type.');
  error.statusCode = 400;
  error.code = 'INVALID_FILE_CONTENT';
  return next(error);
};

/**
 * Storage configuration that sanitizes filenames and prevents path traversal
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Choose appropriate subdirectory
    const isAvatar = file.fieldname === 'avatar';
    const destDir = isAvatar ? AVATARS_DIR : ATTACHMENTS_DIR;
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    // Security: Never trust client originalname directly
    const uniqueId = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/gi, '');
    const safeServerName = `${uniqueId}-${Date.now()}${ext}`;
    cb(null, safeServerName);
  },
});

/**
 * Strict file filter rejecting forbidden extensions and MIME types
 */
const fileFilter = (req, file, cb) => {
  const mimeType = String(file.mimetype || '').toLowerCase();
  if (file.fieldname === 'avatar' && !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    const error = new Error('Profile pictures must be JPEG, PNG, or WebP images.');
    error.statusCode = 400;
    error.code = 'UNSUPPORTED_AVATAR_TYPE';
    return cb(error, false);
  }
  if (!mimeType || !file.originalname || !isAllowedFile(mimeType, file.originalname)) {
    const error = new Error(
      `Unsupported file type: '${file.mimetype}'. Only images (JPEG, PNG, WebP), PDFs, and text/logs are permitted.`
    );
    error.statusCode = 400;
    error.code = 'UNSUPPORTED_FILE_TYPE';
    return cb(error, false);
  }

  // Prevent path traversal attempts in original filename
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    const error = new Error('Invalid characters detected in filename.');
    error.statusCode = 400;
    error.code = 'INVALID_FILENAME';
    return cb(error, false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxSizeBytes, // 10MB
    files: 1,
  },
});

module.exports = {
  upload,
  UPLOAD_ROOT,
  ATTACHMENTS_DIR,
  AVATARS_DIR,
  ALLOWED_MIME_TYPES,
  isAllowedFile,
  hasValidSignature,
  validateFileContent,
};
