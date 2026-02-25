'use client';

import { useChartStore } from '@/stores/chartStore';
import { DrawingTool } from '@/lib/types';

const tools: { id: DrawingTool; icon: string; label: string }[] = [
  { id: 'crosshair', icon: '┼', label: '十字線' },
  { id: 'trendline', icon: '╱', label: '趨勢線' },
  { id: 'horizontal', icon: '─', label: '水平線' },
  { id: 'fibonacci', icon: 'Fib', label: '費波那契' },
];

export default function LeftToolbar() {
  const { drawingTool, setDrawingTool } = useChartStore();

  return (
    <div className="w-11 bg-[#1E222D] border-r border-[#363A45] flex flex-col items-center pt-2 gap-1 shrink-0">
      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => setDrawingTool(t.id)}
          title={t.label}
          className={`w-8 h-8 flex items-center justify-center rounded text-xs font-mono transition-colors ${
            drawingTool === t.id
              ? 'bg-[#2962FF] text-white'
              : 'text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39]'
          }`}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
}
