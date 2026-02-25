'use client';

import { useChartStore } from '@/stores/chartStore';
import { useStockData } from '@/hooks/useStockData';

export default function PriceHeader() {
  const { symbol, timeframe, crosshairIndex } = useChartStore();
  const { candles } = useStockData(symbol, timeframe);

  if (!candles.length) return null;

  const idx = crosshairIndex !== null && crosshairIndex >= 0 && crosshairIndex < candles.length
    ? crosshairIndex
    : candles.length - 1;
  const c = candles[idx];
  const prev = idx > 0 ? candles[idx - 1] : c;
  const change = c.close - prev.close;
  const changePct = prev.close ? (change / prev.close) * 100 : 0;
  const isUp = change >= 0;

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-[#787B86]">O</span>
      <span className={isUp ? 'text-[#EF4444]' : 'text-[#10B981]'}>{c.open.toFixed(1)}</span>
      <span className="text-[#787B86]">H</span>
      <span className={isUp ? 'text-[#EF4444]' : 'text-[#10B981]'}>{c.high.toFixed(1)}</span>
      <span className="text-[#787B86]">L</span>
      <span className={isUp ? 'text-[#EF4444]' : 'text-[#10B981]'}>{c.low.toFixed(1)}</span>
      <span className="text-[#787B86]">C</span>
      <span className={isUp ? 'text-[#EF4444]' : 'text-[#10B981]'}>{c.close.toFixed(1)}</span>
      <span className={`font-medium ${isUp ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
        {change >= 0 ? '+' : ''}{change.toFixed(1)} ({changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%)
      </span>
      <span className="text-[#787B86]">V</span>
      <span className="text-[#D1D4DC]">{(c.volume / 1e6).toFixed(1)}M</span>
    </div>
  );
}
