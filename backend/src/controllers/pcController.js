/**
 * CampusCare PC & Location Controller
 * Handles HTTP requests and delegates to pcService
 */
const pcService = require('../services/pcService');

/**
 * GET /api/blocks (or /api/locations/blocks)
 * Fetch list of campus blocks
 */
const getBlocks = async (req, res, next) => {
  try {
    const blocks = await pcService.getBlocks();
    return res.status(200).json({
      success: true,
      items: blocks,
      blocks, // Alias for direct array unpacking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/labs (or /api/locations/blocks/:blockId/rooms)
 * Fetch list of laboratories / rooms, optionally filtered by block
 */
const getLabs = async (req, res, next) => {
  try {
    const blockId = req.params.blockId || req.query.blockId || null;
    const labs = await pcService.getLabs(blockId);
    return res.status(200).json({
      success: true,
      items: labs,
      labs,
      rooms: labs, // Alias for Member 1 compatibility
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/pcs (or /api/locations/rooms/:roomId/pcs)
 * Fetch PCs filtered by lab/room, block, or status
 */
const getPcs = async (req, res, next) => {
  try {
    const labId = req.params.roomId || req.params.labId || req.query.labId || req.query.roomId || null;
    const blockId = req.params.blockId || req.query.blockId || null;
    const status = req.query.status || null;

    const pcs = await pcService.getPcs({ labId, blockId, status });
    return res.status(200).json({
      success: true,
      items: pcs,
      pcs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/pcs/:id
 * Fetch details of a single PC
 */
const getPcById = async (req, res, next) => {
  try {
    const pcId = req.params.id || req.params.pcId;
    const pc = await pcService.getPcById(pcId);
    return res.status(200).json({
      success: true,
      pc,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/pcs/qr/:token (or /api/pcs/lookup/:token)
 * Lookup PC by QR token scanned from physical sticker
 */
const getPcByQrToken = async (req, res, next) => {
  try {
    const token = req.params.token;
    const pc = await pcService.getPcByQrToken(token);
    return res.status(200).json({
      success: true,
      pc,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/pcs/:id/active-tickets
 * Fetch active tickets on a specific PC with teacher privacy filters
 */
const getActiveTickets = async (req, res, next) => {
  try {
    const pcId = req.params.id || req.params.pcId;
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;

    const tickets = await pcService.getActiveTicketsForPc(pcId, currentUserId, userRole);
    return res.status(200).json({
      success: true,
      items: tickets,
      tickets,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBlocks,
  getLabs,
  getPcs,
  getPcById,
  getPcByQrToken,
  getActiveTickets,
};
