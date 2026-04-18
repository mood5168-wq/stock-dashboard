import useSWR from 'swr';
import { useMemo } from 'react';
import { StockCandle, Timeframe } from '@/lib/types';
import { resampleCandles } from '@/lib/indicators';

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Failed to fetch');
  const json = await r.json();
  if (json.error) throw new Error(json.error);
  return json;
};

const EMPTY_CANDLES: StockCandle[] = [];

export function useStockData(symbol: string, timeframe: Timeframe) {
  // Daily: 1 year + extra for MA60 warmup
  // Weekly/monthly: fetch more raw daily data for resampling
  const fetchDays = timeframe === 'weekly' ? 365 * 2
    : timeframe === 'monthly' ? 365 * 3
    : 365 + 60;

  const { data, error, isLoading } = useSWR<StockCandle[]>(
    symbol ? `/api/stock?id=${symbol}&days=${fetchDays}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 3600000, errorRetryCount: 3 }
  );

  // 重要：weekly/monthly 必須 memoize，否則每次 render 都回新的 array 參考，
  // 會讓 CandlestickChart 的 effect 無限觸發 → React error #185 (max update depth)
  const candles = useMemo<StockCandle[]>(() => {
    if (!data || !data.length) return EMPTY_CANDLES;
    if (timeframe === 'daily') return data;
    return resampleCandles(data, timeframe);
  }, [data, timeframe]);

  return { candles, error, isLoading };
}
