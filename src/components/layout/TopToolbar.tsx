'use client';

import SymbolSearch from '../widgets/SymbolSearch';
import TimeframeSelector from '../widgets/TimeframeSelector';
import IndicatorPanel from '../widgets/IndicatorPanel';
import PriceHeader from '../widgets/PriceHeader';

export default function TopToolbar() {
  return (
    <div className="h-12 bg-[#1E222D] border-b border-[#363A45] flex items-center px-2 gap-2 shrink-0">
      <SymbolSearch />
      <div className="w-px h-6 bg-[#363A45]" />
      <TimeframeSelector />
      <div className="w-px h-6 bg-[#363A45]" />
      <IndicatorPanel />
      <div className="flex-1" />
      <PriceHeader />
    </div>
  );
}
