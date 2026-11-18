// src/mock/profileService.js
// Mock profile API. The backend decides which fields a teacher may edit
// (editableFields). Email and identity can never be changed from here.
import { delay, getDb, saveDb, mockError, currentTeacher, teacherDto } from './db';

const EDITABLE_FIELDS = ['phone', 'avatar'];
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const profileDto = (t) => ({ ...teacherDto(t), editableFields: EDITABLE_FIELDS });

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const mockProfileService = {
  async getProfile() {
    await delay();
    return profileDto(currentTeacher());
  },

  async updateProfile(changes = {}) {
    await delay(600);
    const me = currentTeacher();
    const blocked = Object.keys(changes).filter((k) => !EDITABLE_FIELDS.includes(k));
    if (blocked.length) throw mockError(403, `These fields can't be changed: ${blocked.join(', ')}.`);
    if ('phone' in changes) {
      const phone = String(changes.phone || '').trim();
      if (phone && !/^\+?[0-9\s-]{7,15}$/.test(phone)) throw mockError(400, 'Please enter a valid contact number.');
      me.phone = phone;
    }
    saveDb();
    return profileDto(me);
  },

  async uploadAvatar(file, { onProgress } = {}) {
    const me = currentTeacher();
    if (!AVATAR_TYPES.includes(file.type)) throw mockError(415, 'Please choose a JPG, PNG or WebP image.');
    if (file.size > AVATAR_MAX_BYTES) throw mockError(413, 'That image is too large. Please choose a smaller one.');
    for (let p = 25; p <= 100; p += 25) {
      // eslint-disable-next-line no-await-in-loop
      await delay(150);
      if (onProgress) onProgress(p);
    }
    // Small images are kept as data URLs so they survive a reload in mock mode.
    me.avatarUrl = file.size < 300 * 1024 ? await readAsDataUrl(file) : URL.createObjectURL(file);
    saveDb();
    const t = getDb().teachers.find((x) => x.id === me.id);
    return profileDto(t);
  },
};
