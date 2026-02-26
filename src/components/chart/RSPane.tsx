'use client';

import { useEffect, useRef, useMemo } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  Time,
  CrosshairMode,
} from 'lightweight-charts';
import { StockCandle } from '@/lib/types';
import { COLORS } from '@/lib/constants';
import { calcRelativeStrength } from '@/lib/indicators';

interface Props {
  candles: StockCandle[];
  benchmark: StockCandle[];
  registerChart: (chart: IChartApi) => void;
  unregisterChart: (chart: IChartApi) => void;
  syncVisibleRange: (chart: IChartApi) => void;
}

export default function RSPane({ candles, benchmark, registerChart, unregisterChart, syncVisibleRange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const baselineRef = useRef<ISeriesApi<'Line'> | null>(null);

  const rsData = useMemo((): LineData[] => {
    if (!candles.length || !benchmark.length) return [];
    const rs = calcRelativeStrength(candles, benchmark);
    const result: LineData[] = [];
    for (let i = 0; i < candles.length; i++) {
      if (rs[i] !== null && rs[i] !== undefined) {
        result.push({ time: candles[i].date as Time, value: rs[i]! });
      }
    }
    return result;
  }, [candles, benchmark]);

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

    const series = chart.addLineSeries({
      color: '#F59E0B',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    seriesRef.current = series;

    // Baseline at 100
    const baseline = chart.addLineSeries({
      color: '#787B86',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    baselineRef.current = baseline;

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
    if (!seriesRef.current || !baselineRef.current) return;
    seriesRef.current.setData(rsData);

    // Draw baseline at 100
    if (rsData.length >= 2) {
      baselineRef.current.setData([
        { time: rsData[0].time, value: 100 },
        { time: rsData[rsData.length - 1].time, value: 100 },
      ]);
    }

    // Set initial visible range
    const ts = chartRef.current?.timeScale();
    if (ts && candles.length > 0) {
      const total = candles.length;
      const vis = Math.min(120, total);
      const fromDate = candles[total - vis].date as Time;
      const toDate = candles[total - 1].date as Time;
      ts.setVisibleRange({ from: fromDate, to: toDate });
    }
  }, [rsData, candles]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-1 left-2 z-10 text-[10px] text-[#787B86]">
        RS vs 0050 <span className="text-[#F59E0B]">(100=基準)</span>
      </div>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
