// src/components/profile/Avatar.jsx
import React, { useState } from 'react';
import { initials } from '../../utils/format';

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-24 w-24 text-2xl',
};

export default function Avatar({ name, src, size = 'md', className = '' }) {
  const [broken, setBroken] = useState(false);
  const dims = SIZES[size] || SIZES.md;
  if (src && !broken) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setBroken(true)}
        className={`${dims} shrink-0 rounded-full object-cover ring-1 ring-gray-200 dark:ring-dark-border ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${dims} inline-flex shrink-0 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-800 dark:bg-primary-500/25 dark:text-primary-100 ${className}`}
    >
      {initials(name)}
    </span>
  );
}
