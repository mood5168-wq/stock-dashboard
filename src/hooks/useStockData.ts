import useSWR from 'swr';
import { StockCandle, Timeframe } from '@/lib/types';
import { resampleCandles } from '@/lib/indicators';

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Failed to fetch');
  const json = await r.json();
  if (json.error) throw new Error(json.error);
  return json;
};

export function useStockData(symbol: string, timeframe: Timeframe) {
  // Daily: 1 year + extra for MA60 warmup
  // Weekly/monthly: fetch more raw daily data for resampling
  const fetchDays = timeframe === 'weekly' ? 365 * 2
    : timeframe === 'monthly' ? 365 * 3
    : 365 + 60;

  const { data, error, isLoading } = useSWR<StockCandle[]>(
    symbol ? `/api/stock?id=${symbol}&days=${fetchDays}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000, errorRetryCount: 3 }
  );

  let candles = data || [];

  if (candles.length && timeframe !== 'daily') {
    candles = resampleCandles(candles, timeframe);
  }

  return { candles, error, isLoading };
}
