// src/utils/visibility.js
// PRIVACY RULE: internal technician notes must never be shown to teachers.
// The backend should already remove them; this is a second safety net.
// A comment is shown ONLY if the backend explicitly marks it customer-visible.
// Anything unmarked or unknown is hidden.

export function isCustomerVisible(item) {
  if (!item || typeof item !== 'object') return false;
  if (item.internal === true) return false;
  return item.visibility === 'PUBLIC' || item.public === true || item.customerVisible === true;
}

export function customerVisibleOnly(list) {
  return Array.isArray(list) ? list.filter(isCustomerVisible) : [];
}
