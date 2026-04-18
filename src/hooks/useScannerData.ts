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
  // 每次 scan() 給一個遞增 id，await 後檢查 runIdRef.current 是否還等於自己
  // 若已被新的 scan 覆蓋，就不要再寫 state / cache，避免 stale-result race
  const runIdRef = useRef(0);
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

    // 每次 scan 配一個 id，後續 await 後檢查是否還是「當前」那一次
    const myRunId = ++runIdRef.current;
    const isCurrent = () => runIdRef.current === myRunId;

    // 先嘗試讀 IndexedDB 快取（30 分內視為新鮮）
    if (!force) {
      const cached = await loadCachedResults(scope, strategy);
      if (!isCurrent()) return;  // 被新的 scan 覆蓋就放棄
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

    // force 重掃時清空舊結果 + 清 per-symbol 記憶體快取（否則 rescan 永遠拿舊 candles）
    if (force) {
      cacheRef.current.clear();
    }
    setState((prev) => ({
      results: force ? [] : prev.results,
      scanning: true,
      progress: 0,
      total: stocks.length,
      scanned: 0,
    }));

    const results: ScanResult[] = [];
    let failedCount = 0;  // 追蹤失敗數，以決定是否能存 cache
    const total = stocks.length;
    const batchSize = scope === 'thousand' ? 5 : 10;

    for (let i = 0; i < total; i += batchSize) {
      if (!isCurrent()) return;  // 被新 scan 覆蓋 / 面板關閉

      const batch = stocks.slice(i, i + batchSize);
      const promises = batch.map(async ({ code, name }) => {
        try {
          let candles = cacheRef.current.get(code);
          if (!candles) {
            // 120 calendar days ≈ 85 trading days，給 MA60 (需 61) 留足緩衝
            // 不可降到 90，連假密集期（春節/國慶）會讓交易日數 < 61 導致 MA60 策略失效
            const res = await fetch(`/api/stock?id=${code}&days=120`);
            if (!res.ok) return { ok: false as const };
            const json = await res.json();
            if (json.error) return { ok: false as const };
            candles = json as StockCandle[];
            cacheRef.current.set(code, candles);
          }

          if (!candles || candles.length < 2) return { ok: false as const };

          const last = candles[candles.length - 1];
          const prev = candles[candles.length - 2];
          const changePct = prev.close > 0 ? ((last.close - prev.close) / prev.close) * 100 : 0;

          return {
            ok: true as const,
            result: {
              code,
              name,
              close: last.close,
              change: last.spread,
              changePct,
              matched: runScan(candles, strategy),
            } as ScanResult,
          };
        } catch {
          return { ok: false as const };
        }
      });

      const batchResults = await Promise.all(promises);
      if (!isCurrent()) return;  // await 後再次檢查

      for (const r of batchResults) {
        if (r.ok) {
          results.push(r.result);
        } else {
          failedCount++;
        }
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

    if (!isCurrent()) return;

    results.sort((a, b) => {
      if (a.matched !== b.matched) return a.matched ? -1 : 1;
      return b.changePct - a.changePct;
    });

    setState({ results, scanning: false, progress: 100, total, scanned: total });

    // 只有「全部成功」才存 cache，否則下次會把部分失敗的結果當新鮮資料回傳
    if (failedCount === 0) {
      void saveCachedResults(scope, strategy, results);
    } else if (typeof console !== 'undefined') {
      console.warn(
        `[scanner] ${failedCount}/${total} symbols failed — not caching results. ` +
        `Check FinMind rate limits / network.`
      );
    }
  }, [strategy, scope, getStockList]);

  // Auto-scan when strategy/scope changes and panel is active
  useEffect(() => {
    if (active && (scope === 'thousand' || fullList)) {
      scan();
    }
    return () => {
      // 面板關閉或切換策略 → 讓目前執行中的 scan 視為過期
      runIdRef.current++;
    };
  }, [strategy, scope, active, scan, fullList]);

  const stop = useCallback(() => {
    runIdRef.current++;  // 透過遞增 id 讓目前 scan 停寫 state
    setState((prev) => ({ ...prev, scanning: false }));
  }, []);

  // rescan 按鈕 = force 重新掃（略過兩層快取）
  const rescan = useCallback(() => scan(true), [scan]);

  return { ...state, rescan, stop };
}
