'use client';

import { useChartStore } from '@/stores/chartStore';
import { useStockData } from '@/hooks/useStockData';

export default function StatusBar() {
  const { symbol, symbolName, timeframe } = useChartStore();
  const { candles } = useStockData(symbol, timeframe);
  const dataCount = candles.length;
  const lastDate = candles.length > 0 ? candles[candles.length - 1].date : '';

  return (
    <div className="h-6 bg-[#1E222D] border-t border-[#363A45] flex items-center px-3 text-[10px] text-[#787B86] gap-4 shrink-0">
      <span>{symbol} {symbolName}</span>
      <span>資料筆數: {dataCount}</span>
      {lastDate && <span>最新: {lastDate}</span>}
      <div className="flex-1" />
      <span>FinMind API</span>
    </div>
  );
}
