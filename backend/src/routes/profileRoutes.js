/**
 * CampusCare Profile Routes
 * Endpoints for viewing and updating teacher/user profile
 */
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/authMiddleware');
const { upload, validateFileContent } = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validate');
const { updateProfileRules } = require('../validators/profileValidator');

router.get('/', authenticate, profileController.getProfile);
router.patch('/', authenticate, validate(updateProfileRules), profileController.updateProfile);
router.post('/avatar', authenticate, upload.single('avatar'), validateFileContent, profileController.uploadAvatar);

module.exports = router;
