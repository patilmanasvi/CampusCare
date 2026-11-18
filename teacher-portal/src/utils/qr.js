// src/utils/qr.js
// A PC's QR code holds a stable token, or a URL that contains the token.
// We never try to read a display code like "522/A/12" out of it:
// the backend resolves the token to the PC's latest details.

/**
 * Extract the QR token from whatever the scanner read.
 * Supports:  "qr-abc123"
 *            "https://host/anything/qr-abc123"
 *            "https://host/scan-qr?token=qr-abc123"  (also ?t= or ?qr=)
 * The exact URL format is decided with Member 4 (QR generation).
 */
export function extractQrToken(raw) {
  const value = String(raw ?? '').trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const fromQuery =
        url.searchParams.get('token') || url.searchParams.get('t') || url.searchParams.get('qr');
      if (fromQuery) return fromQuery.trim();
      const segments = url.pathname.split('/').filter(Boolean);
      return segments.length ? decodeURIComponent(segments[segments.length - 1]) : null;
    } catch {
      return null;
    }
  }

  // Plain token. Reject obviously wrong content (very long text, spaces).
  if (value.length > 256 || /\s/.test(value)) return null;
  return value;
}
