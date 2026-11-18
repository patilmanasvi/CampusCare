// src/constants/categoryIcons.js
// Icons for issue categories. Categories themselves come from the backend;
// this only maps a known `code` to an icon and falls back for anything new.
import { Zap, Monitor, Keyboard, Wifi, AppWindow, Printer, CircleHelp } from 'lucide-react';

const ICONS = {
  POWER: Zap,
  DISPLAY: Monitor,
  INPUT: Keyboard,
  NETWORK: Wifi,
  SOFTWARE: AppWindow,
  PERIPHERAL: Printer,
  OTHER: CircleHelp,
};

export function getCategoryIcon(code) {
  return ICONS[code] || CircleHelp;
}
