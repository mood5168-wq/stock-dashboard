import {
  OptionDailyEntry,
  OptionInstitutionalEntry,
  FuturesInstitutionalEntry,
  PCRatioPoint,
  OIStrikeData,
  InstitutionSentiment,
} from './types';

export function calcPCRatio(entries: OptionDailyEntry[]): PCRatioPoint[] {
  const dateMap = new Map<string, { callOI: number; putOI: number }>();

  for (const e of entries) {
    if (e.trading_session !== 'position') continue;
    const rec = dateMap.get(e.date) || { callOI: 0, putOI: 0 };
    if (isCall(e.call_put)) {
      rec.callOI += e.open_interest;
    } else {
      rec.putOI += e.open_interest;
    }
    dateMap.set(e.date, rec);
  }

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { callOI, putOI }]) => ({
      date,
      callOI,
      putOI,
      pcRatio: callOI > 0 ? (putOI / callOI) * 100 : 0,
    }));
}

export function calcOIDistribution(
  entries: OptionDailyEntry[]
): { data: OIStrikeData[]; maxCallStrike: number; maxPutStrike: number } {
  if (!entries.length) {
    return { data: [], maxCallStrike: 0, maxPutStrike: 0 };
  }

  // 取最新一天
  const latestDate = entries
    .filter((e) => e.trading_session !== 'after_market')
    .reduce((max, e) => (e.date > max ? e.date : max), '');

  const latest = entries.filter(
    (e) => e.date === latestDate && e.trading_session !== 'after_market'
  );

  const strikeMap = new Map<number, { callOI: number; putOI: number }>();
  for (const e of latest) {
    const rec = strikeMap.get(e.strike_price) || { callOI: 0, putOI: 0 };
    if (isCall(e.call_put)) {
      rec.callOI += e.open_interest;
    } else {
      rec.putOI += e.open_interest;
    }
    strikeMap.set(e.strike_price, rec);
  }

  const allStrikes = Array.from(strikeMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([strikePrice, { callOI, putOI }]) => ({ strikePrice, callOI, putOI }));

  // 過濾: 只保留中間有量的履約價 (上下各留 10 個)
  const withOI = allStrikes.filter((s) => s.callOI > 0 || s.putOI > 0);
  const mid = Math.floor(withOI.length / 2);
  const start = Math.max(0, mid - 10);
  const end = Math.min(withOI.length, mid + 10);
  const data = withOI.slice(start, end);

  let maxCallStrike = 0;
  let maxCallOI = 0;
  let maxPutStrike = 0;
  let maxPutOI = 0;

  for (const s of data) {
    if (s.callOI > maxCallOI) {
      maxCallOI = s.callOI;
      maxCallStrike = s.strikePrice;
    }
    if (s.putOI > maxPutOI) {
      maxPutOI = s.putOI;
      maxPutStrike = s.strikePrice;
    }
  }

  return { data, maxCallStrike, maxPutStrike };
}

function isCall(callPut: string): boolean {
  return callPut === 'call' || callPut === '買權';
}

const NAME_MAP: Record<string, string> = {
  外資及陸資: '外資',
  外資: '外資',
  自營商: '自營',
  投信: '投信',
  Foreign_Investor: '外資',
  Dealer_self: '自營',
  Investment_Trust: '投信',
};

function normalizeName(raw: string): string {
  return NAME_MAP[raw] || raw;
}

export function calcInstitutionalSentiment(
  optionInst: OptionInstitutionalEntry[],
  futuresInst: FuturesInstitutionalEntry[]
): InstitutionSentiment[] {
  if (!optionInst.length) return [];

  // 取最新日期
  const latestOptDate = optionInst.reduce((max, e) => (e.date > max ? e.date : max), '');
  const latestFutDate = futuresInst.length
    ? futuresInst.reduce((max, e) => (e.date > max ? e.date : max), '')
    : '';

  const optLatest = optionInst.filter((e) => e.date === latestOptDate);
  const futLatest = futuresInst.filter((e) => e.date === latestFutDate);

  const instMap = new Map<string, { callNet: number; putNet: number; futuresNet: number }>();

  for (const e of optLatest) {
    const name = normalizeName(e.name);
    const rec = instMap.get(name) || { callNet: 0, putNet: 0, futuresNet: 0 };
    const net = e.long_open_interest_balance_volume - e.short_open_interest_balance_volume;
    if (isCall(e.call_put)) {
      rec.callNet += net;
    } else {
      rec.putNet += net;
    }
    instMap.set(name, rec);
  }

  for (const e of futLatest) {
    const name = normalizeName(e.name);
    const rec = instMap.get(name) || { callNet: 0, putNet: 0, futuresNet: 0 };
    rec.futuresNet += e.long_open_interest_balance_volume - e.short_open_interest_balance_volume;
    instMap.set(name, rec);
  }

  const order = ['外資', '投信', '自營'];
  return order
    .filter((n) => instMap.has(n))
    .map((name) => {
      const { callNet, putNet, futuresNet } = instMap.get(name)!;
      let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      // 期貨淨多 + call偏多 (or put偏空) = bullish
      const bullishSignals = (futuresNet > 0 ? 1 : 0) + (callNet > 0 ? 1 : 0) + (putNet < 0 ? 1 : 0);
      if (bullishSignals >= 2) sentiment = 'bullish';
      else if (bullishSignals === 0) sentiment = 'bearish';
      return { name, callNet, putNet, futuresNet, sentiment };
    });
}

export function calcOptionSignalScore(
  pcRatioData: PCRatioPoint[],
  institutional: InstitutionSentiment[]
): { score: number; description: string } {
  let score = 0;
  const parts: string[] = [];

  if (pcRatioData.length > 0) {
    const latest = pcRatioData[pcRatioData.length - 1];
    if (latest.pcRatio > 120) {
      score += 0.5;
      parts.push(`P/C偏高(${latest.pcRatio.toFixed(0)})`);
    } else if (latest.pcRatio < 80) {
      score -= 0.5;
      parts.push(`P/C偏低(${latest.pcRatio.toFixed(0)})`);
    } else {
      parts.push(`P/C中性(${latest.pcRatio.toFixed(0)})`);
    }
  }

  if (institutional.length > 0) {
    const bullish = institutional.filter((i) => i.sentiment === 'bullish').length;
    const bearish = institutional.filter((i) => i.sentiment === 'bearish').length;
    if (bullish > bearish) {
      score += 0.5;
      parts.push('法人偏多');
    } else if (bearish > bullish) {
      score -= 0.5;
      parts.push('法人偏空');
    } else {
      parts.push('法人中性');
    }
  }

  return { score, description: parts.join(', ') || '無資料' };
}
