// src/mock/uploadService.js
// Mock upload API. The limits below play the role of "limits supplied by the
// backend" — the UI reads them through uploadService.getConfig() and does not
// hard-code any maximum itself. Member 2 decides the real values.
import { delay, getDb, saveDb, mockError, currentTeacher, nextId, blobUrls } from './db';

const MOCK_UPLOAD_CONFIG = {
  maxFileSizeBytes: 10 * 1024 * 1024,
  maxFiles: 5,
  acceptedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ],
};

export const mockUploadService = {
  async getConfig() {
    await delay(150);
    return { ...MOCK_UPLOAD_CONFIG };
  },

  async uploadFile(file, { onProgress } = {}) {
    const me = currentTeacher();
    if (!MOCK_UPLOAD_CONFIG.acceptedMimeTypes.includes(file.type)) {
      await delay(200);
      throw mockError(415, `"${file.name}" is not an allowed file type.`);
    }
    if (file.size > MOCK_UPLOAD_CONFIG.maxFileSizeBytes) {
      await delay(200);
      throw mockError(413, `"${file.name}" is larger than the allowed size.`);
    }

    // Fake progress: bigger files take a little longer.
    const steps = 8;
    const total = Math.min(2000, 500 + file.size / 5000);
    for (let i = 1; i <= steps; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await delay(total / steps);
      if (onProgress) onProgress(Math.round((i / steps) * 100));
    }

    const id = nextId('att');
    getDb().attachments[id] = {
      id,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      url: null,
      ownerId: me.id,
    };
    try {
      blobUrls[id] = URL.createObjectURL(file);
    } catch {
      /* preview not available */
    }
    saveDb();
    return { id, name: file.name, mimeType: file.type, size: file.size, url: blobUrls[id] || null };
  },
};
