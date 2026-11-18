// src/mock/authService.js
/**
 * Mock authentication service.
 * In production this will call the real backend (Member 2).
 */
export const mockAuthService = {
  /** Simulate login */
  async login({ email, password }) {
    // simple hard‑coded credentials
    if (email === 'teacher@college.edu' && password === 'password123') {
      return {
        token: 'mock-token-123',
        teacher: {
          id: 't1',
          name: 'John Doe',
          email,
          department: 'Computer Science',
          designation: 'Assistant Professor',
        },
      };
    }
    throw new Error('Invalid credentials');
  },

  /** Return the currently “logged‑in” teacher (mocked) */
  async getCurrentUser() {
    // In a real app we would read the token from storage and call /auth/me
    return {
      id: 't1',
      name: 'John Doe',
      email: 'teacher@college.edu',
      department: 'Computer Science',
      designation: 'Assistant Professor',
    };
  },
};
