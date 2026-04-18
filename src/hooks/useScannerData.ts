import { useState, useEffect, useCallback, useRef } from 'react';
import useSWR from 'swr';
import { StockCandle } from '@/lib/types';
import { THOUSAND_CLUB, MARKET_INDEX } from '@/lib/constants';
import { ScanStrategy, ScanScope, ScanResult, runScan } from '@/lib/scanner';
import { loadCachedResults, saveCachedResults } from '@/lib/scannerCache';

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

  const scan = useCallback(async (force = false) => {
    const stocks = getStockList();
    if (!stocks.length) return;

    // 先嘗試讀 IndexedDB 快取（30 分內視為新鮮）
    if (!force) {
      const cached = await loadCachedResults(scope, strategy);
      if (cached && cached.isFresh) {
        setState({
          results: cached.results,
          scanning: false,
          progress: 100,
          total: cached.results.length,
          scanned: cached.results.length,
        });
        return;
      }
      // 過期也先顯示舊資料（stale-while-revalidate）
      if (cached && !cached.isFresh) {
        setState({
          results: cached.results,
          scanning: true,
          progress: 0,
          total: stocks.length,
          scanned: 0,
        });
      }
    }

    abortRef.current = false;
    // force 重掃時清空舊結果，避免顯示上一次策略/範圍的殘留
    setState((prev) => ({
      results: force ? [] : prev.results,
      scanning: true,
      progress: 0,
      total: stocks.length,
      scanned: 0,
    }));

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
            // 120 calendar days ≈ 85 trading days，給 MA60 (需 61) 留足緩衝
            // 不可降到 90，連假密集期（春節/國慶）會讓交易日數 < 61 導致 MA60 策略失效
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

    // 掃完存進 IndexedDB
    if (!abortRef.current) {
      void saveCachedResults(scope, strategy, results);
    }
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

  // rescan 按鈕 = force 重新掃（略過快取）
  const rescan = useCallback(() => scan(true), [scan]);

  return { ...state, rescan, stop };
}
