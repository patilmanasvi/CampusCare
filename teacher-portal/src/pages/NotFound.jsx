// src/pages/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { EmptyState } from '../components/common/States';

export default function NotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Page not found"
      description="The page you're looking for doesn't exist."
      action={
        <Link to="/dashboard" className="btn-primary">
          Go to dashboard
        </Link>
      }
    />
  );
}
