import useSWR from 'swr';
import { StockCandle, Timeframe } from '@/lib/types';
import { resampleCandles } from '@/lib/indicators';

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Failed to fetch benchmark');
  const json = await r.json();
  if (json.error) throw new Error(json.error);
  return json;
};

const BENCHMARK_ID = '0050'; // 元大台灣50 ETF as market proxy

export function useBenchmarkData(timeframe: Timeframe) {
  const fetchDays = timeframe === 'weekly' ? 365 * 2
    : timeframe === 'monthly' ? 365 * 3
    : 365 + 60;

  const { data } = useSWR<StockCandle[]>(
    `/api/stock?id=${BENCHMARK_ID}&days=${fetchDays}&adj=true`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );

  let candles = data || [];

  if (candles.length && timeframe !== 'daily') {
    candles = resampleCandles(candles, timeframe);
  }

  return { benchmark: candles };
}
