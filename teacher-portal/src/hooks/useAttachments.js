// src/hooks/useAttachments.js
// State for files picked in an AttachmentUploader, plus uploading them.
// Files that already uploaded are remembered, so a retry after a failure
// only uploads the ones that are left.
import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadService } from '../services/uploadService';
import { createId } from '../utils/id';
import { getErrorMessage } from '../utils/errors';

export function useAttachments() {
  const [items, setItems] = useState([]); // { id, file, previewUrl, progress, error, uploaded }
  const [uploading, setUploading] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Free preview URLs when the component using this hook goes away.
  useEffect(
    () => () => {
      itemsRef.current.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
    },
    []
  );

  const addFiles = useCallback((files) => {
    const next = Array.from(files).map((file) => ({
      id: createId(),
      file,
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      progress: 0,
      error: null,
      uploaded: null,
    }));
    setItems((list) => [...list, ...next]);
  }, []);

  const removeItem = useCallback((id) => {
    setItems((list) => {
      const item = list.find((i) => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return list.filter((i) => i.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setItems((list) => {
      list.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
      return [];
    });
  }, []);

  const patch = (id, changes) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...changes } : i)));

  /** Uploads every file not yet uploaded. Returns attachment ids, or throws if any failed. */
  const uploadAll = useCallback(async () => {
    const list = itemsRef.current;
    if (!list.length) return [];
    setUploading(true);
    const ids = [];
    let failed = 0;
    try {
      for (const item of list) {
        if (item.uploaded) {
          ids.push(item.uploaded.id);
          continue;
        }
        patch(item.id, { error: null, progress: 0 });
        try {
          // eslint-disable-next-line no-await-in-loop
          const attachment = await uploadService.uploadFile(item.file, {
            onProgress: (p) => patch(item.id, { progress: p }),
          });
          patch(item.id, { uploaded: attachment, progress: 100 });
          ids.push(attachment.id);
        } catch (err) {
          failed += 1;
          patch(item.id, { error: getErrorMessage(err, 'Upload failed.'), progress: 0 });
        }
      }
    } finally {
      setUploading(false);
    }
    if (failed) {
      throw new Error(
        failed === 1
          ? 'One attachment could not be uploaded. Remove it or try again.'
          : `${failed} attachments could not be uploaded. Remove them or try again.`
      );
    }
    return ids;
  }, []);

  return { items, addFiles, removeItem, clear, uploadAll, uploading };
}
