'use client';

import { useState } from 'react';
import { useChartStore } from '@/stores/chartStore';
import { useScannerData } from '@/hooks/useScannerData';
import { STRATEGIES, SCAN_SCOPES, ScanStrategy, ScanScope } from '@/lib/scanner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ScannerPanel({ open, onClose }: Props) {
  const [strategy, setStrategy] = useState<ScanStrategy>('bullish_align');
  const [scope, setScope] = useState<ScanScope>('thousand');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { symbol, setSymbol } = useChartStore();
  const { results, scanning, progress, total, scanned, rescan, stop } = useScannerData(strategy, scope, open);

  const currentStrategy = STRATEGIES.find((s) => s.key === strategy)!;
  const matchedCount = results.filter((r) => r.matched).length;
  const matchedResults = results.filter((r) => r.matched);
  const unmatchedResults = results.filter((r) => !r.matched);

  if (!open) return null;

  return (
    <div className="w-72 bg-[#1E222D] border-l border-[#363A45] flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#363A45]">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#2962FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-sm font-semibold text-[#D1D4DC]">策略掃描</span>
        </div>
        <button onClick={onClose} className="text-[#787B86] hover:text-[#D1D4DC] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scope selector */}
      <div className="px-3 py-2 border-b border-[#363A45]">
        <div className="text-[10px] text-[#787B86] mb-1.5">掃描範圍</div>
        <div className="flex gap-1">
          {SCAN_SCOPES.map((s) => (
            <button
              key={s.key}
              onClick={() => setScope(s.key)}
              disabled={scanning}
              className={`flex-1 px-1 py-1.5 rounded text-[10px] font-medium transition-colors ${
                scope === s.key
                  ? 'bg-[#2962FF] text-white'
                  : 'bg-[#131722] text-[#787B86] hover:text-[#D1D4DC] disabled:opacity-50'
              }`}
              title={s.description}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Strategy selector */}
      <div className="px-3 py-2 border-b border-[#363A45]">
        <div className="text-[10px] text-[#787B86] mb-1.5">掃描策略</div>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-[#131722] border border-[#363A45] rounded text-sm text-[#D1D4DC] hover:border-[#2962FF] transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentStrategy.color }} />
              <span>{currentStrategy.label}</span>
            </div>
            <svg className={`w-3 h-3 text-[#787B86] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1E222D] border border-[#363A45] rounded-lg shadow-xl z-50 overflow-hidden">
              {STRATEGIES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    setStrategy(s.key);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-[#2A2E39] transition-colors ${
                    s.key === strategy ? 'bg-[#2A2E39]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[#D1D4DC]">{s.label}</span>
                  </div>
                  <div className="text-[10px] text-[#787B86] mt-0.5 ml-4">{s.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Progress & stats */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-[#787B86]">
            {scanning
              ? `掃描中 ${scanned}/${total} (${progress}%)`
              : `符合: ${matchedCount}/${results.length}`}
          </span>
          {scanning ? (
            <button
              onClick={stop}
              className="text-[10px] text-[#EF4444] hover:text-[#F87171] transition-colors"
            >
              停止
            </button>
          ) : (
            <button
              onClick={rescan}
              className="text-[10px] text-[#2962FF] hover:text-[#5B8DEF] transition-colors"
            >
              重新掃描
            </button>
          )}
        </div>
        {scanning && (
          <div className="mt-1 h-1 bg-[#131722] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2962FF] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 && !scanning && (
          <div className="flex items-center justify-center h-32 text-[#787B86] text-xs">
            尚無結果
          </div>
        )}

        {/* Matched stocks */}
        {matchedResults.length > 0 && (
          <>
            <div className="px-3 py-1.5 text-[10px] text-[#787B86] uppercase tracking-wider bg-[#131722] sticky top-0 z-10">
              符合條件 ({matchedResults.length})
            </div>
            {matchedResults.map((r) => (
              <StockRow key={r.code} result={r} active={r.code === symbol} color={currentStrategy.color} onClick={() => { stop(); setSymbol(r.code, r.name); }} />
            ))}
          </>
        )}

        {/* Unmatched stocks (collapsed by default for large lists) */}
        {unmatchedResults.length > 0 && !scanning && scope === 'thousand' && (
          <>
            <div className="px-3 py-1.5 text-[10px] text-[#787B86] uppercase tracking-wider bg-[#131722] sticky top-0 z-10">
              不符合 ({unmatchedResults.length})
            </div>
            {unmatchedResults.map((r) => (
              <StockRow key={r.code} result={r} active={r.code === symbol} dimmed onClick={() => { stop(); setSymbol(r.code, r.name); }} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function StockRow({
  result: r,
  active,
  color,
  dimmed,
  onClick,
}: {
  result: { code: string; name: string; close: number; changePct: number; matched: boolean };
  active: boolean;
  color?: string;
  dimmed?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 border-b border-[#1a1e2b] hover:bg-[#2A2E39] transition-colors ${
        active ? 'bg-[#2A2E39]' : ''
      } ${dimmed ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {r.matched && color && (
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          )}
          <span className={`text-sm font-medium ${active ? 'text-[#2962FF]' : 'text-[#D1D4DC]'}`}>
            {r.code}
          </span>
          <span className="text-[11px] text-[#787B86]">{r.name}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-xs text-[#D1D4DC]">{r.close.toLocaleString()}</span>
        <span className={`text-xs font-medium ${
          r.changePct > 0 ? 'text-[#EF4444]' : r.changePct < 0 ? 'text-[#10B981]' : 'text-[#787B86]'
        }`}>
          {r.changePct > 0 ? '+' : ''}{r.changePct.toFixed(2)}%
        </span>
      </div>
    </button>
  );
}
