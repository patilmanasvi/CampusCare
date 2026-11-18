// src/routes/AppRoutes.jsx
import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ProtectedRoute from './ProtectedRoute';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Pages load on demand so the first screen (login) stays small.
const Login = lazy(() => import('../pages/Login'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const ScanQR = lazy(() => import('../pages/ScanQR'));
const SelectPC = lazy(() => import('../pages/SelectPC'));
const PcInfo = lazy(() => import('../pages/PcInfo'));
const ReportIssue = lazy(() => import('../pages/ReportIssue'));
const MyRequests = lazy(() => import('../pages/MyRequests'));
const TicketDetails = lazy(() => import('../pages/TicketDetails'));
const Notifications = lazy(() => import('../pages/Notifications'));
const Profile = lazy(() => import('../pages/Profile'));
const NotFound = lazy(() => import('../pages/NotFound'));

export default function AppRoutes() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="scan-qr" element={<ScanQR />} />
          <Route path="select-pc" element={<SelectPC />} />
          <Route path="pcs/:pcId" element={<PcInfo />} />
          <Route path="report-issue" element={<ReportIssue />} />
          <Route path="my-requests" element={<MyRequests />} />
          <Route path="my-requests/:ticketId" element={<TicketDetails />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
