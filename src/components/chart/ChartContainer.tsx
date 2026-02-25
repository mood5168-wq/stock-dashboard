'use client';

import { useCallback, useRef, useMemo } from 'react';
import { IChartApi } from 'lightweight-charts';
import CandlestickChart from './CandlestickChart';
import VolumePane from './VolumePane';
import IndicatorPane from './IndicatorPane';
import ChipPane from './ChipPane';
import { useChartStore } from '@/stores/chartStore';
import { useIndicatorStore } from '@/stores/indicatorStore';
import { useStockData } from '@/hooks/useStockData';
import { useChipData } from '@/hooks/useChipData';
import { useIndicators } from '@/hooks/useIndicators';
import { getSignal } from '@/lib/signals';
import { COLORS } from '@/lib/constants';
import SignalBadge from '../widgets/SignalBadge';

export default function ChartContainer() {
  const { symbol, timeframe, setCrosshair } = useChartStore();
  const { visible } = useIndicatorStore();
  const chartsRef = useRef<IChartApi[]>([]);
  const isSyncingRef = useRef(false);

  const { candles, isLoading, error } = useStockData(symbol, timeframe);
  const { chipSummary } = useChipData(symbol);
  const indicators = useIndicators(candles);

  // Crosshair sync across all sub-charts
  const registerChart = useCallback((chart: IChartApi) => {
    chartsRef.current.push(chart);
  }, []);

  const unregisterChart = useCallback((chart: IChartApi) => {
    chartsRef.current = chartsRef.current.filter((c) => c !== chart);
  }, []);

  const syncVisibleRange = useCallback((sourceChart: IChartApi) => {
    if (isSyncingRef.current) return; // prevent recursive sync loop
    isSyncingRef.current = true;
    try {
      const timeRange = sourceChart.timeScale().getVisibleRange();
      if (!timeRange) return;
      for (const other of chartsRef.current) {
        if (other !== sourceChart) {
          try {
            other.timeScale().setVisibleRange(timeRange);
          } catch { /* disposed chart, ignore */ }
        }
      }
    } catch { /* source disposed, ignore */ }
    finally {
      isSyncingRef.current = false;
    }
  }, []);

  const onCrosshairMove = useCallback(
    (index: number | null, time: string | null) => {
      setCrosshair(time, index);
    },
    [setCrosshair]
  );

  // Calculate signal
  const signalResult = useMemo(() => {
    if (!candles.length || !indicators) return null;
    return getSignal(candles, indicators, chipSummary);
  }, [candles, indicators, chipSummary]);

  // Count visible sub-panes
  const showVolume = visible.Volume;
  const showRSI = visible.RSI;
  const showKD = visible.KD;
  const showMACD = visible.MACD;
  const showChip = visible.Chip && !!chipSummary?.length;

  // subPaneCount available for future layout calculations
  // const subPaneCount = [showVolume, showRSI, showKD, showMACD, showChip].filter(Boolean).length;

  // RSI lines config
  const rsiLines = useMemo(() => {
    if (!indicators) return [];
    return [
      { values: indicators.RSI, color: COLORS.rsi, lineWidth: 1.5, label: 'RSI(14)' },
    ];
  }, [indicators]);

  // KD lines config
  const kdLines = useMemo(() => {
    if (!indicators) return [];
    return [
      { values: indicators.K, color: COLORS.kLine, lineWidth: 1.5, label: 'K(9)' },
      { values: indicators.D, color: COLORS.dLine, lineWidth: 1.5, label: 'D(9)' },
    ];
  }, [indicators]);

  // MACD lines config
  const macdLines = useMemo(() => {
    if (!indicators) return [];
    return [
      { values: indicators.DIF, color: COLORS.dif, lineWidth: 1.5, label: 'DIF' },
      { values: indicators.DEM, color: COLORS.dem, lineWidth: 1.5, label: 'DEM' },
    ];
  }, [indicators]);

  const macdHistogram = useMemo(() => {
    if (!indicators) return undefined;
    return { values: indicators.OSC, label: 'MACD柱' };
  }, [indicators]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-[#787B86]">
        <div className="text-center">
          <div className="text-lg mb-2">無法載入資料</div>
          <div className="text-sm">{symbol} — 請確認股票代號正確</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full gap-px p-2">
        <div className="flex-[3] skeleton rounded" />
        <div className="flex-1 skeleton rounded mt-1" />
        <div className="flex-1 skeleton rounded mt-1" />
      </div>
    );
  }

  // Use flex grow ratios: main chart = 4, sub panes = 1 each
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Signal badge */}
      {signalResult && (
        <div className="px-3 py-1.5 bg-[#1E222D] border-b border-[#363A45] shrink-0">
          <SignalBadge signal={signalResult} />
        </div>
      )}

      {/* Main candlestick chart — flex-[4] so it always dominates */}
      <div className="flex-[4] min-h-0 border-b border-[#363A45]">
        <CandlestickChart
          candles={candles}
          indicators={indicators}
          onCrosshairMove={onCrosshairMove}
          registerChart={registerChart}
          unregisterChart={unregisterChart}
          syncVisibleRange={syncVisibleRange}
        />
      </div>

      {/* Volume pane */}
      {showVolume && (
        <div className="flex-1 min-h-0 border-b border-[#363A45]">
          <VolumePane candles={candles} registerChart={registerChart} unregisterChart={unregisterChart} syncVisibleRange={syncVisibleRange} />
        </div>
      )}

      {/* RSI pane */}
      {showRSI && (
        <div className="flex-1 min-h-0 border-b border-[#363A45]">
          <IndicatorPane
            candles={candles}
            lines={rsiLines}
            horizontalLines={[
              { value: 70, color: '#EF4444', style: 2 },
              { value: 30, color: '#10B981', style: 2 },
            ]}
            registerChart={registerChart}
            unregisterChart={unregisterChart}
            syncVisibleRange={syncVisibleRange}
            title="RSI(14)"
          />
        </div>
      )}

      {/* KD pane */}
      {showKD && (
        <div className="flex-1 min-h-0 border-b border-[#363A45]">
          <IndicatorPane
            candles={candles}
            lines={kdLines}
            horizontalLines={[
              { value: 80, color: '#EF4444', style: 2 },
              { value: 20, color: '#10B981', style: 2 },
            ]}
            registerChart={registerChart}
            unregisterChart={unregisterChart}
            syncVisibleRange={syncVisibleRange}
            title="KD(9,3,3)"
          />
        </div>
      )}

      {/* MACD pane */}
      {showMACD && (
        <div className="flex-1 min-h-0 border-b border-[#363A45]">
          <IndicatorPane
            candles={candles}
            lines={macdLines}
            histogram={macdHistogram}
            horizontalLines={[{ value: 0, color: '#787B86', style: 2 }]}
            registerChart={registerChart}
            unregisterChart={unregisterChart}
            syncVisibleRange={syncVisibleRange}
            title="MACD(12,26,9)"
          />
        </div>
      )}

      {/* Chip pane */}
      {showChip && (
        <div className="flex-1 min-h-0">
          <ChipPane candles={candles} chipSummary={chipSummary} registerChart={registerChart} unregisterChart={unregisterChart} syncVisibleRange={syncVisibleRange} />
        </div>
      )}
    </div>
  );
}
