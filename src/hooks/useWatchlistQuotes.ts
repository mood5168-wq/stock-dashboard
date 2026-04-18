'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { StockCandle } from '@/lib/types';

interface WatchlistQuote {
  close: number | null;
  changePct: number | null;
}

type WatchlistQuotes = Record<string, WatchlistQuote>;

// 限制並行 fetch 數量，避免 50 檔同時打爆 FinMind rate limit
const QUOTE_BATCH_SIZE = 8;

async function fetchOne(code: string): Promise<[string, WatchlistQuote]> {
  try {
    // days=2 正好滿足 close + changePct 計算，不浪費頻寬
    const res = await fetch(`/api/stock?id=${code}&days=2`);
    if (!res.ok) throw new Error('Failed to fetch stock quote');
    const data = (await res.json()) as StockCandle[];
    if (!Array.isArray(data) || data.length === 0) {
      return [code, { close: null, changePct: null }];
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
    ];
  } catch {
    return [code, { close: null, changePct: null }];
  }
}

async function fetchQuotesBatched(codes: string[]): Promise<WatchlistQuotes> {
  const result: WatchlistQuotes = {};
  for (let i = 0; i < codes.length; i += QUOTE_BATCH_SIZE) {
    const batch = codes.slice(i, i + QUOTE_BATCH_SIZE);
    const entries = await Promise.all(batch.map(fetchOne));
    for (const [code, quote] of entries) {
      result[code] = quote;
    }
  }
  return result;
}

export function useWatchlistQuotes(codes: string[]) {
  // 用 stable string key 避免 SWR 每次 render 視為新 key 重新 fetch
  const codesKey = useMemo(
    () => [...codes].filter(Boolean).sort().join(','),
    [codes]
  );

  const { data, error, isLoading } = useSWR<WatchlistQuotes>(
    codesKey ? `watchlist-quotes:${codesKey}` : null,
    () => fetchQuotesBatched(codesKey.split(',')),
    { revalidateOnFocus: false, dedupingInterval: 3600000 }
  );

  return { quotes: data ?? {}, error, isLoading };
}
