'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineData,
  HistogramData,
  Time,
  CrosshairMode,
} from 'lightweight-charts';
import { StockCandle } from '@/lib/types';
import { COLORS } from '@/lib/constants';

type IndicatorLine = {
  values: (number | null)[];
  color: string;
  lineWidth?: number;
  label: string;
};

type IndicatorHistogram = {
  values: (number | null)[];
  label: string;
};

interface Props {
  candles: StockCandle[];
  lines?: IndicatorLine[];
  histogram?: IndicatorHistogram;
  horizontalLines?: { value: number; color: string; style?: number }[];
  registerChart: (chart: IChartApi) => void;
  unregisterChart: (chart: IChartApi) => void;
  syncVisibleRange: (chart: IChartApi) => void;
  title?: string;
}

export default function IndicatorPane({
  candles,
  lines = [],
  histogram,
  horizontalLines = [],
  registerChart,
  unregisterChart,
  syncVisibleRange,
  title,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineRefs = useRef<ISeriesApi<'Line'>[]>([]);
  const histRef = useRef<ISeriesApi<'Histogram'> | null>(null);

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
      lineRefs.current = [];
      histRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!chartRef.current || !candles.length) return;

    // Remove old series
    for (const s of lineRefs.current) {
      try { chartRef.current.removeSeries(s); } catch { /* ok */ }
    }
    if (histRef.current) {
      try { chartRef.current.removeSeries(histRef.current); } catch { /* ok */ }
    }
    lineRefs.current = [];
    histRef.current = null;

    // Add histogram first (behind lines)
    if (histogram) {
      const hSeries = chartRef.current.addHistogramSeries({
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const data: HistogramData[] = [];
      for (let i = 0; i < candles.length; i++) {
        if (histogram.values[i] !== null) {
          data.push({
            time: candles[i].date as Time,
            value: histogram.values[i]!,
            color: histogram.values[i]! >= 0 ? COLORS.down + '99' : COLORS.up + '99',
          });
        }
      }
      hSeries.setData(data);
      histRef.current = hSeries;
    }

    // Add lines
    for (const line of lines) {
      const series = chartRef.current.addLineSeries({
        color: line.color,
        lineWidth: (line.lineWidth || 1.5) as 1 | 2 | 3 | 4,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const data: LineData[] = [];
      for (let i = 0; i < candles.length; i++) {
        if (line.values[i] !== null) {
          data.push({ time: candles[i].date as Time, value: line.values[i]! });
        }
      }
      series.setData(data);
      lineRefs.current.push(series);
    }

    // Horizontal reference lines
    for (const hl of horizontalLines) {
      if (lineRefs.current.length > 0) {
        lineRefs.current[0].createPriceLine({
          price: hl.value,
          color: hl.color,
          lineWidth: 1,
          lineStyle: hl.style ?? 2,
          axisLabelVisible: false,
        });
      }
    }

    // Match main chart: show last 120 bars using time-based range
    const ts = chartRef.current?.timeScale();
    if (ts && candles.length > 0) {
      const total = candles.length;
      const vis = Math.min(120, total);
      const fromDate = candles[total - vis].date as Time;
      const toDate = candles[total - 1].date as Time;
      ts.setVisibleRange({ from: fromDate, to: toDate });
    }
  }, [candles, lines, histogram, horizontalLines]);

  return (
    <div className="relative w-full h-full">
      {title && (
        <div className="absolute top-1 left-2 z-10 text-[10px] text-[#787B86]">{title}</div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
