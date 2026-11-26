/**
 * CampusCare Upload Routes
 * Endpoints for upload configurations, file uploads, and authorized downloads
 */
const express = require('express');
const router = express.Router();

const uploadController = require('../controllers/uploadController');
const { upload, validateFileContent } = require('../middleware/uploadMiddleware');
const { authenticate } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { param } = require('express-validator');

const attachmentIdRules = [param('id').matches(/^att-[a-z0-9-]{4,60}$/i).withMessage('Invalid attachment ID')];

/**
 * Public/Teacher configuration endpoint
 */
router.get('/config', uploadController.getConfig);

/**
 * Authenticated file upload
 */
router.post('/', authenticate, upload.single('file'), validateFileContent, uploadController.uploadFile);

/**
 * Secure file download (authenticated)
 */
router.get('/:id', authenticate, validate(attachmentIdRules), uploadController.downloadFile);
router.get('/file/:id', authenticate, validate(attachmentIdRules), uploadController.downloadFile);

module.exports = router;
