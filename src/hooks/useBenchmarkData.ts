import useSWR from 'swr';
import { useMemo } from 'react';
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
const EMPTY_CANDLES: StockCandle[] = [];

export function useBenchmarkData(timeframe: Timeframe) {
  const fetchDays = timeframe === 'weekly' ? 365 * 2
    : timeframe === 'monthly' ? 365 * 3
    : 365 + 60;

  const { data } = useSWR<StockCandle[]>(
    `/api/stock?id=${BENCHMARK_ID}&days=${fetchDays}&adj=true`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 3600000 }
  );

  // Memoize 防止 weekly/monthly 每次 render 回新 array → 下游 effect 無限觸發
  const benchmark = useMemo<StockCandle[]>(() => {
    if (!data || !data.length) return EMPTY_CANDLES;
    if (timeframe === 'daily') return data;
    return resampleCandles(data, timeframe);
  }, [data, timeframe]);

  return { benchmark };
}
