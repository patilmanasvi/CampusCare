// src/utils/errors.js
// One error shape for the whole app, whether it came from axios or the mock API.

export class ApiError extends Error {
  constructor(message, { status = 0, code = null, details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const FRIENDLY_BY_STATUS = {
  400: 'Some of the information sent was not valid. Please check and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: 'This was changed by someone else. Refresh and try again.',
  413: 'That file is too large to upload.',
  415: 'That file type is not allowed.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on the server. Please try again shortly.',
  502: 'The server is unavailable right now. Please try again shortly.',
  503: 'The server is unavailable right now. Please try again shortly.',
};

/** Turn an axios error (or anything thrown) into an ApiError with a readable message. */
export function normalizeError(error) {
  if (error instanceof ApiError) return error;

  // axios error with a response from the server
  if (error?.response) {
    const { status, data } = error.response;
    const serverMessage =
      (typeof data === 'string' && data.length < 200 ? data : null) ||
      data?.message ||
      data?.error?.message ||
      (typeof data?.error === 'string' ? data.error : null);
    return new ApiError(serverMessage || FRIENDLY_BY_STATUS[status] || 'Request failed.', {
      status,
      code: data?.code || data?.error?.code || null,
      details: data?.details || data?.errors || null,
    });
  }

  // axios error with no response = network problem / timeout
  if (error?.request || error?.code === 'ECONNABORTED' || error?.code === 'ERR_NETWORK') {
    return new ApiError("Can't reach the server. Check your connection and try again.", {
      status: 0,
      code: 'NETWORK_ERROR',
    });
  }

  return new ApiError(error?.message || 'Something went wrong.', { status: 0 });
}

/** Short message to show in the UI for any error. */
export function getErrorMessage(error, fallback = 'Something went wrong.') {
  if (!error) return fallback;
  return normalizeError(error).message || fallback;
}
