import { StockCandle, ChipEntry, OptionDailyEntry, OptionInstitutionalEntry, FuturesInstitutionalEntry } from './types';

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
      open: Number(d.open) || 0,
      high: Number(d.max) || 0,   // FinMind uses 'max'
      low: Number(d.min) || 0,    // FinMind uses 'min'
      close: Number(d.close) || 0,
      volume: Number(d.Trading_Volume) || 0,
      spread: Number(d.spread) || 0,
      Trading_money: Number(d.Trading_money) || 0,
      Trading_turnover: Number(d.Trading_turnover) || 0,
    }))
    .filter((c: StockCandle) => c.close > 0 && c.high > 0 && c.low > 0)
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

export async function fetchOptionDaily(
  days: number,
  token: string
): Promise<OptionDailyEntry[]> {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const params = new URLSearchParams({
    dataset: 'TaiwanOptionDaily',
    data_id: 'TXO',
    start_date: startDate,
    end_date: endDate,
    token,
  });

  const res = await fetch(`${FINMIND_BASE}?${params}`, { cache: 'no-store' });
  const json = await res.json();

  if (json.status !== 200) {
    throw new Error(json.msg || 'API error');
  }

  if (!json.data?.length) return [];

  return json.data.map((d: Record<string, unknown>) => ({
    date: d.date as string,
    option_id: d.option_id as string,
    contract_date: d.contract_date as string,
    strike_price: d.strike_price as number,
    call_put: d.call_put as string,
    open: d.open as number,
    max: d.max as number,
    min: d.min as number,
    close: d.close as number,
    volume: d.volume as number,
    open_interest: d.open_interest as number,
    trading_session: d.trading_session as string,
  }));
}

export async function fetchOptionInstitutional(
  days: number,
  token: string
): Promise<OptionInstitutionalEntry[]> {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const params = new URLSearchParams({
    dataset: 'TaiwanOptionInstitutionalInvestors',
    data_id: 'TXO',
    start_date: startDate,
    end_date: endDate,
    token,
  });

  const res = await fetch(`${FINMIND_BASE}?${params}`, { cache: 'no-store' });
  const json = await res.json();

  if (json.status !== 200) {
    throw new Error(json.msg || 'API error');
  }

  if (!json.data?.length) return [];

  return json.data.map((d: Record<string, unknown>) => ({
    date: d.date as string,
    name: d.institutional_investors as string,
    call_put: d.call_put as string,
    long_deal_volume: d.long_deal_volume as number,
    short_deal_volume: d.short_deal_volume as number,
    long_open_interest_balance_volume: d.long_open_interest_balance_volume as number,
    short_open_interest_balance_volume: d.short_open_interest_balance_volume as number,
  }));
}

export async function fetchFuturesInstitutional(
  days: number,
  token: string
): Promise<FuturesInstitutionalEntry[]> {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const params = new URLSearchParams({
    dataset: 'TaiwanFuturesInstitutionalInvestors',
    data_id: 'TX',
    start_date: startDate,
    end_date: endDate,
    token,
  });

  const res = await fetch(`${FINMIND_BASE}?${params}`, { cache: 'no-store' });
  const json = await res.json();

  if (json.status !== 200) {
    throw new Error(json.msg || 'API error');
  }

  if (!json.data?.length) return [];

  return json.data.map((d: Record<string, unknown>) => ({
    date: d.date as string,
    name: d.institutional_investors as string,
    long_open_interest_balance_volume: d.long_open_interest_balance_volume as number,
    short_open_interest_balance_volume: d.short_open_interest_balance_volume as number,
  }));
}
