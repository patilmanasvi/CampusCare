// src/components/layout/Sidebar.jsx
// Desktop: fixed column. Mobile/tablet: slide-in drawer opened from the header.
import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import { NAV_ITEMS } from './navItems';
import { useNotifications } from '../../context/NotificationContext';
import collegeLogo from '../../assets/college-logo.jpeg';

function NavList({ onNavigate, onLogout }) {
  const { unreadCount } = useNotifications();
  return (
    <ul className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map(({ to, label, icon: Icon, showUnread }) => (
        <li key={to}>
          <NavLink
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-700 hover:bg-primary-50 hover:text-primary-800 dark:text-gray-200 dark:hover:bg-dark-raised dark:hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {showUnread && unreadCount > 0 && (
                  <span
                    className={`min-w-[22px] rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold ${
                      isActive ? 'bg-white text-primary' : 'bg-primary text-white'
                    }`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                    <span className="sr-only"> unread</span>
                  </span>
                )}
              </>
            )}
          </NavLink>
        </li>
      ))}
      <li className="mt-2 border-t border-gray-200 pt-2 dark:border-dark-border">
        <button
          type="button"
          onClick={onLogout}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-dark-raised"
        >
          <LogOut size={18} aria-hidden="true" />
          Logout
        </button>
      </li>
    </ul>
  );
}

export default function Sidebar({ mobileOpen, onCloseMobile, onLogout }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onCloseMobile();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {/* Desktop */}
      <nav
        aria-label="Main"
        className="hidden w-64 shrink-0 overflow-y-auto border-r border-gray-200 bg-white lg:block dark:border-dark-border dark:bg-dark-surface"
      >
        <NavList onLogout={onLogout} />
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={onCloseMobile} />
          <nav
            aria-label="Main"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-pop dark:bg-dark-surface"
          >
            <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-dark-border">
              <img src={collegeLogo} alt="College logo" className="h-9 w-auto object-contain" />
              <button ref={closeRef} type="button" className="icon-btn" onClick={onCloseMobile} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavList onNavigate={onCloseMobile} onLogout={onLogout} />
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
