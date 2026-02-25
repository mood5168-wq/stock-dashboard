'use client';

import { useState, useCallback } from 'react';
import { useChartStore } from '@/stores/chartStore';
import { THOUSAND_CLUB } from '@/lib/constants';

interface ChipResult {
  code: string;
  name: string;
  large_pct: string;
  pct_chg: string;
  signal: string;
}

export default function WatchList() {
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

        // Calculate chip summary client-side
        const LARGE_LEVELS = [
          '1,000-5,000','5,001-10,000','10,001-15,000','15,001-20,000',
          '20,001-30,000','30,001-40,000','40,001-50,000','50,001-100,000',
          '100,001-200,000','200,001-400,000','400,001-600,000','600,001-800,000',
          '800,001-1,000,000','more than 1,000,001',
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
            code, name,
            large_pct: latest.toFixed(2),
            pct_chg: (chg >= 0 ? '+' : '') + chg.toFixed(2),
            signal: chg > 0.3 ? '🟢 吸籌' : chg < -0.3 ? '🔴 出貨' : '⚪ 持平',
          });
        }
      } catch { /* skip */ }
    }
    scanned.sort((a, b) => parseFloat(b.pct_chg) - parseFloat(a.pct_chg));
    setResults(scanned);
    setScanning(false);
  }, [entries]);

  return (
    <div className="h-full flex flex-col bg-[#1E222D] border-l border-[#363A45]">
      <div className="p-2 border-b border-[#363A45] flex items-center justify-between">
        <span className="text-xs font-medium text-[#D1D4DC]">千元股清單</span>
        <button
          onClick={scanChips}
          disabled={scanning}
          className="text-[10px] px-2 py-0.5 rounded bg-[#2962FF] text-white hover:bg-[#1E53E5] disabled:opacity-50"
        >
          {scanning ? '掃描中...' : '掃描籌碼'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {results.length > 0 ? (
          results.map((r) => (
            <button
              key={r.code}
              onClick={() => setSymbol(r.code, r.name)}
              className={`w-full text-left px-2 py-1.5 text-xs border-b border-[#363A45]/50 hover:bg-[#2A2E39] flex justify-between ${
                r.code === symbol ? 'bg-[#2A2E39]' : ''
              }`}
            >
              <div>
                <span className="text-[#D1D4DC] font-medium">{r.code}</span>
                <span className="text-[#787B86] ml-1">{r.name}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px]">{r.signal}</span>
                <div className="text-[10px] text-[#787B86]">{r.pct_chg}%</div>
              </div>
            </button>
          ))
        ) : (
          entries.map(([code, name]) => (
            <button
              key={code}
              onClick={() => setSymbol(code, name)}
              className={`w-full text-left px-2 py-1.5 text-xs border-b border-[#363A45]/50 hover:bg-[#2A2E39] ${
                code === symbol ? 'bg-[#2A2E39] text-[#2962FF]' : 'text-[#D1D4DC]'
              }`}
            >
              <span className="font-medium">{code}</span>
              <span className="text-[#787B86] ml-1">{name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
