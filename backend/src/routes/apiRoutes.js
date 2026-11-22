const express = require('express');
const router = express.Router();
const healthRoutes = require('./healthRoutes');

// Mount sub-routes under /api
router.use('/health', healthRoutes);

// Root API information
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to CampusCare API - College Lab IT Support System',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/api/health',
    },
  });
});

module.exports = router;
