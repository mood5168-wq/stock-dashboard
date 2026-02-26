'use client';

import SymbolSearch from '../widgets/SymbolSearch';
import TimeframeSelector from '../widgets/TimeframeSelector';
import IndicatorPanel from '../widgets/IndicatorPanel';
import PriceAlertPanel from '../widgets/PriceAlertPanel';
import PriceHeader from '../widgets/PriceHeader';
import { useChartStore } from '@/stores/chartStore';

export default function TopToolbar() {
  const { symbol, setSymbol } = useChartStore();

  return (
    <div className="h-12 bg-[#1E222D] border-b border-[#363A45] flex items-center px-2 gap-2 shrink-0">
      <SymbolSearch />
      <div className="w-px h-6 bg-[#363A45]" />
      <button
        onClick={() => setSymbol('0050', '元大台灣50')}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
          symbol === '0050'
            ? 'bg-[#2962FF] text-white'
            : 'text-[#787B86] hover:bg-[#2A2E39] hover:text-[#D1D4DC]'
        }`}
      >
        大盤
      </button>
      <div className="w-px h-6 bg-[#363A45]" />
      <TimeframeSelector />
      <div className="w-px h-6 bg-[#363A45]" />
      <IndicatorPanel />
      <div className="w-px h-6 bg-[#363A45]" />
      <PriceAlertPanel />
      <div className="flex-1" />
      <PriceHeader />
    </div>
  );
}
