import { useMemo } from 'react';
import { StockCandle, IndicatorData } from '@/lib/types';
import { calcIndicators } from '@/lib/indicators';

export function useIndicators(candles: StockCandle[]): IndicatorData | null {
  return useMemo(() => {
    if (!candles.length) return null;
    return calcIndicators(candles);
  }, [candles]);
}
