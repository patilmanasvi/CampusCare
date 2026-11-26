const express = require('express');
const router = express.Router();

const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const pcRoutes = require('./pcRoutes');
const ticketRoutes = require('./ticketRoutes');
const categoryRoutes = require('./categoryRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const profileRoutes = require('./profileRoutes');
const notificationRoutes = require('./notificationRoutes');
const uploadRoutes = require('./uploadRoutes');
const jiraRoutes = require('./jiraRoutes');

const pcController = require('../controllers/pcController');
const { authenticate } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { param } = require('express-validator');

const locationParamRules = (name) => [param(name).matches(/^[a-zA-Z0-9_-]{1,50}$/).withMessage(`Invalid ${name}`)];

// Mount sub-routes under /api
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/pcs', pcRoutes);
router.use('/tickets', ticketRoutes);
router.use('/categories', categoryRoutes);
router.use('/issue-categories', categoryRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/profile', profileRoutes);
router.use('/notifications', notificationRoutes);
router.use('/uploads', uploadRoutes);
router.use('/jira', jiraRoutes);

// Direct Location APIs specified in Task A
router.get('/blocks', authenticate, pcController.getBlocks);
router.get('/labs', authenticate, pcController.getLabs);

// Location endpoint aliases for Member 1 (Teacher Portal) compatibility
router.get('/locations/blocks', authenticate, pcController.getBlocks);
router.get('/locations/blocks/:blockId/rooms', authenticate, validate(locationParamRules('blockId')), pcController.getLabs);
router.get('/locations/rooms/:roomId/pcs', authenticate, validate(locationParamRules('roomId')), pcController.getPcs);

// Teacher portal aliases for Member 1 compatibility
router.use('/teacher/tickets', ticketRoutes);
router.use('/teacher/dashboard', dashboardRoutes);
router.use('/teacher/profile', profileRoutes);
router.use('/teacher/notifications', notificationRoutes);

// Root API information
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to CampusCare API - College Lab IT Support System',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/api/health',
      auth: {
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
      },
      inventory: {
        blocks: 'GET /api/blocks',
        labs: 'GET /api/labs',
        pcs: 'GET /api/pcs',
        pcDetail: 'GET /api/pcs/:id',
        pcQrLookup: 'GET /api/pcs/qr/:token',
        pcActiveTickets: 'GET /api/pcs/:id/active-tickets',
      },
      tickets: {
        create: 'POST /api/tickets',
        list: 'GET /api/tickets/my',
        detail: 'GET /api/tickets/:id',
        duplicateCheck: 'GET /api/tickets/check-duplicate',
        timeline: 'GET /api/tickets/:id/timeline',
        addComment: 'POST /api/tickets/:id/comments',
        addInformation: 'POST /api/tickets/:id/information',
        verification: 'POST /api/tickets/:id/verification',
      },
      dashboard: {
        summary: 'GET /api/dashboard/summary',
        recentRequests: 'GET /api/dashboard/recent-requests',
      },
      profile: {
        get: 'GET /api/profile',
        update: 'PATCH /api/profile',
        avatar: 'POST /api/profile/avatar',
      },
      notifications: {
        list: 'GET /api/notifications',
        unreadCount: 'GET /api/notifications/unread-count',
        markRead: 'PATCH /api/notifications/:id/read',
        markAllRead: 'PATCH /api/notifications/read-all',
      },
      uploads: {
        config: 'GET /api/uploads/config',
        upload: 'POST /api/uploads',
        download: 'GET /api/uploads/:id',
      },
    },
  });
});

module.exports = router;
