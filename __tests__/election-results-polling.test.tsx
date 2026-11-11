/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { useElectionResults } from '../hooks/useElectionResults';

test('results polling follows the current election without refetching on every render', async () => {
  jest.useFakeTimers();
  const originalFetch = global.fetch;
  const visibility = Object.getOwnPropertyDescriptor(
    document,
    'visibilityState'
  );
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible'
  });
  const fetchResults = jest.fn(
    async () =>
      ({
        ok: true,
        json: async () => ({ candidateResults: [], initiativeResults: [] })
      }) as Response
  );
  global.fetch = fetchResults;

  try {
    const view = renderHook(({ id }) => useElectionResults(id), {
      initialProps: { id: 'first' }
    });
    await act(async () => {});
    expect(fetchResults).toHaveBeenCalledTimes(1);
    const refetch = view.result.current.refetch;

    view.rerender({ id: 'first' });
    expect(view.result.current.refetch).toBe(refetch);
    expect(fetchResults).toHaveBeenCalledTimes(1);

    view.rerender({ id: 'second' });
    await act(async () => {});
    expect(fetchResults).toHaveBeenLastCalledWith(
      '/api/elections/second/results'
    );
    expect(fetchResults).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(15_000);
    });
    expect(fetchResults).toHaveBeenLastCalledWith(
      '/api/elections/second/results'
    );
    expect(fetchResults).toHaveBeenCalledTimes(3);

    view.unmount();
    await act(async () => {
      jest.advanceTimersByTime(15_000);
    });
    expect(fetchResults).toHaveBeenCalledTimes(3);
  } finally {
    global.fetch = originalFetch;
    if (visibility)
      Object.defineProperty(document, 'visibilityState', visibility);
    else Reflect.deleteProperty(document, 'visibilityState');
    jest.useRealTimers();
  }
});
