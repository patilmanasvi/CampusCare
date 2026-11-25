// src/services/uploadService.js
// File limits (size, types, count) are decided and enforced by the backend.
// The UI reads them from getConfig() and never invents its own maximum.
import api from './api';
import { ENDPOINTS } from './endpoints';
import { USE_MOCK_API } from '../config/env';
import { mockUploadService } from '../mock/uploadService';
import { normalizeAttachment } from '../utils/backendUrl';

const realUploadService = {
  /** Expected: { maxFileSizeBytes?, maxFiles?, acceptedMimeTypes?: string[] } */
  async getConfig() {
    const { data } = await api.get(ENDPOINTS.uploads.config);
    return data;
  },
  /** Uploads one file. Returns the stored attachment: { id, name, mimeType, size, url } */
  async uploadFile(file, { onProgress } = {}) {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post(ENDPOINTS.uploads.upload, form, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return normalizeAttachment(data?.attachment ?? data);
  },
};

export const uploadService = USE_MOCK_API ? mockUploadService : realUploadService;
