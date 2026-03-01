'use client';

import { useCallback, useRef, useMemo } from 'react';
import { IChartApi } from 'lightweight-charts';
import CandlestickChart from './CandlestickChart';
import VolumePane from './VolumePane';
import IndicatorPane from './IndicatorPane';
import ChipPane from './ChipPane';
import RSPane from './RSPane';
import PCRatioPane from './PCRatioPane';
import OIDistributionPane from './OIDistributionPane';
import OptionSentimentPane from './OptionSentimentPane';
import VolumeProfileOverlay from './VolumeProfileOverlay';
import { useChartStore } from '@/stores/chartStore';
import { useIndicatorStore } from '@/stores/indicatorStore';
import { useAlertStore } from '@/stores/alertStore';
import { useStockData } from '@/hooks/useStockData';
import { useChipData } from '@/hooks/useChipData';
import { useOptionsData } from '@/hooks/useOptionsData';
import { useBenchmarkData } from '@/hooks/useBenchmarkData';
import { useIndicators } from '@/hooks/useIndicators';
import { useAlertChecker } from '@/hooks/useAlertChecker';
import { getSignal } from '@/lib/signals';
import { calcVWAP } from '@/lib/indicators';
import { COLORS } from '@/lib/constants';
import SignalBadge from '../widgets/SignalBadge';

export default function ChartContainer() {
  const { symbol, timeframe, setCrosshair } = useChartStore();
  const { visible } = useIndicatorStore();
  const chartsRef = useRef<IChartApi[]>([]);
  const isSyncingRef = useRef(false);

  const { candles, isLoading, error } = useStockData(symbol, timeframe);
  const { chipSummary } = useChipData(symbol);
  const { pcRatio, oiDistribution, institutional } = useOptionsData();
  const { benchmark } = useBenchmarkData(timeframe);
  const indicators = useIndicators(candles);

  // Alert checker
  useAlertChecker(symbol, candles);
  const allAlerts = useAlertStore((s) => s.alerts);
  const activeAlerts = useMemo(
    () => allAlerts.filter((a) => a.symbol === symbol && !a.triggered),
    [allAlerts, symbol]
  );

  // VWAP
  const vwapData = useMemo(() => {
    if (!candles.length) return [];
    return calcVWAP(candles);
  }, [candles]);

  // Crosshair sync across all sub-charts
  const registerChart = useCallback((chart: IChartApi) => {
    chartsRef.current.push(chart);
  }, []);

  const unregisterChart = useCallback((chart: IChartApi) => {
    chartsRef.current = chartsRef.current.filter((c) => c !== chart);
  }, []);

  const syncVisibleRange = useCallback((sourceChart: IChartApi) => {
    if (isSyncingRef.current) return;
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
    const optionsData = pcRatio.length > 0 || institutional.length > 0
      ? { pcRatio, institutional }
      : undefined;
    return getSignal(candles, indicators, chipSummary, optionsData);
  }, [candles, indicators, chipSummary, pcRatio, institutional]);

  // Count visible sub-panes
  const showVolume = visible.Volume;
  const showRSI = visible.RSI;
  const showKD = visible.KD;
  const showMACD = visible.MACD;
  const showChip = visible.Chip && !!chipSummary?.length;
  const showRS = visible.RS && benchmark.length > 0;
  const showPCRatio = visible.PCRatio && pcRatio.length > 0;
  const showOIDistribution = visible.OIDistribution && oiDistribution.data.length > 0;
  const showOptionSentiment = visible.OptionSentiment && institutional.length > 0;

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

  if (!isLoading && candles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#787B86]">
        <div className="text-center">
          <div className="text-lg mb-2">暫無交易資料</div>
          <div className="text-sm">{symbol} — 該股票可能為新上市、暫停交易或無交易紀錄</div>
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Signal badge */}
      {signalResult && (
        <div className="px-3 py-1.5 bg-[#1E222D] border-b border-[#363A45] shrink-0">
          <SignalBadge signal={signalResult} />
        </div>
      )}

      {/* Main candlestick chart — flex-[4] so it always dominates */}
      <div className="flex-[4] min-h-0 border-b border-[#363A45] relative">
        <CandlestickChart
          candles={candles}
          indicators={indicators}
          vwapData={visible.VWAP ? vwapData : undefined}
          alertPrices={activeAlerts.length > 0 ? activeAlerts : undefined}
          onCrosshairMove={onCrosshairMove}
          registerChart={registerChart}
          unregisterChart={unregisterChart}
          syncVisibleRange={syncVisibleRange}
        />
        {/* Volume Profile overlay */}
        {visible.VolumeProfile && <VolumeProfileOverlay candles={candles} />}
      </div>

      {/* Volume pane */}
      {showVolume && (
        <div className="flex-1 min-h-0 border-b border-[#363A45]">
          <VolumePane candles={candles} registerChart={registerChart} unregisterChart={unregisterChart} syncVisibleRange={syncVisibleRange} />
        </div>
      )}

      {/* RS pane */}
      {showRS && (
        <div className="flex-1 min-h-0 border-b border-[#363A45]">
          <RSPane
            candles={candles}
            benchmark={benchmark}
            registerChart={registerChart}
            unregisterChart={unregisterChart}
            syncVisibleRange={syncVisibleRange}
          />
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
        <div className="flex-1 min-h-0 border-b border-[#363A45]">
          <ChipPane candles={candles} chipSummary={chipSummary} registerChart={registerChart} unregisterChart={unregisterChart} syncVisibleRange={syncVisibleRange} />
        </div>
      )}

      {/* P/C Ratio pane */}
      {showPCRatio && (
        <div className="flex-1 min-h-0 border-b border-[#363A45]">
          <PCRatioPane candles={candles} pcRatio={pcRatio} registerChart={registerChart} unregisterChart={unregisterChart} syncVisibleRange={syncVisibleRange} />
        </div>
      )}

      {/* OI Distribution pane */}
      {showOIDistribution && (
        <div className="h-[200px] min-h-[200px] border-b border-[#363A45]">
          <OIDistributionPane data={oiDistribution.data} maxCallStrike={oiDistribution.maxCallStrike} maxPutStrike={oiDistribution.maxPutStrike} />
        </div>
      )}

      {/* Option Sentiment pane */}
      {showOptionSentiment && (
        <OptionSentimentPane institutional={institutional} />
      )}
    </div>
  );
}
