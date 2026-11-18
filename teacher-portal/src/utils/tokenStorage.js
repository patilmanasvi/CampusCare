// src/utils/tokenStorage.js
// Stores the session token if the backend returns one in the login response.
// If Member 2 chooses httpOnly cookies instead, the token will simply be absent
// and the browser sends the cookie automatically (api.js uses withCredentials).
const KEY = 'campuscare_token';

export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      if (token) localStorage.setItem(KEY, token);
    } catch {
      /* storage unavailable */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* storage unavailable */
    }
  },
};
