// src/components/tickets/AttachmentList.jsx
// Shows attachments returned by the backend (already uploaded).
import React from 'react';
import { FileText, Film, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { formatFileSize } from '../../utils/format';

function iconFor(mime = '') {
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.startsWith('video/')) return Film;
  return FileText;
}

export default function AttachmentList({ attachments = [], className = '', singleColumn = false }) {
  if (!attachments.length) return null;
  return (
    <ul className={`grid gap-2 ${singleColumn ? '' : 'sm:grid-cols-2'} ${className}`}>
      {attachments.map((a) => {
        const Icon = iconFor(a.mimeType);
        const isImage = a.mimeType?.startsWith('image/') && a.url;
        const content = (
          <>
            {isImage ? (
              <img src={a.url} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
            ) : (
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-500 dark:bg-dark-surface dark:text-gray-400">
                <Icon size={20} aria-hidden="true" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-gray-800 dark:text-gray-100">{a.name}</span>
              <span className="block text-xs muted">
                {formatFileSize(a.size)}
                {!a.url && ' · Preview not available'}
              </span>
            </span>
            {a.url && <ExternalLink size={16} className="shrink-0 text-gray-400" aria-hidden="true" />}
          </>
        );
        const cls =
          'flex items-center gap-3 rounded-md border border-gray-200 bg-white p-2 dark:border-dark-border dark:bg-dark-raised';
        return (
          <li key={a.id}>
            {a.url ? (
              <a href={a.url} target="_blank" rel="noopener noreferrer" className={`${cls} hover:border-primary-300`}>
                {content}
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <div className={cls}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
