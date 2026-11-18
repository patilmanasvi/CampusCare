// src/hooks/useApi.js
// Runs an async service call and tracks loading / error / data.
//   const { data, loading, error, reload, setData } = useApi(() => ticketService.getTicket(id), [id]);
import { useCallback, useEffect, useRef, useState } from 'react';

export function useApi(fn, deps = [], { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const callId = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async () => {
    callId.current += 1;
    const id = callId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current();
      if (id === callId.current) setData(result);
      return result;
    } catch (err) {
      if (id === callId.current) setError(err);
      return undefined;
    } finally {
      if (id === callId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    run();
    return () => {
      callId.current += 1; // ignore results that arrive after unmount / deps change
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { data, loading, error, reload: run, setData };
}
