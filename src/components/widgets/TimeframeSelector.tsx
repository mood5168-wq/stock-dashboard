'use client';

import { useChartStore } from '@/stores/chartStore';
import { Timeframe } from '@/lib/types';

const options: { value: Timeframe; label: string; shortcut: string }[] = [
  { value: 'daily', label: '日', shortcut: '1' },
  { value: 'weekly', label: '週', shortcut: '2' },
  { value: 'monthly', label: '月', shortcut: '3' },
];

export default function TimeframeSelector() {
  const { timeframe, setTimeframe } = useChartStore();

  return (
    <div className="flex items-center gap-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => setTimeframe(o.value)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            timeframe === o.value
              ? 'bg-[#2962FF] text-white'
              : 'text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
