'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';

export type DataState<T> = { data?: T; error?: string; loading: boolean; reload: () => Promise<void> };

/**
 * Loads data for a screen and loads it again whenever the app comes back to
 * the foreground (after Stripe in Safari, for example) or back online. `deps` are the inputs
 * the loader reads, such as an ?id=.
 */
export function useData<T>(load: () => Promise<T>, deps: unknown[] = []): DataState<T> {
  const [state, setState] = useState<Omit<DataState<T>, 'reload'>>({ loading: true });
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      setState({ data: await loadRef.current(), loading: false });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
    const listeners = [
      App.addListener('resume', reload),
      // Back online: load again, so an offline error clears by itself.
      Network.addListener('networkStatusChange', ({ connected }) => connected && reload())
    ];
    return () => listeners.forEach((listener) => listener.then((l) => l.remove()));
  }, [reload]);

  return { ...state, reload };
}
