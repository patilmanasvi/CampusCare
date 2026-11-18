// src/components/layout/navItems.js
import { Home, QrCode, FilePlus2, ClipboardList, Bell, User } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/scan-qr', label: 'Scan QR', icon: QrCode },
  { to: '/report-issue', label: 'Report an Issue', icon: FilePlus2 },
  { to: '/my-requests', label: 'My Requests', icon: ClipboardList },
  { to: '/notifications', label: 'Notifications', icon: Bell, showUnread: true },
  { to: '/profile', label: 'Profile', icon: User },
];
