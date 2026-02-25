import useSWR from 'swr';
import { ChipEntry, ChipSummary } from '@/lib/types';
import { useMemo } from 'react';

const LARGE_LEVELS = [
  '1,000-5,000', '5,001-10,000', '10,001-15,000',
  '15,001-20,000', '20,001-30,000', '30,001-40,000',
  '40,001-50,000', '50,001-100,000', '100,001-200,000',
  '200,001-400,000', '400,001-600,000', '600,001-800,000',
  '800,001-1,000,000', 'more than 1,000,001',
];

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Failed to fetch chip data');
  return r.json();
});

/**
 * Matches Python calc_chip_summary (app.py:164-188)
 */
function calcChipSummary(entries: ChipEntry[]): ChipSummary[] {
  const dateMap = new Map<string, number>();

  for (const e of entries) {
    if (LARGE_LEVELS.includes(e.HoldingSharesLevel)) {
      dateMap.set(e.date, (dateMap.get(e.date) || 0) + e.percent);
    }
  }

  const sorted = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b));

  return sorted.map(([date, large_pct], i) => ({
    date,
    large_pct,
    pct_chg: i === 0 ? null : large_pct - sorted[i - 1][1],
  }));
}

export function useChipData(symbol: string) {
  const { data, error, isLoading } = useSWR<ChipEntry[]>(
    symbol ? `/api/chip?id=${symbol}&days=365` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );

  const chipSummary = useMemo(() => {
    if (!data?.length) return null;
    return calcChipSummary(data);
  }, [data]);

  return { chipSummary, error, isLoading };
}
