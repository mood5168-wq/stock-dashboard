'use client';

import { useState, useRef, useEffect } from 'react';
import { useIndicatorStore } from '@/stores/indicatorStore';
import { IndicatorType } from '@/lib/types';
import { COLORS } from '@/lib/constants';

type IndicatorItem = {
  id: IndicatorType;
  label: string;
  color?: string;
  indent?: boolean;
};

const indicatorList: IndicatorItem[] = [
  { id: 'MA', label: '均線 MA' },
  { id: 'MA5', label: 'MA 5', color: COLORS.ma5, indent: true },
  { id: 'MA10', label: 'MA 10', color: COLORS.ma10, indent: true },
  { id: 'MA20', label: 'MA 20', color: COLORS.ma20, indent: true },
  { id: 'MA60', label: 'MA 60', color: COLORS.ma60, indent: true },
  { id: 'Volume', label: '成交量' },
  { id: 'RSI', label: 'RSI(14)' },
  { id: 'KD', label: 'KD(9,3,3)' },
  { id: 'MACD', label: 'MACD' },
  { id: 'Bollinger', label: '布林通道' },
  { id: 'Chip', label: '大戶籌碼' },
  { id: 'VWAP', label: 'VWAP' },
  { id: 'RS', label: '相對強弱 vs 0050' },
  { id: 'VolumeProfile', label: '成交量堆積' },
  { id: 'PCRatio', label: 'P/C Ratio' },
  { id: 'OIDistribution', label: '未平倉分佈' },
  { id: 'OptionSentiment', label: '法人選擇權' },
];

export default function IndicatorPanel() {
  const { visible, toggle } = useIndicatorStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Count top-level active indicators (don't count sub-MAs)
  const topLevel: IndicatorType[] = ['MA', 'Volume', 'RSI', 'KD', 'MACD', 'Bollinger', 'Chip', 'VWAP', 'RS', 'VolumeProfile', 'PCRatio', 'OIDistribution', 'OptionSentiment'];
  const activeCount = topLevel.filter((k) => visible[k]).length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-[#2A2E39] transition-colors text-[#787B86] hover:text-[#D1D4DC]"
      >
        <span>指標</span>
        <span className="bg-[#2962FF] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
          {activeCount}
        </span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-[#1E222D] border border-[#363A45] rounded-lg shadow-xl z-50 py-1">
          {indicatorList.map((ind) => (
            <button
              key={ind.id}
              onClick={() => toggle(ind.id)}
              className={`w-full text-left py-1.5 text-sm hover:bg-[#2A2E39] flex items-center gap-2 text-[#D1D4DC] ${
                ind.indent ? 'pl-7 pr-3' : 'px-3 py-2'
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[10px] shrink-0 ${
                  visible[ind.id]
                    ? 'bg-[#2962FF] border-[#2962FF] text-white'
                    : 'border-[#363A45]'
                }`}
              >
                {visible[ind.id] && '✓'}
              </span>
              {ind.color && (
                <span
                  className="w-3 h-0.5 rounded shrink-0"
                  style={{ backgroundColor: ind.color }}
                />
              )}
              <span className={ind.indent ? 'text-xs' : ''}>{ind.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
