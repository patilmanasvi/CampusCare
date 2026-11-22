const express = require('express');
const router = express.Router();
const { checkHealth } = require('../controllers/healthController');

// GET /api/health - Health check and database connectivity
router.get('/', checkHealth);

module.exports = router;
