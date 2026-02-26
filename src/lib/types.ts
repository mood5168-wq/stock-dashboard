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

export type IndicatorType = 'MA' | 'MA5' | 'MA10' | 'MA20' | 'MA60' | 'Volume' | 'RSI' | 'KD' | 'MACD' | 'Bollinger' | 'Chip' | 'VWAP' | 'RS' | 'VolumeProfile';

export interface PriceAlert {
  id: string;
  symbol: string;
  price: number;
  direction: 'above' | 'below';
  triggered: boolean;
  createdAt: number;
}

export type DrawingTool = 'crosshair' | 'trendline' | 'horizontal' | 'fibonacci' | null;
