import { ChipEntry, ChipSummary } from './types';

/**
 * 大戶持股級距（≥1000 股 = 1 張以上，14 級距全列）
 */
export const LARGE_HOLDER_LEVELS = [
  '1,000-5,000', '5,001-10,000', '10,001-15,000',
  '15,001-20,000', '20,001-30,000', '30,001-40,000',
  '40,001-50,000', '50,001-100,000', '100,001-200,000',
  '200,001-400,000', '400,001-600,000', '600,001-800,000',
  '800,001-1,000,000', 'more than 1,000,001',
];

/**
 * 把 FinMind 股權分散資料壓成「每日大戶總持股 %」時序。
 * Matches Python calc_chip_summary (app.py:164-188)
 */
export function calcChipSummary(entries: ChipEntry[]): ChipSummary[] {
  const dateMap = new Map<string, number>();

  for (const e of entries) {
    if (LARGE_HOLDER_LEVELS.includes(e.HoldingSharesLevel)) {
      dateMap.set(e.date, (dateMap.get(e.date) || 0) + e.percent);
    }
  }

  const sorted = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b));

  return sorted.map(([date, large_pct], i) => ({
    date,
    large_pct,
    pct_chg: i === 0 ? null : large_pct - sorted[i - 1][1],
  }));
}
