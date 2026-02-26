'use client';

import { useState, useRef, useEffect } from 'react';
import { useAlertStore } from '@/stores/alertStore';
import { useChartStore } from '@/stores/chartStore';

export default function PriceAlertPanel() {
  const { symbol } = useChartStore();
  const { alerts, addAlert, removeAlert } = useAlertStore();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const ref = useRef<HTMLDivElement>(null);

  const symbolAlerts = alerts.filter((a) => a.symbol === symbol);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAdd = () => {
    const p = parseFloat(price);
    if (isNaN(p) || p <= 0) return;
    addAlert(symbol, p, direction);
    setPrice('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-[#2A2E39] transition-colors text-[#787B86] hover:text-[#D1D4DC]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span>警報</span>
        {symbolAlerts.filter(a => !a.triggered).length > 0 && (
          <span className="bg-[#F59E0B] text-[#131722] rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
            {symbolAlerts.filter(a => !a.triggered).length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-[#1E222D] border border-[#363A45] rounded-lg shadow-xl z-50 p-3">
          <div className="text-xs text-[#787B86] mb-2">新增價格警報 — {symbol}</div>

          <div className="flex gap-1 mb-2">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="目標價格"
              className="flex-1 bg-[#131722] border border-[#363A45] rounded px-2 py-1 text-xs text-[#D1D4DC] outline-none focus:border-[#2962FF]"
            />
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'above' | 'below')}
              className="bg-[#131722] border border-[#363A45] rounded px-1 py-1 text-xs text-[#D1D4DC] outline-none"
            >
              <option value="above">突破</option>
              <option value="below">跌破</option>
            </select>
            <button
              onClick={handleAdd}
              className="bg-[#2962FF] text-white rounded px-2 py-1 text-xs hover:bg-[#1E53E5] transition-colors"
            >
              +
            </button>
          </div>

          {symbolAlerts.length > 0 && (
            <div className="border-t border-[#363A45] pt-2 mt-1">
              <div className="text-xs text-[#787B86] mb-1">已設定的警報</div>
              {symbolAlerts.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center justify-between py-1 text-xs ${
                    a.triggered ? 'opacity-50' : ''
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span className={a.direction === 'above' ? 'text-[#EF4444]' : 'text-[#10B981]'}>
                      {a.direction === 'above' ? '\u2191' : '\u2193'}
                    </span>
                    <span className="text-[#D1D4DC]">{a.price.toFixed(1)}</span>
                    <span className="text-[#787B86]">
                      {a.direction === 'above' ? '突破' : '跌破'}
                    </span>
                    {a.triggered && <span className="text-[#F59E0B]">已觸發</span>}
                  </span>
                  <button
                    onClick={() => removeAlert(a.id)}
                    className="text-[#787B86] hover:text-[#EF4444] transition-colors"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
