import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';

export function useLiveQuery<T>(
  querier: () => Promise<T> | T,
  deps: readonly unknown[] = [],
  defaultValue?: T
): T | undefined {
  const [value, setValue] = useState<T | undefined>(defaultValue);

  useEffect(() => {
    const observable = liveQuery(querier);
    const subscription = observable.subscribe({
      next: (val) => setValue(val),
      error: (err) => {
        console.error('Dexie liveQuery error:', err);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
