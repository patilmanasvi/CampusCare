/**
 * CampusCare Dashboard Controller
 * Handles HTTP requests for dashboard metrics and recent submissions
 */
const dashboardService = require('../services/dashboardService');

/**
 * GET /api/dashboard/summary & GET /api/teacher/dashboard/summary
 * Returns aggregated ticket statistics
 */
const getSummary = async (req, res, next) => {
  try {
    const summary = await dashboardService.getSummary(req.user.id, req.user.role);

    return res.status(200).json({
      success: true,
      message: 'Dashboard summary retrieved successfully.',
      data: summary,
      ...summary, // Flat mapping for Member 1 frontend compatibility
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/recent-requests & GET /api/teacher/dashboard/recent-requests
 * Returns recent ticket requests
 */
const getRecentRequests = async (req, res, next) => {
  try {
    const limit = req.query.limit || 5;
    const items = await dashboardService.getRecentRequests(req.user.id, req.user.role, limit);

    return res.status(200).json({
      success: true,
      message: 'Recent requests retrieved successfully.',
      data: items,
      items, // Alias for Member 1 compatibility
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  getRecentRequests,
};
