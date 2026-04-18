import useSWR from 'swr';
import { ChipEntry } from '@/lib/types';
import { calcChipSummary } from '@/lib/chip';
import { useMemo } from 'react';

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Failed to fetch chip data');
  return r.json();
});

export function useChipData(symbol: string) {
  const { data, error, isLoading } = useSWR<ChipEntry[]>(
    symbol ? `/api/chip?id=${symbol}&days=365` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 3600000 }
  );

  const chipSummary = useMemo(() => {
    if (!data?.length) return null;
    return calcChipSummary(data);
  }, [data]);

  return { chipSummary, error, isLoading };
}
