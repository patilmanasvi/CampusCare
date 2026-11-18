// src/components/layout/Header.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Menu } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import NotificationBell from '../notifications/NotificationBell';
import ProfileMenu from './ProfileMenu';
import collegeLogo from '../../assets/college-logo.jpeg';

export default function Header({ onOpenMenu, onLogout }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="relative z-30 shrink-0 border-b border-gray-200 bg-white dark:border-dark-border dark:bg-dark-surface">
      <div className="h-1 bg-primary" aria-hidden="true" />
      <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button type="button" className="icon-btn lg:hidden" onClick={onOpenMenu} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3 rounded">
            {/* Logo keeps its aspect ratio: fixed height, automatic width. */}
            <span className="rounded bg-white p-0.5">
              <img src={collegeLogo} alt="College logo" className="h-9 w-auto object-contain sm:h-10" />
            </span>
            <span className="hidden h-8 w-px bg-gray-200 sm:block dark:bg-dark-border" aria-hidden="true" />
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-sm font-semibold leading-tight text-gray-900 dark:text-white">
                CampusCare
              </span>
              <span className="block truncate text-xs leading-tight text-primary dark:text-primary-300">
                Teacher Portal
              </span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="icon-btn"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title={theme === 'light' ? 'Dark mode' : 'Light mode'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <NotificationBell />
          <ProfileMenu onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}
