// src/components/layout/Layout.jsx
import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import ConfirmDialog from '../common/ConfirmDialog';
import ErrorBoundary from '../common/ErrorBoundary';
import LoadingSpinner from '../common/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Close the mobile drawer whenever the page changes.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const askLogout = useCallback(() => {
    setMenuOpen(false);
    setConfirmLogout(true);
  }, []);

  const doLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    setConfirmLogout(false);
    toast.info('You have been signed out.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-[100dvh] flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
      <Header onOpenMenu={() => setMenuOpen(true)} onLogout={askLogout} />
      <div className="flex min-h-0 flex-1">
        <Sidebar mobileOpen={menuOpen} onCloseMobile={closeMenu} onLogout={askLogout} />
        <main id="main-content" className="min-w-0 flex-1 overflow-y-auto" tabIndex={-1}>
          <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
            <ErrorBoundary resetKey={location.pathname}>
              <Suspense fallback={<LoadingSpinner label="Loading page…" />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Log out?"
        description="You'll need to sign in again to report or track issues."
        confirmLabel="Log out"
        loading={loggingOut}
        onConfirm={doLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}
