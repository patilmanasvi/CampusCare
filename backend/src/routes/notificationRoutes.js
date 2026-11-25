/**
 * CampusCare Notification Routes
 * Endpoints for notification lists, unread counters, and status updates
 */
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { param, query } = require('express-validator');

const notificationIdRules = [param('id').isUUID().withMessage('Notification ID must be a UUID')];
const listRules = [
  query('unreadOnly').optional().isBoolean().withMessage('unreadOnly must be true or false'),
  query('page').optional().toInt().isInt({ min: 1, max: 100000 }),
  query('pageSize').optional().toInt().isInt({ min: 1, max: 50 }),
];

// Unread count
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

// Mark all as read (supports both PATCH and POST for frontend flexibility)
router.patch('/read-all', authenticate, notificationController.markAllRead);
router.post('/read-all', authenticate, notificationController.markAllRead);

// Mark single notification as read
router.patch('/:id/read', authenticate, validate(notificationIdRules), notificationController.markRead);
router.post('/:id/read', authenticate, validate(notificationIdRules), notificationController.markRead);

// List notifications
router.get('/', authenticate, validate(listRules), notificationController.listNotifications);

module.exports = router;
