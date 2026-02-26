import { StockCandle, IndicatorData } from './types';

/**
 * Calculate all technical indicators — ported from Python app.py:192-218
 * to ensure identical results.
 */
export function calcIndicators(candles: StockCandle[]): IndicatorData {
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  // MA
  const MA5 = sma(closes, 5);
  const MA10 = sma(closes, 10);
  const MA20 = sma(closes, 20);
  const MA60 = sma(closes, 60);

  // RSI(14) — rolling mean method (matches Python: delta.where(>0).rolling(14).mean())
  const RSI = calcRSI(closes, 14);

  // KD(9,3,3) — RSV + EWM (matches Python: rsv.ewm(span=3).mean())
  const { K, D } = calcKD(closes, highs, lows, 9, 3);

  // MACD(12,26,9) — OSC = (DIF-DEM)*2
  const { DIF, DEM, OSC } = calcMACD(closes, 12, 26, 9);

  // Bollinger Bands(20,2)
  const { upper: BB_upper, middle: BB_middle, lower: BB_lower } = calcBollinger(closes, 20, 2);

  return { MA5, MA10, MA20, MA60, RSI, K, D, DIF, DEM, OSC, BB_upper, BB_middle, BB_lower };
}

function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j];
      result.push(sum / period);
    }
  }
  return result;
}

/**
 * RSI using simple rolling mean (NOT Wilder's EMA).
 * Matches Python: gain.rolling(14).mean() / loss.rolling(14).mean()
 */
function calcRSI(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const deltas: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      deltas.push(0);
      result.push(null);
      continue;
    }
    deltas.push(closes[i] - closes[i - 1]);

    if (i < period) {
      result.push(null);
      continue;
    }

    let gainSum = 0;
    let lossSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      if (deltas[j] > 0) gainSum += deltas[j];
      else lossSum += -deltas[j];
    }
    const avgGain = gainSum / period;
    const avgLoss = lossSum / period;

    if (avgLoss === 0) {
      result.push(100);
    } else {
      result.push(100 - 100 / (1 + avgGain / avgLoss));
    }
  }
  return result;
}

/**
 * KD(period, kSpan, dSpan) using EWM.
 * Matches Python:
 *   rsv = (close - low_9) / (high_9 - low_9) * 100
 *   K = rsv.ewm(span=3, adjust=False).mean()
 *   D = K.ewm(span=3, adjust=False).mean()
 */
function calcKD(
  closes: number[],
  highs: number[],
  lows: number[],
  period: number,
  span: number
): { K: (number | null)[]; D: (number | null)[] } {
  const n = closes.length;
  const K: (number | null)[] = [];
  const D: (number | null)[] = [];

  const alpha = 2 / (span + 1);
  let prevK: number | null = null;
  let prevD: number | null = null;

  for (let i = 0; i < n; i++) {
    if (i < period - 1) {
      K.push(null);
      D.push(null);
      continue;
    }

    let low9 = Infinity;
    let high9 = -Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (lows[j] < low9) low9 = lows[j];
      if (highs[j] > high9) high9 = highs[j];
    }

    const rsv = high9 === low9 ? 50 : ((closes[i] - low9) / (high9 - low9)) * 100;

    // EWM: K = alpha * rsv + (1-alpha) * prevK
    const kVal: number = prevK === null ? rsv : alpha * rsv + (1 - alpha) * prevK;
    const dVal: number = prevD === null ? kVal : alpha * kVal + (1 - alpha) * prevD;

    K.push(kVal);
    D.push(dVal);
    prevK = kVal;
    prevD = dVal;
  }

  return { K, D };
}

/**
 * MACD(fast, slow, signal)
 * OSC = (DIF - DEM) * 2  (note: ×2, matching Python)
 */
function calcMACD(
  closes: number[],
  fast: number,
  slow: number,
  signal: number
): { DIF: (number | null)[]; DEM: (number | null)[]; OSC: (number | null)[] } {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);

  const difRaw: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    difRaw.push(emaFast[i] - emaSlow[i]);
  }
  const demRaw = ema(difRaw, signal);

  const DIF: (number | null)[] = [];
  const DEM: (number | null)[] = [];
  const OSC: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < slow - 1) {
      DIF.push(null);
      DEM.push(null);
      OSC.push(null);
    } else {
      DIF.push(difRaw[i]);
      DEM.push(demRaw[i]);
      OSC.push((difRaw[i] - demRaw[i]) * 2);
    }
  }

  return { DIF, DEM, OSC };
}

