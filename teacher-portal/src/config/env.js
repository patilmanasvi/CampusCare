// src/config/env.js
// The ONLY place that reads environment variables. Everything else imports from here.
const env = import.meta.env;

/** Base URL of the Express backend. Set VITE_API_BASE_URL in .env.local. */
export const API_BASE_URL = env.VITE_API_BASE_URL || '/api';

/** true = use the mock API in src/mock, false = call the real backend. Default: mock. */
export const USE_MOCK_API = String(env.VITE_USE_MOCK_API ?? 'true').toLowerCase() !== 'false';

/** Simulated network delay for the mock API (ms). */
export const MOCK_LATENCY_MS = Number(env.VITE_MOCK_LATENCY_MS ?? 400);

/** How often the notification bell refreshes (ms). 0 disables polling. */
export const NOTIFICATION_POLL_MS = Number(env.VITE_NOTIFICATION_POLL_MS ?? 60000);

/** Optional login-screen check, e.g. "college.edu". Empty = any valid email. */
export const COLLEGE_EMAIL_DOMAIN = String(env.VITE_COLLEGE_EMAIL_DOMAIN || '')
  .trim()
  .replace(/^@/, '')
  .toLowerCase();
