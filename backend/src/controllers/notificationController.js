/**
 * CampusCare Notification Controller
 * Manages in-app notifications with strict ownership isolation
 */
const db = require('../config/db');

/**
 * GET /api/notifications & GET /api/teacher/notifications
 * Lists notifications for the authenticated user
 */
const listNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const unreadOnly = req.query.unreadOnly === 'true';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 15));
    const offset = (page - 1) * pageSize;

    const conditions = ['recipient_id = $1'];
    const params = [userId];

    if (unreadOnly) {
      conditions.push('is_read = false');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // 1. Total matching count
    const countRes = await db.query(`SELECT COUNT(*) AS total FROM notifications ${whereClause}`, params);
    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    // 2. Unread count (always returned for badge)
    const unreadRes = await db.query(
      'SELECT COUNT(*) AS unread FROM notifications WHERE recipient_id = $1 AND is_read = false',
      [userId]
    );
    const unreadCount = parseInt(unreadRes.rows[0]?.unread || 0, 10);

    // 3. Paginated notifications
    const query = `
      SELECT 
        id,
        ticket_id,
        type,
        title,
        message,
        is_read,
        read_at,
        created_at
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const dataRes = await db.query(query, [...params, pageSize, offset]);

    const items = dataRes.rows.map((row) => ({
      id: row.id,
      ticketId: row.ticket_id,
      type: row.type,
      title: row.title,
      message: row.message,
      isRead: row.is_read,
      readAt: row.read_at,
      createdAt: row.created_at,
    }));

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully.',
      items,
      total,
      unreadCount,
      page,
      pageSize,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/unread-count & GET /api/teacher/notifications/unread-count
 * Returns count of unread notifications
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE recipient_id = $1 AND is_read = false',
      [req.user.id]
    );
    const count = parseInt(result.rows[0]?.count || 0, 10);

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read (also supports POST)
 * Marks a single notification as read (strictly owned by caller)
 */
const markRead = async (req, res, next) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const query = `
      UPDATE notifications
      SET 
        is_read = true,
        read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND recipient_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [notificationId, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied.',
        code: 'NOTIFICATION_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/read-all (also supports POST)
 * Marks all notifications belonging to the user as read
 */
const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const query = `
      UPDATE notifications
      SET 
        is_read = true,
        read_at = CURRENT_TIMESTAMP
      WHERE recipient_id = $1 AND is_read = false
    `;

    const result = await db.query(query, [userId]);

    return res.status(200).json({
      success: true,
      message: `All notifications marked as read (${result.rowCount} updated).`,
      updatedCount: result.rowCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
};
