import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The dashboard load/refresh/error state machine, once — every dashboard
 * hand-rolled an identical (and subtly divergent) copy (review R-026).
 *
 *   const { data, loading, error, refreshing, refresh, retry } =
 *     useDashboardData(() => service.load(args), [args]);
 *
 * - initial mount + any deps change → loading (shows skeleton)
 * - refresh() → silent reload (keeps current data, sets `refreshing`)
 * - retry() → loud reload (clears error, shows skeleton)
 * `loader` is called with an AbortSignal-free contract; stale results from a
 * superseded run are dropped.
 */
export function useDashboardData(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const runId = useRef(0);

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++runId.current;
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await loader();
      if (id !== runId.current) return; // superseded
      setData(result);
      setError(null);
    } catch (err) {
      if (id !== runId.current) return;
      if (!silent) setError(err);
    } finally {
      if (id === runId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  const refresh = useCallback(() => run({ silent: true }), [run]);
  const retry = useCallback(() => {
    setError(null);
    run();
  }, [run]);

  return { data, loading, error, refreshing, refresh, retry, reload: refresh };
}