function ema(data: number[], span: number): number[] {
  const alpha = 2 / (span + 1);
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

/**
 * Bollinger Bands(period, multiplier)
 */
function calcBollinger(
  closes: number[],
  period: number,
  mult: number
): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = sma(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (middle[i] === null) {
      upper.push(null);
      lower.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += (closes[j] - middle[i]!) ** 2;
      }
      const std = Math.sqrt(sum / period);
      upper.push(middle[i]! + mult * std);
      lower.push(middle[i]! - mult * std);
    }
  }

  return { upper, middle, lower };
}

/**
 * Resample daily candles to weekly/monthly.
 * Weekly: ends on Friday (matching Python W-FRI rule)
 * Monthly: ends on last day of month
 */
export function resampleCandles(
  candles: StockCandle[],
  timeframe: 'weekly' | 'monthly'
): StockCandle[] {
  if (!candles.length) return [];

  const groups: Map<string, StockCandle[]> = new Map();

  for (const c of candles) {
    const d = new Date(c.date);
    let key: string;

    if (timeframe === 'weekly') {
      // Find the Friday of this week
      const day = d.getDay(); // 0=Sun, 5=Fri
      const diff = (5 - day + 7) % 7;
      const friday = new Date(d);
      friday.setDate(d.getDate() + diff);
      key = friday.toISOString().slice(0, 10);
    } else {
      // Monthly: group by YYYY-MM
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  const result: StockCandle[] = [];
  for (const [key, group] of Array.from(groups.entries())) {
    if (!group.length) continue;
    const lastDate = timeframe === 'monthly'
      ? group[group.length - 1].date
      : key;

    result.push({
      date: lastDate,
      open: group[0].open,
      high: Math.max(...group.map(g => g.high)),
      low: Math.min(...group.map(g => g.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((s, g) => s + g.volume, 0),
      spread: group.reduce((s, g) => s + g.spread, 0),
      Trading_money: group.reduce((s, g) => s + g.Trading_money, 0),
      Trading_turnover: group.reduce((s, g) => s + g.Trading_turnover, 0),
    });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * VWAP — Volume Weighted Average Price
 * Typical Price = (H + L + C) / 3
 * VWAP = cumulative(TP * Volume) / cumulative(Volume)
 */
export function calcVWAP(candles: StockCandle[]): (number | null)[] {
  const result: (number | null)[] = [];
  let cumTPV = 0;
  let cumVol = 0;

  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    cumTPV += tp * c.volume;
    cumVol += c.volume;
    result.push(cumVol > 0 ? cumTPV / cumVol : null);
  }
  return result;
}

/**
 * Relative Strength — stock vs benchmark (normalized to 100 at start)
 * RS = (stock_close / stock_close[0]) / (bench_close / bench_close[0]) * 100
 */
export function calcRelativeStrength(
  candles: StockCandle[],
  benchmark: StockCandle[]
): (number | null)[] {
  if (!candles.length || !benchmark.length) return [];

  // Build benchmark map by date
  const benchMap = new Map<string, number>();
  for (const b of benchmark) {
    benchMap.set(b.date, b.close);
  }

  const result: (number | null)[] = [];
  let stockBase: number | null = null;
  let benchBase: number | null = null;

  for (const c of candles) {
    const benchClose = benchMap.get(c.date);
    if (benchClose === undefined) {
      result.push(result.length > 0 ? result[result.length - 1] : null);
      continue;
    }
    if (stockBase === null) {
      stockBase = c.close;
      benchBase = benchClose;
    }
    const stockRel = c.close / stockBase!;
    const benchRel = benchClose / benchBase!;
    result.push(benchRel > 0 ? (stockRel / benchRel) * 100 : null);
  }
  return result;
}

/**
 * Volume Profile — distribute volume into price buckets
 * Returns array of { price, volume, pct } sorted by price
 */
export interface VolumeProfileBucket {
  price: number;
  volume: number;
  pct: number; // percentage of max volume (0-1)
}

export function calcVolumeProfile(
  candles: StockCandle[],
  bucketCount: number = 24
): VolumeProfileBucket[] {
  if (!candles.length) return [];

  const minPrice = Math.min(...candles.map(c => c.low));
  const maxPrice = Math.max(...candles.map(c => c.high));
  const range = maxPrice - minPrice;

  if (range <= 0) return [];

  const bucketSize = range / bucketCount;
  const buckets: number[] = new Array(bucketCount).fill(0);

  for (const c of candles) {
    // Distribute volume across the candle's price range
    const tp = (c.high + c.low + c.close) / 3;
    const idx = Math.min(Math.floor((tp - minPrice) / bucketSize), bucketCount - 1);
    buckets[idx] += c.volume;
  }

  const maxVol = Math.max(...buckets);
  if (maxVol <= 0) return [];

  return buckets.map((vol, i) => ({
    price: minPrice + (i + 0.5) * bucketSize,
    volume: vol,
    pct: vol / maxVol,
  }));
}
