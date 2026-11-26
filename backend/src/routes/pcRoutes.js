/**
 * CampusCare PC & Location Routes
 * Endpoints for blocks, labs, PC inventory, QR lookups, and active PC tickets
 */
const express = require('express');
const router = express.Router();

const pcController = require('../controllers/pcController');
const { authenticate } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { validateUuidParam } = require('../validators/commonValidator');
const { param, query } = require('express-validator');

// Validates QR token path param
const validateQrParam = [
  param('token')
    .trim()
    .notEmpty()
    .withMessage('QR token parameter is required')
    .isLength({ min: 3, max: 128 })
    .withMessage('Invalid QR token format'),
];

// Validates PC ID parameter
const validatePcId = validateUuidParam('id');
const pcQueryRules = [
  param('roomId').optional().matches(/^[a-zA-Z0-9_-]{1,50}$/),
  query('labId').optional().matches(/^[a-zA-Z0-9_-]{1,50}$/),
  query('blockId').optional().matches(/^[a-zA-Z0-9_-]{1,50}$/),
  query('roomId').optional().matches(/^[a-zA-Z0-9_-]{1,50}$/),
  query('status').optional().trim().toUpperCase().isIn(['WORKING', 'UNDER_MAINTENANCE', 'NOT_IN_SERVICE']),
];

/**
 * @route   GET /api/pcs/qr/:token & /api/pcs/lookup/:token
 * @desc    Find PC using QR token
 * @access  Protected
 */
router.get('/qr/:token', authenticate, validate(validateQrParam), pcController.getPcByQrToken);
router.get('/lookup/:token', authenticate, validate(validateQrParam), pcController.getPcByQrToken);

/**
 * @route   GET /api/pcs/:id/active-tickets
 * @desc    Fetch active tickets for a PC (with teacher privacy protection)
 * @access  Protected
 */
router.get('/:id/active-tickets', authenticate, validate(validatePcId), pcController.getActiveTickets);

/**
 * @route   GET /api/pcs/:id
 * @desc    Fetch detailed information for a single PC
 * @access  Protected
 */
router.get('/:id', authenticate, validate(validatePcId), pcController.getPcById);

/**
 * @route   GET /api/pcs
 * @desc    Fetch all PCs (supports query params: ?labId=...&blockId=...&status=...)
 * @access  Protected
 */
router.get('/', authenticate, validate(pcQueryRules), pcController.getPcs);

module.exports = router;
