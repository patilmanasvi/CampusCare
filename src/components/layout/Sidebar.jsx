// src/components/layout/Sidebar.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, QrCode, AlertCircle, List, Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/scan-qr', label: 'Scan QR', icon: QrCode },
  { to: '/report-issue', label: 'Report Issue', icon: AlertCircle },
  { to: '/my-requests', label: 'My Requests', icon: List },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="w-48 shrink-0 overflow-y-auto bg-white shadow-md dark:bg-dark-bg">
      <ul className="flex flex-col space-y-1 p-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  isActive ? 'bg-primary text-white' : 'text-gray-900 dark:text-gray-200'
                }`
              }
            >
              <Icon size={18} className="mr-2" />
              {label}
            </NavLink>
          </li>
        ))}
        <li>
          <button
            onClick={handleLogout}
            className="flex w-full items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-200"
          >
            <LogOut size={18} className="mr-2" />
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
}
