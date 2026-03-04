'use client';

import { useChartStore } from '@/stores/chartStore';
import { useIndicatorStore } from '@/stores/indicatorStore';
import { useStockData } from '@/hooks/useStockData';
import { COLORS } from '@/lib/constants';

const MA_PERIODS = [
  { key: 'MA5' as const, period: 5, label: '5', color: COLORS.ma5 },
  { key: 'MA10' as const, period: 10, label: '10', color: COLORS.ma10 },
  { key: 'MA20' as const, period: 20, label: '20', color: COLORS.ma20 },
  { key: 'MA60' as const, period: 60, label: '60', color: COLORS.ma60 },
];

export default function PriceHeader() {
  const { symbol, timeframe, crosshairIndex } = useChartStore();
  const { visible } = useIndicatorStore();
  const { candles } = useStockData(symbol, timeframe);

  if (!candles.length) return null;

  const idx = crosshairIndex !== null && crosshairIndex >= 0 && crosshairIndex < candles.length
    ? crosshairIndex
    : candles.length - 1;
  const c = candles[idx];
  if (!c || !c.close) return null;
  const prev = idx > 0 ? candles[idx - 1] : c;
  const change = c.close - prev.close;
  const changePct = prev.close ? (change / prev.close) * 100 : 0;
  const isUp = change >= 0;

  // 抵扣價: for MA(n), it's the close price n bars back from current position
  // This is the price that will be "dropped" from the MA calculation on the next bar
  const deductions = MA_PERIODS.map(({ key, period, label, color }) => {
    const deductIdx = idx - period + 1;
    if (deductIdx < 0 || !visible[key]) return null;
    const deductPrice = candles[deductIdx].close;
    const aboveDed = c.close > deductPrice; // current close vs deduction price
    return { label, color, price: deductPrice, above: aboveDed };
  }).filter(Boolean);

  return (
    <div className="flex items-center gap-3 text-xs flex-wrap">
      {/* OHLCV */}
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

      {/* 抵扣價 */}
      {deductions.length > 0 && (
        <>
          <span className="w-px h-3.5 bg-[#363A45]" />
          {deductions.map((d) => (
            <span key={d!.label} className="flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: d!.color }} />
              <span className="text-[#787B86]">{d!.label}扣</span>
              <span style={{ color: d!.color }}>{d!.price.toFixed(1)}</span>
              <span className={d!.above ? 'text-[#EF4444]' : 'text-[#10B981]'}>
                {d!.above ? '\u2191' : '\u2193'}
              </span>
            </span>
          ))}
        </>
      )}
    </div>
  );
}
