import { StockCandle, IndicatorData, ChipSummary, PCRatioPoint, InstitutionSentiment, SignalResult, SignalDetail } from './types';
import { calcOptionSignalScore } from './options';

/**
 * Composite signal scoring — ported from Python app.py:221-300
 * 6 factors: MA, RSI, KD, MACD, Chip, Options
 */
export function getSignal(
  candles: StockCandle[],
  indicators: IndicatorData,
  chipSummary: ChipSummary[] | null,
  optionsData?: { pcRatio: PCRatioPoint[]; institutional: InstitutionSentiment[] }
): SignalResult {
  if (candles.length < 60) {
    return { signal: '數據不足', total: 0, details: [] };
  }

  const i = candles.length - 1;
  const close = candles[i].close;
  const details: SignalDetail[] = [];

  // MA score
  const ma5 = indicators.MA5[i];
  const ma10 = indicators.MA10[i];
  const ma20 = indicators.MA20[i];
  const ma60 = indicators.MA60[i];

  if (ma5 !== null && ma10 !== null && ma20 !== null && ma60 !== null) {
    if (close > ma5 && ma5 > ma10 && ma10 > ma20 && ma20 > ma60) {
      details.push({ name: '均線', score: 2, description: '四均多頭' });
    } else if (close < ma60) {
      details.push({ name: '均線', score: -2, description: '跌破MA60' });
    } else if (close < ma20) {
      details.push({ name: '均線', score: -1, description: '跌破MA20' });
    } else {
      details.push({ name: '均線', score: 0, description: '盤整' });
    }
  } else {
    details.push({ name: '均線', score: 0, description: '計算中' });
  }

  // RSI score
  const rsi = indicators.RSI[i];
  if (rsi !== null) {
    if (rsi > 70) {
      details.push({ name: 'RSI', score: -1, description: `超買(${rsi.toFixed(0)})` });
    } else if (rsi < 30) {
      details.push({ name: 'RSI', score: 1, description: `超賣(${rsi.toFixed(0)})` });
    } else if (rsi > 50) {
      details.push({ name: 'RSI', score: 0.5, description: `偏多(${rsi.toFixed(0)})` });
    } else {
      details.push({ name: 'RSI', score: -0.5, description: `偏空(${rsi.toFixed(0)})` });
    }
  }

  // KD score
  const k = indicators.K[i];
  const d = indicators.D[i];
  if (k !== null && d !== null) {
    if (k > 80) {
      details.push({ name: 'KD', score: -0.5, description: '超買' });
    } else if (k < 20) {
      details.push({ name: 'KD', score: 0.5, description: '超賣' });
    } else if (k > d) {
      details.push({ name: 'KD', score: 0.5, description: 'K>D' });
    } else {
      details.push({ name: 'KD', score: -0.5, description: 'K<D' });
    }
  }

  // MACD score
  const dif = indicators.DIF[i];
  const dem = indicators.DEM[i];
  if (dif !== null && dem !== null) {
    if (dif > dem) {
      details.push({ name: 'MACD', score: 1, description: '多頭' });
    } else {
      details.push({ name: 'MACD', score: -1, description: '空頭' });
    }
  }

  // Chip score
  if (chipSummary && chipSummary.length >= 2) {
    const latest = chipSummary[chipSummary.length - 1];
    const chg = latest.pct_chg;
    if (chg !== null) {
      if (chg > 0.3) {
        details.push({ name: '籌碼', score: 1, description: '大戶吸籌' });
      } else if (chg < -0.3) {
        details.push({ name: '籌碼', score: -1, description: '大戶出貨' });
      } else {
        details.push({ name: '籌碼', score: 0, description: '持平' });
      }
    }
  }

  // Options score (factor 6)
  if (optionsData && (optionsData.pcRatio.length > 0 || optionsData.institutional.length > 0)) {
    const { score, description } = calcOptionSignalScore(optionsData.pcRatio, optionsData.institutional);
    details.push({ name: '選擇權', score, description });
  }

  const total = details.reduce((s, d) => s + d.score, 0);

  let signal: string;
  if (total >= 2.5) signal = '🟢 強力買進';
  else if (total >= 1) signal = '📈 偏多';
  else if (total <= -2.5) signal = '🔴 建議賣出';
  else if (total <= -1) signal = '📉 偏空';
  else signal = '➡️ 觀望';

  return { signal, total, details };
}
