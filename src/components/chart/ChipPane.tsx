'use client';

import { useEffect, useRef, useMemo } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  AreaData,
  Time,
  CrosshairMode,
} from 'lightweight-charts';
import { StockCandle, ChipSummary } from '@/lib/types';
import { COLORS } from '@/lib/constants';

interface Props {
  candles: StockCandle[];
  chipSummary: ChipSummary[] | null;
  registerChart: (chart: IChartApi) => void;
  unregisterChart: (chart: IChartApi) => void;
  syncVisibleRange: (chart: IChartApi) => void;
}

export default function ChipPane({ candles, chipSummary, registerChart, unregisterChart, syncVisibleRange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  const areaData = useMemo((): AreaData[] => {
    if (!chipSummary?.length || !candles.length) return [];

    const chipMap = new Map<string, number>();
    for (const c of chipSummary) {
      chipMap.set(c.date, c.large_pct);
    }

    const result: AreaData[] = [];
    let lastVal: number | null = null;

    for (const candle of candles) {
      const val = chipMap.get(candle.date);
      if (val !== undefined) lastVal = val;
      if (lastVal !== null) {
        result.push({ time: candle.date as Time, value: lastVal });
      }
    }
    return result;
  }, [candles, chipSummary]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: COLORS.bg },
        textColor: COLORS.textSecondary,
      },
      grid: {
        vertLines: { color: '#1E222D' },
        horzLines: { color: '#1E222D' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#363A45', width: 1, style: 3, labelBackgroundColor: '#2962FF' },
        horzLine: { color: '#363A45', width: 1, style: 3, labelBackgroundColor: '#2962FF' },
      },
      rightPriceScale: {
        borderColor: COLORS.border,
      },
      timeScale: {
        borderColor: COLORS.border,
        visible: false,
      },
    });

    chartRef.current = chart;

    const series = chart.addAreaSeries({
      lineColor: COLORS.chip,
      topColor: COLORS.chipFill,
      bottomColor: 'transparent',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    seriesRef.current = series;

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      syncVisibleRange(chart);
    });

    registerChart(chart);

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      unregisterChart(chart);
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(areaData);
    // Match main chart: show last 120 bars using time-based range
    const ts = chartRef.current?.timeScale();
    if (ts && candles.length > 0) {
      const total = candles.length;
      const vis = Math.min(120, total);
      const fromDate = candles[total - vis].date as Time;
      const toDate = candles[total - 1].date as Time;
      ts.setVisibleRange({ from: fromDate, to: toDate });
    }
  }, [areaData, candles]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-1 left-2 z-10 text-[10px] text-[#787B86]">大戶持股%</div>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
