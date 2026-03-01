export interface StockCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  spread: number;
  Trading_money: number;
  Trading_turnover: number;
}

export interface ChipEntry {
  date: string;
  HoldingSharesLevel: string;
  percent: number;
}

export interface ChipSummary {
  date: string;
  large_pct: number;
  pct_chg: number | null;
}

export interface IndicatorData {
  MA5: (number | null)[];
  MA10: (number | null)[];
  MA20: (number | null)[];
  MA60: (number | null)[];
  RSI: (number | null)[];
  K: (number | null)[];
  D: (number | null)[];
  DIF: (number | null)[];
  DEM: (number | null)[];
  OSC: (number | null)[];
  BB_upper: (number | null)[];
  BB_middle: (number | null)[];
  BB_lower: (number | null)[];
}

export interface SignalDetail {
  name: string;
  score: number;
  description: string;
}

export interface SignalResult {
  signal: string;
  total: number;
  details: SignalDetail[];
}

export type Timeframe = 'daily' | 'weekly' | 'monthly';

export type IndicatorType = 'MA' | 'MA5' | 'MA10' | 'MA20' | 'MA60' | 'Volume' | 'RSI' | 'KD' | 'MACD' | 'Bollinger' | 'Chip' | 'VWAP' | 'RS' | 'VolumeProfile' | 'PCRatio' | 'OIDistribution' | 'OptionSentiment';

// FinMind 選擇權原始資料
export interface OptionDailyEntry {
  date: string;
  option_id: string;
  contract_date: string;
  strike_price: number;
  call_put: string;
  open: number;
  max: number;
  min: number;
  close: number;
  volume: number;
  open_interest: number;
  trading_session: string;
}

export interface OptionInstitutionalEntry {
  date: string;
  name: string;
  call_put: string;
  long_deal_volume: number;
  short_deal_volume: number;
  long_open_interest_balance_volume: number;
  short_open_interest_balance_volume: number;
}

export interface FuturesInstitutionalEntry {
  date: string;
  name: string;
  long_open_interest_balance_volume: number;
  short_open_interest_balance_volume: number;
}

// 計算結果
export interface PCRatioPoint {
  date: string;
  callOI: number;
  putOI: number;
  pcRatio: number;
}

export interface OIStrikeData {
  strikePrice: number;
  callOI: number;
  putOI: number;
}

export interface InstitutionSentiment {
  name: string;
  callNet: number;
  putNet: number;
  futuresNet: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface PriceAlert {
  id: string;
  symbol: string;
  price: number;
  direction: 'above' | 'below';
  triggered: boolean;
  createdAt: number;
}

export type DrawingTool = 'crosshair' | 'trendline' | 'horizontal' | 'fibonacci' | null;
