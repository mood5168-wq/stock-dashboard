'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChartStore } from '@/stores/chartStore';
import { THOUSAND_CLUB } from '@/lib/constants';

export default function SymbolSearch() {
  const { symbol, symbolName, setSymbol } = useChartStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const entries = Object.entries(THOUSAND_CLUB);
  const filtered = query
    ? entries.filter(
        ([code, name]) =>
          code.includes(query) || name.toLowerCase().includes(query.toLowerCase())
      )
    : entries;

  const handleSelect = useCallback((code: string, name: string) => {
    setSymbol(code, name);
    setOpen(false);
    setQuery('');
  }, [setSymbol]);

  const handleCustomSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed && /^\d{4,6}$/.test(trimmed)) {
      setSymbol(trimmed, THOUSAND_CLUB[trimmed] || trimmed);
      setOpen(false);
      setQuery('');
    }
  }, [query, setSymbol]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#2A2E39] transition-colors"
      >
        <span className="text-sm font-semibold text-[#D1D4DC]">{symbol}</span>
        <span className="text-xs text-[#787B86]">{symbolName}</span>
        <svg className="w-3 h-3 text-[#787B86]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-[#1E222D] border border-[#363A45] rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-[#363A45]">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCustomSubmit();
                if (e.key === 'Escape') setOpen(false);
              }}
              placeholder="搜尋代號或名稱..."
              className="w-full bg-[#131722] border border-[#363A45] rounded px-2 py-1.5 text-sm text-[#D1D4DC] placeholder-[#787B86] outline-none focus:border-[#2962FF]"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.map(([code, name]) => (
              <button
                key={code}
                onClick={() => handleSelect(code, name)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-[#2A2E39] flex justify-between items-center ${
                  code === symbol ? 'bg-[#2A2E39] text-[#2962FF]' : 'text-[#D1D4DC]'
                }`}
              >
                <span className="font-medium">{code}</span>
                <span className="text-[#787B86] text-xs">{name}</span>
              </button>
            ))}
            {filtered.length === 0 && query && (
              <div className="px-3 py-2 text-xs text-[#787B86]">
                按 Enter 搜尋 &quot;{query}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
