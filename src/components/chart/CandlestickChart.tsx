'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  Time,
  CrosshairMode,
} from 'lightweight-charts';
import { StockCandle, IndicatorData } from '@/lib/types';
import { COLORS } from '@/lib/constants';
import { useIndicatorStore } from '@/stores/indicatorStore';
import { useChartStore } from '@/stores/chartStore';

interface Props {
  candles: StockCandle[];
  indicators: IndicatorData | null;
  onCrosshairMove?: (index: number | null, time: string | null) => void;
  registerChart: (chart: IChartApi) => void;
  unregisterChart: (chart: IChartApi) => void;
  syncVisibleRange: (chart: IChartApi) => void;
}

const VISIBLE_BARS = 120;

export default function CandlestickChart({ candles, indicators, onCrosshairMove, registerChart, unregisterChart, syncVisibleRange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const sliderRef = useRef<HTMLInputElement>(null);
  const [sliderMax, setSliderMax] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const isSliderDragging = useRef(false);

  const { visible } = useIndicatorStore();
  const { symbol, symbolName } = useChartStore();

  const buildCandleData = useCallback((): CandlestickData[] => {
    return candles.map((c) => ({
      time: c.date as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
  }, [candles]);

  const buildLineData = useCallback(
    (values: (number | null)[]): LineData[] => {
      const result: LineData[] = [];
      for (let i = 0; i < candles.length; i++) {
        if (values[i] !== null) {
          result.push({ time: candles[i].date as Time, value: values[i]! });
        }
      }
      return result;
    },
    [candles]
  );

  // Scroll chart to a position based on slider value (index into candles array)
  const scrollToSliderValue = useCallback((val: number) => {
    const ts = chartRef.current?.timeScale();
    if (!ts || !candles.length) return;
    const barsToShow = Math.min(VISIBLE_BARS, candles.length);
    const fromIdx = Math.max(0, Math.min(val, candles.length - barsToShow));
    const toIdx = Math.min(fromIdx + barsToShow - 1, candles.length - 1);
    const fromDate = candles[fromIdx].date as Time;
    const toDate = candles[toIdx].date as Time;
    ts.setVisibleRange({ from: fromDate, to: toDate });
  }, [candles]);

  // Handle slider input
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSliderValue(val);
    isSliderDragging.current = true;
    scrollToSliderValue(val);
    // Sync other charts
    if (chartRef.current) syncVisibleRange(chartRef.current);
    requestAnimationFrame(() => { isSliderDragging.current = false; });
  }, [scrollToSliderValue, syncVisibleRange]);

  // Create chart
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
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: true, pinch: true, axisPressedMouseMove: true },
      rightPriceScale: {
        borderColor: COLORS.border,
      },
      timeScale: {
        borderColor: COLORS.border,
        timeVisible: false,
        rightOffset: 5,
      },
      watermark: {
        visible: true,
        text: `${symbol} ${symbolName}`,
        color: 'rgba(255, 255, 255, 0.04)',
        fontSize: 48,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: COLORS.up,
      downColor: COLORS.down,
      borderUpColor: COLORS.up,
      borderDownColor: COLORS.down,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
    });
    candleSeriesRef.current = candleSeries;

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.point) {
        onCrosshairMove?.(null, null);
        return;
      }
      const timeStr = param.time as string;
      const idx = candles.findIndex((c) => c.date === timeStr);
      onCrosshairMove?.(idx >= 0 ? idx : null, timeStr);
    });

    // Sync slider position when chart scrolls via drag/wheel
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      syncVisibleRange(chart);
      if (range && !isSliderDragging.current) {
        setSliderValue(Math.round(range.from));
      }
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

    const lineRefs = lineSeriesRefs.current;
    return () => {
      unregisterChart(chart);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      lineRefs.clear();
    };
  }, [symbol, symbolName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update data
  useEffect(() => {
    if (!candleSeriesRef.current || !candles.length) return;
    candleSeriesRef.current.setData(buildCandleData());

    const total = candles.length;
    const barsToShow = Math.min(VISIBLE_BARS, total);
    const maxVal = Math.max(0, total - barsToShow);
    setSliderMax(maxVal);

    // Scroll to show latest data using time-based range
    const startPos = maxVal;
    setSliderValue(startPos);
    const ts = chartRef.current?.timeScale();
    if (ts) {
      const fromDate = candles[total - barsToShow].date as Time;
      const toDate = candles[total - 1].date as Time;
      ts.setVisibleRange({ from: fromDate, to: toDate });
    }
  }, [candles, buildCandleData]);

  // Update MA / Bollinger lines
  useEffect(() => {
    if (!chartRef.current || !indicators) return;

    const maConfig = [
      { key: 'MA5', data: indicators.MA5, color: COLORS.ma5 },
      { key: 'MA10', data: indicators.MA10, color: COLORS.ma10 },
      { key: 'MA20', data: indicators.MA20, color: COLORS.ma20 },
      { key: 'MA60', data: indicators.MA60, color: COLORS.ma60 },
    ];
    const bbConfig = [
      { key: 'BB_upper', data: indicators.BB_upper, color: COLORS.bbUpper },
      { key: 'BB_middle', data: indicators.BB_middle, color: COLORS.bbUpper },
      { key: 'BB_lower', data: indicators.BB_lower, color: COLORS.bbLower },
    ];

    const allLines = [
      ...maConfig.map((m) => ({ ...m, show: visible[m.key as keyof typeof visible] })),
      ...bbConfig.map((b) => ({ ...b, show: visible.Bollinger })),
    ];

    for (const line of allLines) {
      const existing = lineSeriesRefs.current.get(line.key);
      if (line.show) {
        if (existing) {
          existing.setData(buildLineData(line.data));
        } else {
          const series = chartRef.current!.addLineSeries({
            color: line.color,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          series.setData(buildLineData(line.data));
          lineSeriesRefs.current.set(line.key, series);
        }
      } else if (existing) {
        chartRef.current!.removeSeries(existing);
        lineSeriesRefs.current.delete(line.key);
      }
    }
  }, [indicators, visible.MA5, visible.MA10, visible.MA20, visible.MA60, visible.Bollinger, buildLineData]);

  return (
    <div className="flex flex-col w-full h-full">
      <div ref={containerRef} className="flex-1 min-h-0" />
      {/* Scrollbar */}
      {candles.length > VISIBLE_BARS && (
        <div className="h-5 shrink-0 flex items-center px-1 bg-[#131722] border-t border-[#1E222D]">
          <input
            ref={sliderRef}
            type="range"
            min={0}
            max={sliderMax}
            value={sliderValue}
            onChange={handleSliderChange}
            className="w-full h-1 appearance-none cursor-pointer rounded-full"
            style={{
              background: `linear-gradient(to right, #363A45 ${sliderMax > 0 ? (sliderValue / sliderMax) * 100 : 0}%, #1E222D ${sliderMax > 0 ? (sliderValue / sliderMax) * 100 : 0}%)`,
              accentColor: '#2962FF',
            }}
          />
        </div>
      )}
    </div>
  );
}
