'use client';

import useSWR from 'swr';
import { StockCandle } from '@/lib/types';

interface WatchlistQuote {
  close: number | null;
  changePct: number | null;
}

type WatchlistQuotes = Record<string, WatchlistQuote>;
type WatchlistQuotesKey = readonly [string, string[]];

async function fetchQuotes([, codes]: WatchlistQuotesKey): Promise<WatchlistQuotes> {
  const entries = await Promise.all(
    codes.map(async (code) => {
      try {
        const res = await fetch(`/api/stock?id=${code}&days=5`);
        if (!res.ok) throw new Error('Failed to fetch stock quote');
        const data = (await res.json()) as StockCandle[];
        if (!Array.isArray(data) || data.length === 0) {
          return [code, { close: null, changePct: null }] as const;
        }
        const last = data[data.length - 1];
        const prev = data[data.length - 2];
        return [
          code,
          {
            close: last?.close ?? null,
            changePct:
              last && prev && prev.close > 0
                ? ((last.close - prev.close) / prev.close) * 100
                : null,
          },
        ] as const;
      } catch {
        return [code, { close: null, changePct: null }] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}

export function useWatchlistQuotes(codes: string[]) {
  const normalizedCodes = codes.filter(Boolean);
  const { data, error, isLoading } = useSWR<WatchlistQuotes>(
    normalizedCodes.length ? (['watchlist-quotes', normalizedCodes] as const) : null,
    fetchQuotes,
    { revalidateOnFocus: false, dedupingInterval: 3600000 }
  );
  return { quotes: data ?? {}, error, isLoading };
}
