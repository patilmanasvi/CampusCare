/**
 * CampusCare Upload Controller
 * Handles file configuration, upload endpoints, and authorized secure downloads
 */
const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const uploadService = require('../services/uploadService');
const { ALLOWED_MIME_TYPES, ATTACHMENTS_DIR } = require('../middleware/uploadMiddleware');

/**
 * GET /api/uploads/config
 * Returns frontend file configuration parameters
 */
const getConfig = (req, res) => {
  const acceptedMimeTypes = Array.from(ALLOWED_MIME_TYPES.keys());
  const acceptedExtensions = Array.from(ALLOWED_MIME_TYPES.values()).flat();

  return res.status(200).json({
    success: true,
    maxFileSizeBytes: config.upload.maxSizeBytes,
    maxFiles: 5,
    acceptedMimeTypes,
    acceptedExtensions,
  });
};

/**
 * POST /api/uploads
 * Processes uploaded diagnostic attachment and saves metadata
 */
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file was provided in the upload request.',
        code: 'FILE_REQUIRED',
      });
    }

    if (req.body.ticketId || req.body.ticket_id || req.body.commentId || req.body.comment_id) {
      const error = new Error('Attachments are linked to tickets or comments during the corresponding create/update request.');
      error.statusCode = 400;
      error.code = 'ATTACHMENT_LINK_NOT_ALLOWED';
      throw error;
    }

    const attachment = await uploadService.saveAttachment({
      file: req.file,
      uploaderId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Attachment uploaded successfully.',
      data: attachment,
      attachment, // Alias for Member 1 frontend
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/uploads/:id & GET /api/uploads/file/:id
 * Secure authenticated download of attachment
 */
const downloadFile = async (req, res, next) => {
  try {
    const attachmentId = req.params.id;
    const attachment = await uploadService.getAttachmentById(attachmentId);

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found.',
        code: 'ATTACHMENT_NOT_FOUND',
      });
    }

    // Authorization: User must be uploader, ticket reporter, or IT Admin/Technician
    const isUploader = String(attachment.uploader_id) === String(req.user.id);
    const isTicketReporter = attachment.ticket_reporter_id && String(attachment.ticket_reporter_id) === String(req.user.id);
    const isAdmin = ['ADMIN', 'TECHNICIAN', 'LAB_ASSISTANT'].includes(String(req.user.role || '').toUpperCase());

    if (!isUploader && !isTicketReporter && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to access this attachment.',
        code: 'FORBIDDEN_ATTACHMENT_ACCESS',
      });
    }

    // Verify physical file exists on disk
    const filePath = path.resolve(ATTACHMENTS_DIR, path.basename(attachment.file_name));
    if (!filePath.startsWith(`${path.resolve(ATTACHMENTS_DIR)}${path.sep}`)
      || !fs.existsSync(filePath)
      || !fs.lstatSync(filePath).isFile()
      || fs.lstatSync(filePath).isSymbolicLink()) {
      return res.status(404).json({
        success: false,
        message: 'The requested file could not be located on the server storage.',
        code: 'FILE_MISSING_ON_DISK',
      });
    }

    // Serve file with security headers
    res.setHeader('Content-Type', attachment.mime_type);
    const safeName = path.basename(attachment.original_name).replace(/["\\\r\n]/g, '_');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConfig,
  uploadFile,
  downloadFile,
};
