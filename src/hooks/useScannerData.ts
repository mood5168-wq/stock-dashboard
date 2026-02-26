import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { StockCandle } from '@/lib/types';
import { THOUSAND_CLUB, MARKET_INDEX } from '@/lib/constants';
import { ScanStrategy, ScanScope, ScanResult, runScan } from '@/lib/scanner';

interface StockInfo {
  stock_id: string;
  stock_name: string;
  type: string;
}

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error('Failed to fetch');
  const json = await r.json();
  if (json.error) throw new Error(json.error);
  return json;
};

// Thousand club stocks (exclude ETFs)
const THOUSAND_ENTRIES = Object.entries(THOUSAND_CLUB)
  .filter(([code]) => !(code in MARKET_INDEX))
  .map(([code, name]) => ({ stock_id: code, stock_name: name, type: 'twse' }));

interface ScannerState {
  results: ScanResult[];
  scanning: boolean;
  progress: number;
  total: number;
  scanned: number;
}

export function useScannerData(strategy: ScanStrategy, scope: ScanScope, active: boolean) {
  const [state, setState] = useState<ScannerState>({
    results: [],
    scanning: false,
    progress: 0,
    total: 0,
    scanned: 0,
  });
  const abortRef = useRef(false);
  const cacheRef = useRef<Map<string, StockCandle[]>>(new Map());

  // Fetch full stock list (only when needed for non-thousand scopes)
  const needFullList = scope !== 'thousand';
  const { data: fullList } = useSWR<StockInfo[]>(
    needFullList && active ? '/api/stocklist' : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 86400000 }
  );

  // Build stock list based on scope
  const getStockList = useCallback((): { code: string; name: string }[] => {
    if (scope === 'thousand') {
      return THOUSAND_ENTRIES.map((s) => ({ code: s.stock_id, name: s.stock_name }));
    }

    if (!fullList) return [];

    let filtered = fullList;
    if (scope === 'twse') {
      filtered = fullList.filter((s) => s.type === 'twse');
    } else if (scope === 'tpex') {
      filtered = fullList.filter((s) => s.type === 'tpex');
    }

    return filtered.map((s) => ({ code: s.stock_id, name: s.stock_name }));
  }, [scope, fullList]);

  const scan = useCallback(async () => {
    const stocks = getStockList();
    if (!stocks.length) return;

    abortRef.current = false;
    setState({ results: [], scanning: true, progress: 0, total: stocks.length, scanned: 0 });

    const results: ScanResult[] = [];
    const total = stocks.length;
    const batchSize = scope === 'thousand' ? 5 : 10;

    for (let i = 0; i < total; i += batchSize) {
      if (abortRef.current) break;

      const batch = stocks.slice(i, i + batchSize);
      const promises = batch.map(async ({ code, name }) => {
        try {
          let candles = cacheRef.current.get(code);
          if (!candles) {
            const res = await fetch(`/api/stock?id=${code}&days=120`);
            if (!res.ok) return null;
            const json = await res.json();
            if (json.error) return null;
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
          return null;
        }
      });

      const batchResults = await Promise.all(promises);
      for (const r of batchResults) {
        if (r) results.push(r);
      }

      const scanned = Math.min(i + batch.length, total);
      setState({
        results: [...results].sort((a, b) => {
          if (a.matched !== b.matched) return a.matched ? -1 : 1;
          return b.changePct - a.changePct;
        }),
        scanning: true,
        progress: Math.round((scanned / total) * 100),
        total,
        scanned,
      });
    }

    results.sort((a, b) => {
      if (a.matched !== b.matched) return a.matched ? -1 : 1;
      return b.changePct - a.changePct;
    });

    setState({ results, scanning: false, progress: 100, total, scanned: total });
  }, [strategy, scope, getStockList]);

  // Auto-scan when strategy/scope changes and panel is active
  useEffect(() => {
    if (active && (scope === 'thousand' || fullList)) {
      scan();
    }
    return () => {
      abortRef.current = true;
    };
  }, [strategy, scope, active, scan, fullList]);

  const stop = useCallback(() => {
    abortRef.current = true;
  }, []);

  return { ...state, rescan: scan, stop };
}
