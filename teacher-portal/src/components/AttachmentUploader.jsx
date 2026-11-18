// src/components/AttachmentUploader.jsx
// Drag & drop (desktop), file picker and camera capture (mobile).
// Limits come from the backend via useUploadConfig — no hard-coded maximum.
// Pair with the useAttachments() hook, which holds the files and uploads them.
import React, { useId, useRef, useState } from 'react';
import { Upload, Camera, FileText, Film, Image as ImageIcon, X, CircleAlert, CircleCheck } from 'lucide-react';
import { useUploadConfig } from '../hooks/useUploadConfig';
import { formatFileSize } from '../utils/format';

const DEFAULT_ACCEPT = 'image/*,application/pdf,video/*';

function describeTypes(types) {
  if (!types?.length) return 'Images, PDF and short videos';
  const names = new Set();
  types.forEach((t) => {
    if (t.startsWith('image/')) names.add(t === 'image/*' ? 'images' : t.split('/')[1].toUpperCase().replace('JPEG', 'JPG'));
    else if (t === 'application/pdf') names.add('PDF');
    else if (t.startsWith('video/')) names.add('video');
  });
  return Array.from(names).join(', ');
}

function matchesType(file, types) {
  if (!types?.length) return true;
  return types.some((t) => (t.endsWith('/*') ? file.type.startsWith(t.slice(0, -1)) : file.type === t));
}

function FileIcon({ type }) {
  if (type?.startsWith('video/')) return <Film size={20} aria-hidden="true" />;
  if (type?.startsWith('image/')) return <ImageIcon size={20} aria-hidden="true" />;
  return <FileText size={20} aria-hidden="true" />;
}

export default function AttachmentUploader({ items, onAdd, onRemove, disabled = false, compact = false, label = 'Attachments' }) {
  const { config, error: configError } = useUploadConfig();
  const [dragActive, setDragActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const fileInput = useRef(null);
  const cameraInput = useRef(null);
  const baseId = useId();

  const types = config?.acceptedMimeTypes;
  const maxSize = config?.maxFileSizeBytes;
  const maxFiles = config?.maxFiles;
  const accept = types?.length ? types.join(',') : DEFAULT_ACCEPT;
  const atLimit = maxFiles != null && items.length >= maxFiles;

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const problems = [];
    const ok = [];
    let room = maxFiles != null ? maxFiles - items.length : Infinity;
    files.forEach((f) => {
      if (!matchesType(f, types)) problems.push(`"${f.name}" isn't an accepted file type.`);
      else if (maxSize && f.size > maxSize) problems.push(`"${f.name}" is larger than ${formatFileSize(maxSize)}.`);
      else if (room <= 0) problems.push(`"${f.name}" was not added — you can attach up to ${maxFiles} files.`);
      else {
        ok.push(f);
        room -= 1;
      }
    });
    setMessages(problems);
    if (ok.length) onAdd(ok);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (!disabled) handleFiles(e.dataTransfer?.files);
  };

  const limitsText = [
    describeTypes(types),
    maxSize ? `up to ${formatFileSize(maxSize)} each` : null,
    maxFiles != null ? `max ${maxFiles} files` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div>
      <p className="label" id={`${baseId}-label`}>
        {label} <span className="font-normal muted">(optional)</span>
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !atLimit) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={`rounded-lg border-2 border-dashed text-center transition-colors ${compact ? 'px-4 py-4' : 'px-4 py-6'} ${
          dragActive
            ? 'border-primary bg-primary-50 dark:border-primary-300 dark:bg-primary-500/10'
            : 'border-gray-300 bg-gray-50/60 dark:border-dark-border dark:bg-dark-raised/40'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        {!compact && (
          <Upload size={22} className="mx-auto mb-2 text-gray-400" aria-hidden="true" />
        )}
        <p className="text-sm text-gray-700 dark:text-gray-200">
          <span className="hidden sm:inline">Drag files here, or </span>
          <button
            type="button"
            className="link"
            onClick={() => fileInput.current?.click()}
            disabled={disabled || atLimit}
          >
            choose files
          </button>
          <span className="sm:hidden">
            {' '}
            or{' '}
            <button
              type="button"
              className="link"
              onClick={() => cameraInput.current?.click()}
              disabled={disabled || atLimit}
            >
              <Camera size={14} className="mb-0.5 inline" aria-hidden="true" /> take a photo
            </button>
          </span>
        </p>
        <p className="mt-1 text-xs muted">{limitsText}</p>
        {configError && (
          <p className="mt-1 text-xs muted">File limits couldn't be loaded; files will be checked when uploaded.</p>
        )}
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          aria-labelledby={`${baseId}-label`}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {messages.length > 0 && (
        <ul className="mt-2 space-y-1" role="alert">
          {messages.map((m) => (
            <li key={m} className="field-error mt-0">
              <CircleAlert size={13} aria-hidden="true" /> {m}
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={`relative flex items-center gap-3 overflow-hidden rounded-md border bg-white p-2 dark:bg-dark-raised ${
                item.error ? 'border-red-300 dark:border-red-500/50' : 'border-gray-200 dark:border-dark-border'
              }`}
            >
              {item.previewUrl ? (
                <img src={item.previewUrl} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
              ) : (
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded bg-gray-100 text-gray-500 dark:bg-dark-surface dark:text-gray-400">
                  <FileIcon type={item.file.type} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{item.file.name}</p>
                <p className="text-xs muted">
                  {formatFileSize(item.file.size)}
                  {item.uploaded && (
                    <span className="ml-2 inline-flex items-center gap-1 text-green-700 dark:text-green-300">
                      <CircleCheck size={12} aria-hidden="true" /> Uploaded
                    </span>
                  )}
                </p>
                {item.error && <p className="text-xs font-medium text-red-700 dark:text-red-300">{item.error}</p>}
                {!item.uploaded && item.progress > 0 && item.progress < 100 && (
                  <div
                    className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-border"
                    role="progressbar"
                    aria-valuenow={item.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Uploading ${item.file.name}`}
                  >
                    <div className="h-full bg-primary transition-all" style={{ width: `${item.progress}%` }} />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                disabled={disabled}
                className="icon-btn h-8 w-8 shrink-0"
                aria-label={`Remove ${item.file.name}`}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
