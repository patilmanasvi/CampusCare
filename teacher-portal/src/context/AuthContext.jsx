// src/context/AuthContext.jsx
// Holds the signed-in teacher. It only talks to authService, so swapping
// the mock for Member 2's real authentication needs no changes here.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { setUnauthorizedHandler } from '../services/api';
import { tokenStorage } from '../utils/tokenStorage';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // 'checking' while we restore a previous session on page load
  const [status, setStatus] = useState('checking');

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    setStatus('signedOut');
  }, []);

  // Restore the session after a page refresh.
  useEffect(() => {
    let active = true;
    authService
      .getCurrentUser()
      .then((teacher) => {
        if (!active) return;
        setUser(teacher);
        setStatus('signedIn');
      })
      .catch(() => {
        if (!active) return;
        tokenStorage.clear();
        setUser(null);
        setStatus('signedOut');
      });
    return () => {
      active = false;
    };
  }, []);

  // Any 401 from the real API signs the teacher out.
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = useCallback(async (email, password) => {
    const result = await authService.login({ email: email.trim(), password });
    if (result?.token) tokenStorage.set(result.token);
    const teacher = result?.teacher ?? (await authService.getCurrentUser());
    setUser(teacher);
    setStatus('signedIn');
    return teacher;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Even if the server call fails, sign out locally.
    }
    clearSession();
  }, [clearSession]);

  const updateUser = useCallback((changes) => {
    setUser((prev) => (prev ? { ...prev, ...changes } : prev));
  }, []);

  const value = useMemo(
    () => ({ user, status, isAuthenticated: status === 'signedIn', login, logout, updateUser }),
    [user, status, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
