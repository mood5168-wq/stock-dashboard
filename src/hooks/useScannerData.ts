import { useState, useEffect, useCallback, useRef } from 'react';
import { StockCandle } from '@/lib/types';
import { THOUSAND_CLUB, MARKET_INDEX } from '@/lib/constants';
import { ScanStrategy, ScanResult, runScan } from '@/lib/scanner';

// Only scan actual stocks, not ETFs
const SCAN_STOCKS = Object.entries(THOUSAND_CLUB).filter(
  ([code]) => !(code in MARKET_INDEX)
);

interface ScannerState {
  results: ScanResult[];
  scanning: boolean;
  progress: number; // 0-100
  error: string | null;
}

export function useScannerData(strategy: ScanStrategy, active: boolean) {
  const [state, setState] = useState<ScannerState>({
    results: [],
    scanning: false,
    progress: 0,
    error: null,
  });
  const abortRef = useRef(false);
  const cacheRef = useRef<Map<string, StockCandle[]>>(new Map());

  const scan = useCallback(async () => {
    abortRef.current = false;
    setState({ results: [], scanning: true, progress: 0, error: null });

    const results: ScanResult[] = [];
    const total = SCAN_STOCKS.length;
    const batchSize = 5; // Fetch 5 stocks at a time to avoid overwhelming the API

    for (let i = 0; i < total; i += batchSize) {
      if (abortRef.current) break;

      const batch = SCAN_STOCKS.slice(i, i + batchSize);
      const promises = batch.map(async ([code, name]) => {
        try {
          let candles = cacheRef.current.get(code);
          if (!candles) {
            const res = await fetch(`/api/stock?id=${code}&days=120`);
            if (!res.ok) throw new Error('fetch failed');
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            candles = json as StockCandle[];
            cacheRef.current.set(code, candles);
          }

          if (!candles || candles.length < 2) return null;

          const last = candles[candles.length - 1];
          const prev = candles[candles.length - 2];
          const changePct = prev.close > 0 ? ((last.close - prev.close) / prev.close) * 100 : 0;

          return {
            code,
            name,
            close: last.close,
            change: last.spread,
            changePct,
            matched: runScan(candles, strategy),
          } as ScanResult;
        } catch {
          return { code, name, close: 0, change: 0, changePct: 0, matched: false } as ScanResult;
        }
      });

      const batchResults = await Promise.all(promises);
      for (const r of batchResults) {
        if (r) results.push(r);
      }

      setState((prev) => ({
        ...prev,
        progress: Math.round(((i + batch.length) / total) * 100),
        results: [...results],
      }));
    }

    // Sort: matched first, then by changePct descending
    results.sort((a, b) => {
      if (a.matched !== b.matched) return a.matched ? -1 : 1;
      return b.changePct - a.changePct;
    });

    setState({ results, scanning: false, progress: 100, error: null });
  }, [strategy]);

  // Auto-scan when strategy changes and panel is active
  useEffect(() => {
    if (active) {
      scan();
    }
    return () => {
      abortRef.current = true;
    };
  }, [strategy, active, scan]);

  return { ...state, rescan: scan };
}
