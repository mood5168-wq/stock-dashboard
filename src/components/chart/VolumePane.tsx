'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  HistogramData,
  Time,
  CrosshairMode,
} from 'lightweight-charts';
import { StockCandle } from '@/lib/types';
import { COLORS } from '@/lib/constants';

interface Props {
  candles: StockCandle[];
  registerChart: (chart: IChartApi) => void;
  unregisterChart: (chart: IChartApi) => void;
  syncVisibleRange: (chart: IChartApi) => void;
}

export default function VolumePane({ candles, registerChart, unregisterChart, syncVisibleRange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

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

    const series = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
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
    if (!seriesRef.current || !candles.length) return;

    const data: HistogramData[] = candles.map((c) => ({
      time: c.date as Time,
      value: c.volume / 1e6,
      color: c.close >= c.open ? COLORS.up + '99' : COLORS.down + '99',
    }));

    seriesRef.current.setData(data);
    // Match main chart: show last 120 bars using time-based range
    const ts = chartRef.current?.timeScale();
    if (ts) {
      const total = candles.length;
      const vis = Math.min(120, total);
      const fromDate = candles[total - vis].date as Time;
      const toDate = candles[total - 1].date as Time;
      ts.setVisibleRange({ from: fromDate, to: toDate });
    }
  }, [candles]);

  return <div ref={containerRef} className="w-full h-full" />;
}
