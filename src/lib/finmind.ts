import { StockCandle, ChipEntry } from './types';

const FINMIND_BASE = 'https://api.finmindtrade.com/api/v4/data';

export async function fetchStockData(
  stockId: string,
  days: number,
  token: string,
  adjusted: boolean = false
): Promise<StockCandle[]> {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const params = new URLSearchParams({
    dataset: adjusted ? 'TaiwanStockPriceAdj' : 'TaiwanStockPrice',
    data_id: stockId,
    start_date: startDate,
    end_date: endDate,
    token,
  });

  const res = await fetch(`${FINMIND_BASE}?${params}`, { next: { revalidate: 300 } });
  const json = await res.json();

  if (json.status !== 200) {
    throw new Error(json.msg || 'API error');
  }

  if (!json.data?.length) {
    return []; // No data available (newly listed, suspended, etc.)
  }

  return json.data
    .map((d: Record<string, unknown>) => ({
      date: d.date as string,
      open: d.open as number,
      high: d.max as number,   // FinMind uses 'max'
      low: d.min as number,    // FinMind uses 'min'
      close: d.close as number,
      volume: d.Trading_Volume as number,
      spread: d.spread as number,
      Trading_money: d.Trading_money as number,
      Trading_turnover: d.Trading_turnover as number,
    }))
    .sort((a: StockCandle, b: StockCandle) => a.date.localeCompare(b.date));
}

export async function fetchChipData(
  stockId: string,
  days: number,
  token: string
): Promise<ChipEntry[]> {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const params = new URLSearchParams({
    dataset: 'TaiwanStockHoldingSharesPer',
    data_id: stockId,
    start_date: startDate,
    end_date: endDate,
    token,
  });

  const res = await fetch(`${FINMIND_BASE}?${params}`, { next: { revalidate: 600 } });
  const json = await res.json();

  if (json.status !== 200 || !json.data?.length) {
    throw new Error(json.msg || 'No chip data');
  }

  return json.data.map((d: Record<string, unknown>) => ({
    date: d.date as string,
    HoldingSharesLevel: d.HoldingSharesLevel as string,
    percent: d.percent as number,
  }));
}
