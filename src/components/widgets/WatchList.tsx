'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStockLookup } from '@/hooks/useStockLookup';
import { useWatchlistQuotes } from '@/hooks/useWatchlistQuotes';
import { THOUSAND_CLUB } from '@/lib/constants';
import { useChartStore } from '@/stores/chartStore';
import { useWatchlistStore, WATCHLIST_MAX } from '@/stores/watchlistStore';

interface ChipResult {
  code: string;
  name: string;
  large_pct: string;
  pct_chg: string;
  signal: string;
}

const WATCHLIST_CODE_PATTERN = /^(?:\d{4}|00\d{2,4})$/;

function isValidWatchlistCode(code: string) {
  return WATCHLIST_CODE_PATTERN.test(code);
}

function formatClose(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '--';
  return value >= 1000 ? value.toFixed(0) : value.toFixed(2);
}

function formatChangePct(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function getChangeColor(value: number | null | undefined) {
  if (value == null || Number.isNaN(value) || value === 0) {
    return 'text-[#D1D4DC]';
  }
  return value > 0 ? 'text-[#EF4444]' : 'text-[#10B981]';
}

function PersonalWatchlistSection() {
  const { symbol, setSymbol } = useChartStore();
  const items = useWatchlistStore((state) => state.items);
  const addItem = useWatchlistStore((state) => state.addItem);
  const removeItem = useWatchlistStore((state) => state.removeItem);

  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { quotes } = useWatchlistQuotes(mounted ? items.map((item) => item.code) : []);
  const { lookup, isLoading: lookingUp } = useStockLookup();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAdd = useCallback(async () => {
    const code = input.trim();
    if (!code) return;

    if (!isValidWatchlistCode(code)) {
      setErrorMessage('請輸入 4 位股票代碼或 00 開頭 ETF');
      return;
    }

    if (items.some((item) => item.code === code)) {
      setErrorMessage('這檔已在追蹤清單中');
      setInput('');
      return;
    }

    if (items.length >= WATCHLIST_MAX) {
      setErrorMessage(`已達 ${WATCHLIST_MAX} 檔上限，請先移除再新增`);
      return;
    }

    try {
      const stock = await lookup(code);
      if (!stock) {
        setErrorMessage('查無此股票代碼');
        return;
      }
      const result = addItem(stock);
      if (!result.ok) {
        setErrorMessage(
          result.reason === 'full'
            ? `已達 ${WATCHLIST_MAX} 檔上限`
            : '已在追蹤清單中'
        );
        return;
      }
      setInput('');
      setErrorMessage('');
    } catch {
      setErrorMessage('股票名稱查詢失敗，請稍後再試');
    }
  }, [addItem, input, items, lookup]);

  return (
    <div className="flex max-h-[50%] min-h-[10rem] flex-col">
      <div className="border-b border-[#363A45] p-2">
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-[#D1D4DC]">
            我的追蹤 <span className="text-[10px] text-[#787B86]">({items.length}/{WATCHLIST_MAX})</span>
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={input}
            onChange={(e) => {
              setInput(e.target.value.trim());
              if (errorMessage) setErrorMessage('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleAdd();
              }
            }}
            placeholder={lookingUp ? '新增中...' : '輸入代碼'}
            className="h-7 flex-1 rounded border border-[#363A45] bg-[#131722] px-2 text-xs text-[#D1D4DC] outline-none placeholder:text-[#787B86] focus:border-[#2962FF]"
          />
        </div>
        {errorMessage ? (
          <p className="mt-1 text-[10px] text-[#F87171]">{errorMessage}</p>
        ) : (
          <p className="mt-1 text-[10px] text-[#787B86]">Enter 新增，支援股票與 00 開頭 ETF</p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!mounted ? (
          <div className="px-2 py-4 text-xs text-[#787B86]">讀取中...</div>
        ) : items.length === 0 ? (
          <div className="px-2 py-4 text-xs leading-5 text-[#787B86]">
            尚未追蹤任何股票，輸入代碼或從掃描結果 ⭐ 加入追蹤
          </div>
        ) : (
          items.map((item) => {
            const quote = quotes[item.code];
            const active = item.code === symbol;

            return (
              <div
                key={item.code}
                className={`group flex items-center border-b border-[#363A45]/50 ${
                  active ? 'bg-[#2A2E39]' : 'hover:bg-[#2A2E39]'
                }`}
              >
                <button
                  onClick={() => setSymbol(item.code, item.name)}
                  className="min-w-0 flex-1 px-2 py-2 text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`font-medium ${active ? 'text-[#2962FF]' : 'text-[#D1D4DC]'}`}>
                      {item.code}
                    </span>
                    <span className="truncate text-[11px] text-[#787B86]">{item.name}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-[#D1D4DC]">{formatClose(quote?.close)}</span>
                    <span className={getChangeColor(quote?.changePct)}>
                      {formatChangePct(quote?.changePct)}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => removeItem(item.code)}
                  aria-label={`移除 ${item.code}`}
                  className="mr-1 h-6 w-6 shrink-0 rounded text-sm text-[#787B86] opacity-0 transition hover:bg-[#363A45] hover:text-[#D1D4DC] group-hover:opacity-100 focus:opacity-100"
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ThousandClubSection() {
  const { symbol, setSymbol } = useChartStore();
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ChipResult[]>([]);

  const entries = Object.entries(THOUSAND_CLUB);

  const scanChips = useCallback(async () => {
    setScanning(true);
    const scanned: ChipResult[] = [];

    for (const [code, name] of entries) {
      try {
        const res = await fetch(`/api/chip?id=${code}&days=30`);
        if (!res.ok) continue;
        const data = await res.json();
        if (!data?.length) continue;

        const LARGE_LEVELS = [
          '1,000-5,000', '5,001-10,000', '10,001-15,000', '15,001-20,000',
          '20,001-30,000', '30,001-40,000', '40,001-50,000', '50,001-100,000',
          '100,001-200,000', '200,001-400,000', '400,001-600,000', '600,001-800,000',
          '800,001-1,000,000', 'more than 1,000,001',
        ];

        const dateMap = new Map<string, number>();
        for (const e of data) {
          if (LARGE_LEVELS.includes(e.HoldingSharesLevel)) {
            dateMap.set(e.date, (dateMap.get(e.date) || 0) + e.percent);
          }
        }

        const sorted = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b));
        if (sorted.length >= 2) {
          const latest = sorted[sorted.length - 1][1];
          const prev = sorted[sorted.length - 2][1];
          const chg = latest - prev;
          scanned.push({
            code,
            name,
            large_pct: latest.toFixed(2),
            pct_chg: `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}`,
            signal: chg > 0.3 ? '🟢 吸籌' : chg < -0.3 ? '🔴 出貨' : '⚪ 持平',
          });
        }
      } catch {
        // skip
      }
    }

    scanned.sort((a, b) => parseFloat(b.pct_chg) - parseFloat(a.pct_chg));
    setResults(scanned);
    setScanning(false);
  }, [entries]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[#363A45] p-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#D1D4DC]">千元股清單</span>
          <button
            onClick={scanChips}
            disabled={scanning}
            className="rounded bg-[#2962FF] px-2 py-0.5 text-[10px] text-white hover:bg-[#1E53E5] disabled:opacity-50"
          >
            {scanning ? '掃描中...' : '掃描籌碼'}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {results.length > 0
          ? results.map((r) => (
              <button
                key={r.code}
                onClick={() => setSymbol(r.code, r.name)}
                className={`flex w-full justify-between border-b border-[#363A45]/50 px-2 py-1.5 text-left text-xs hover:bg-[#2A2E39] ${
                  r.code === symbol ? 'bg-[#2A2E39]' : ''
                }`}
              >
                <div>
                  <span className="font-medium text-[#D1D4DC]">{r.code}</span>
                  <span className="ml-1 text-[#787B86]">{r.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px]">{r.signal}</span>
                  <div className="text-[10px] text-[#787B86]">{r.pct_chg}%</div>
                </div>
              </button>
            ))
          : entries.map(([code, name]) => (
              <button
                key={code}
                onClick={() => setSymbol(code, name)}
                className={`w-full border-b border-[#363A45]/50 px-2 py-1.5 text-left text-xs hover:bg-[#2A2E39] ${
                  code === symbol ? 'bg-[#2A2E39] text-[#2962FF]' : 'text-[#D1D4DC]'
                }`}
              >
                <span className="font-medium">{code}</span>
                <span className="ml-1 text-[#787B86]">{name}</span>
              </button>
            ))}
      </div>
    </div>
  );
}

export default function WatchList() {
  return (
    <div className="flex h-full flex-col bg-[#1E222D] border-l border-[#363A45]">
      <PersonalWatchlistSection />
      <div className="border-t border-[#363A45]" />
      <ThousandClubSection />
    </div>
  );
}
