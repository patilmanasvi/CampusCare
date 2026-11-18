import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Bell } from 'lucide-react';
import collegeLogo from '../../assets/college-logo.jpeg';

export default function Header({ unreadCount = 0 }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex shrink-0 items-center justify-between bg-white p-4 shadow-sm dark:bg-dark-bg dark:text-white">
      <div className="flex items-center space-x-2">
        <img src={collegeLogo} alt="College Logo" className="h-8 w-auto object-contain" />
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Teacher Portal</h1>
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <button className="relative p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Notifications">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}