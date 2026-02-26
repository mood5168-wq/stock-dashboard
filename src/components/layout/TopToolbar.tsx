'use client';

import SymbolSearch from '../widgets/SymbolSearch';
import TimeframeSelector from '../widgets/TimeframeSelector';
import IndicatorPanel from '../widgets/IndicatorPanel';
import PriceAlertPanel from '../widgets/PriceAlertPanel';
import PriceHeader from '../widgets/PriceHeader';
import { useChartStore } from '@/stores/chartStore';

interface Props {
  onToggleScanner: () => void;
  scannerOpen: boolean;
}

export default function TopToolbar({ onToggleScanner, scannerOpen }: Props) {
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
      <div className="w-px h-6 bg-[#363A45]" />
      <button
        onClick={onToggleScanner}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          scannerOpen
            ? 'bg-[#2962FF] text-white'
            : 'text-[#787B86] hover:bg-[#2A2E39] hover:text-[#D1D4DC]'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        掃描
      </button>
      <div className="flex-1" />
      <PriceHeader />
    </div>
  );
}
