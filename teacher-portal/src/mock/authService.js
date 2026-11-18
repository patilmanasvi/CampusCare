// src/mock/authService.js
// Mock authentication — development only. Real authentication and password
// security belong to the backend (Member 2). Accounts are created/approved by
// an administrator; there is no sign-up here.
import { delay, getDb, mockError, teacherDto, currentTeacher } from './db';

export const mockAuthService = {
  async login({ email, password }) {
    await delay();
    const db = getDb();
    const teacher = db.teachers.find((t) => t.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!teacher || teacher.password !== password) {
      throw mockError(401, 'Incorrect email or password.', 'INVALID_CREDENTIALS');
    }
    if (teacher.accountStatus === 'PENDING') {
      throw mockError(403, 'Your account is waiting for administrator approval.', 'ACCOUNT_PENDING');
    }
    if (teacher.accountStatus !== 'ACTIVE') {
      throw mockError(403, 'Your account is not active. Please contact the lab administrator.', 'ACCOUNT_INACTIVE');
    }
    return { token: `mock-token-${teacher.id}`, teacher: teacherDto(teacher) };
  },

  async logout() {
    await delay(150);
  },

  async getCurrentUser() {
    await delay(200);
    return teacherDto(currentTeacher());
  },
};
