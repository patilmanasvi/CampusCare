/**
 * CampusCare Dashboard Routes
 * Mounts endpoints for dashboard metrics and recent requests
 */
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { query } = require('express-validator');

const limitRules = [query('limit').optional().toInt().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50')];

router.get('/summary', authenticate, dashboardController.getSummary);
router.get('/recent-requests', authenticate, validate(limitRules), dashboardController.getRecentRequests);

module.exports = router;
