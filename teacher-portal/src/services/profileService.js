// src/services/profileService.js
import api from './api';
import { ENDPOINTS } from './endpoints';
import { USE_MOCK_API } from '../config/env';
import { mockProfileService } from '../mock/profileService';

// Expected profile: { id, fullName, email, phone, department, designation,
//                     avatarUrl, editableFields: ['phone', 'avatar', ...] }
const realProfileService = {
  async getProfile() {
    const { data } = await api.get(ENDPOINTS.profile.get);
    return data?.profile ?? data;
  },
  async updateProfile(changes) {
    const { data } = await api.patch(ENDPOINTS.profile.update, changes);
    return data?.profile ?? data;
  },
  async uploadAvatar(file, { onProgress } = {}) {
    const form = new FormData();
    form.append('avatar', file);
    const { data } = await api.post(ENDPOINTS.profile.avatar, form, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return data?.profile ?? data;
  },
};

export const profileService = USE_MOCK_API ? mockProfileService : realProfileService;
