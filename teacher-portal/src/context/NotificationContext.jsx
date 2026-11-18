// src/context/NotificationContext.jsx
// Unread count + latest notifications for the header bell, refreshed on a timer.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { notificationService } from '../services/notificationService';
import { NOTIFICATION_POLL_MS } from '../config/env';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(undefined);
const PREVIEW_SIZE = 5;

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [recent, setRecent] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.list({ page: 1, pageSize: PREVIEW_SIZE });
      setRecent(data?.items || []);
      setUnreadCount(
        typeof data?.unreadCount === 'number' ? data.unreadCount : await notificationService.getUnreadCount()
      );
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setRecent([]);
      setUnreadCount(0);
      return undefined;
    }
    refresh();
    if (!NOTIFICATION_POLL_MS) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, NOTIFICATION_POLL_MS);
    return () => clearInterval(timer);
  }, [isAuthenticated, refresh]);

  const markRead = useCallback(async (id) => {
    setRecent((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await notificationService.markRead(id);
    setUnreadCount(await notificationService.getUnreadCount());
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationService.markAllRead();
    setRecent((list) => list.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const value = useMemo(
    () => ({ recent, unreadCount, loading, error, refresh, markRead, markAllRead }),
    [recent, unreadCount, loading, error, refresh, markRead, markAllRead]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
