import React from 'react';

export default function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl bg-white p-4 shadow-md dark:bg-dark-bg dark:text-white ${
        onClick ? 'cursor-pointer transition hover:shadow-lg' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}