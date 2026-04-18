'use client';

import { useCallback } from 'react';
import useSWRMutation from 'swr/mutation';

export interface StockLookupResult {
  code: string;
  name: string;
}

async function searchStocks(
  url: string,
  { arg }: { arg: string }
): Promise<StockLookupResult | null> {
  const res = await fetch(`${url}?q=${encodeURIComponent(arg)}`);
  if (!res.ok) throw new Error('Failed to search stock');
  const results = (await res.json()) as StockLookupResult[];
  return results.find((item) => item.code === arg) ?? null;
}

export function useStockLookup() {
  const { trigger, isMutating, error } = useSWRMutation('/api/search', searchStocks);

  const lookup = useCallback(
    async (code: string) => {
      const normalized = code.trim();
      if (!normalized) return null;
      return trigger(normalized);
    },
    [trigger]
  );

  return { lookup, isLoading: isMutating, error };
}
