// src/hooks/useUploadConfig.js
// Loads the attachment limits from the backend once and shares them.
import { useEffect, useState } from 'react';
import { uploadService } from '../services/uploadService';

let cached = null;
let pending = null;

export function useUploadConfig() {
  const [config, setConfig] = useState(cached);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cached) return undefined;
    let active = true;
    pending = pending || uploadService.getConfig();
    pending
      .then((c) => {
        cached = c || {};
        if (active) setConfig(cached);
      })
      .catch((err) => {
        pending = null;
        if (active) setError(err);
      });
    return () => {
      active = false;
    };
  }, []);

  return { config, error, loading: !config && !error };
}
