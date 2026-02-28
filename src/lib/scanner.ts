import { StockCandle } from './types';
import { calcIndicators } from './indicators';

export type ScanStrategy =
  | 'bullish_align'    // 多頭排列: MA5 > MA10 > MA20 > MA60
  | 'bearish_align'    // 空頭排列: MA5 < MA10 < MA20 < MA60
  | 'golden_cross'     // 黃金交叉: MA5 上穿 MA20 (近3日)
  | 'death_cross'      // 死亡交叉: MA5 下穿 MA20 (近3日)
  | 'ma_converge'      // 均線糾結: 四條 MA 價差 < 2%
  | 'above_all_ma'     // 站上所有均線: close > MA5/10/20/60
  | 'above_3ma';       // 站上三線: close > MA10/20/60 但 < MA5

export interface ScanStrategyInfo {
  key: ScanStrategy;
  label: string;
  description: string;
  color: string;
}

export const STRATEGIES: ScanStrategyInfo[] = [
  { key: 'bullish_align', label: '剛完成多頭排列', description: '今日剛形成 MA5>MA10>MA20>MA60', color: '#EF4444' },
  { key: 'bearish_align', label: '空頭排列', description: 'MA5 < MA10 < MA20 < MA60', color: '#10B981' },
  { key: 'golden_cross', label: '黃金交叉', description: 'MA5 近3日上穿 MA20', color: '#F59E0B' },
  { key: 'death_cross', label: '死亡交叉', description: 'MA5 近3日下穿 MA20', color: '#8B5CF6' },
  { key: 'ma_converge', label: '均線糾結', description: '四條MA價差<2%', color: '#3B82F6' },
  { key: 'above_all_ma', label: '站上所有均線', description: '收盤價 > 所有MA', color: '#EC4899' },
  { key: 'above_3ma', label: '剛站上三線', description: '站上10/20/60MA 未過5MA', color: '#14B8A6' },
];

export type ScanScope = 'thousand' | 'twse' | 'tpex' | 'all';

export interface ScanScopeInfo {
  key: ScanScope;
  label: string;
  description: string;
}

export const SCAN_SCOPES: ScanScopeInfo[] = [
  { key: 'thousand', label: '千元股', description: '36 檔' },
  { key: 'twse', label: '上市', description: '~980 檔' },
  { key: 'tpex', label: '上櫃', description: '~800 檔' },
  { key: 'all', label: '全市場', description: '~1800 檔' },
];

export interface ScanResult {
  code: string;
  name: string;
  close: number;
  change: number;        // spread (price change)
  changePct: number;     // percentage change
  matched: boolean;
}

/**
 * Run a scan strategy against a stock's candle data.
 * Returns whether the stock matches the strategy, using the most recent data points.
 */
export function runScan(candles: StockCandle[], strategy: ScanStrategy): boolean {
  if (candles.length < 61) return false; // Need at least 61 bars for MA60

  const indicators = calcIndicators(candles);
  const last = candles.length - 1;

  const ma5 = indicators.MA5[last];
  const ma10 = indicators.MA10[last];
  const ma20 = indicators.MA20[last];
  const ma60 = indicators.MA60[last];

  if (ma5 === null || ma10 === null || ma20 === null || ma60 === null) return false;

  const close = candles[last].close;

  switch (strategy) {
    case 'bullish_align': {
      // 今天是多頭排列
      const todayBull = ma5 > ma10 && ma10 > ma20 && ma20 > ma60;
      if (!todayBull) return false;
      // 昨天不是多頭排列（剛形成）
      if (last < 1) return false;
      const pMa5 = indicators.MA5[last - 1];
      const pMa10 = indicators.MA10[last - 1];
      const pMa20 = indicators.MA20[last - 1];
      const pMa60 = indicators.MA60[last - 1];
      if (pMa5 === null || pMa10 === null || pMa20 === null || pMa60 === null) return todayBull;
      const yestBull = pMa5 > pMa10 && pMa10 > pMa20 && pMa20 > pMa60;
      return !yestBull;
    }

    case 'bearish_align':
      return ma5 < ma10 && ma10 < ma20 && ma20 < ma60;

    case 'golden_cross':
      return checkCross(indicators.MA5, indicators.MA20, last, 'up');

    case 'death_cross':
      return checkCross(indicators.MA5, indicators.MA20, last, 'down');

    case 'ma_converge': {
      const vals = [ma5, ma10, ma20, ma60];
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      const mid = (max + min) / 2;
      return mid > 0 && (max - min) / mid < 0.02;
    }

    case 'above_all_ma':
      return close > ma5 && close > ma10 && close > ma20 && close > ma60;

    case 'above_3ma':
      // 股價站上 MA10/20/60 但尚未站上 MA5（剛突破中長期均線，短均還沒跟上）
      return close > ma10 && close > ma20 && close > ma60 && close <= ma5;

    default:
      return false;
  }
}

/**
 * Check if shortMA crossed longMA in the last `lookback` bars.
 * direction: 'up' = short crossed above long, 'down' = short crossed below long
 */
function checkCross(
  shortMA: (number | null)[],
  longMA: (number | null)[],
  lastIdx: number,
  direction: 'up' | 'down',
  lookback: number = 3
): boolean {
  for (let i = lastIdx; i > lastIdx - lookback && i > 0; i--) {
    const sCurr = shortMA[i];
    const lCurr = longMA[i];
    const sPrev = shortMA[i - 1];
    const lPrev = longMA[i - 1];

    if (sCurr === null || lCurr === null || sPrev === null || lPrev === null) continue;

    if (direction === 'up') {
      if (sPrev <= lPrev && sCurr > lCurr) return true;
    } else {
      if (sPrev >= lPrev && sCurr < lCurr) return true;
    }
  }
  return false;
}
