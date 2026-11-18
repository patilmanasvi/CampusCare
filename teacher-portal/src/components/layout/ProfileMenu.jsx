// src/components/layout/ProfileMenu.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../profile/Avatar';

export default function ProfileMenu({ onLogout }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const name = user?.fullName || user?.name || 'Teacher';

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md p-1 pr-2 hover:bg-gray-100 dark:hover:bg-dark-raised"
      >
        <Avatar name={name} src={user?.avatarUrl} size="sm" />
        <span className="hidden max-w-[160px] truncate text-sm font-medium text-gray-800 md:block dark:text-gray-100">
          {name}
        </span>
        <ChevronDown size={16} className="hidden text-gray-500 md:block" aria-hidden="true" />
        <span className="sr-only md:hidden">Account menu</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-40 w-60 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-pop dark:border-dark-border dark:bg-dark-surface"
        >
          <div className="border-b border-gray-200 px-4 py-3 dark:border-dark-border">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
            <p className="truncate text-xs muted">{user?.email}</p>
          </div>
          <Link
            role="menuitem"
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-dark-raised"
          >
            <User size={16} aria-hidden="true" /> My profile
          </Link>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-dark-raised"
          >
            <LogOut size={16} aria-hidden="true" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
