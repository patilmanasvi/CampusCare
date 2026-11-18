// src/components/common/ErrorBoundary.jsx
// Catches unexpected rendering errors so one broken page doesn't blank the app.
import React from 'react';
import { TriangleAlert } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('UI error:', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
        <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300">
          <TriangleAlert size={22} aria-hidden="true" />
        </span>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Something went wrong on this page</h1>
        <p className="mt-2 text-sm muted">Try reloading. If it keeps happening, let the project team know.</p>
        <button type="button" className="btn-primary mt-5" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </div>
    );
  }
}
