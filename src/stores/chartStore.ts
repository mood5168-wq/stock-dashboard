import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Timeframe, DrawingTool } from '@/lib/types';
import { DEFAULT_STOCK } from '@/lib/constants';

interface ChartState {
  symbol: string;
  symbolName: string;
  timeframe: Timeframe;
  drawingTool: DrawingTool;
  crosshairTime: string | null;
  crosshairIndex: number | null;

  setSymbol: (symbol: string, name: string) => void;
  setTimeframe: (tf: Timeframe) => void;
  setDrawingTool: (tool: DrawingTool) => void;
  setCrosshair: (time: string | null, index: number | null) => void;
}

export const useChartStore = create<ChartState>()(
  persist(
    (set) => ({
      symbol: DEFAULT_STOCK,
      symbolName: '台積電',
      timeframe: 'daily',
      drawingTool: 'crosshair',
      crosshairTime: null,
      crosshairIndex: null,

      setSymbol: (symbol, name) => set({ symbol, symbolName: name }),
      setTimeframe: (timeframe) => set({ timeframe }),
      setDrawingTool: (drawingTool) => set({ drawingTool }),
      setCrosshair: (crosshairTime, crosshairIndex) => set({ crosshairTime, crosshairIndex }),
    }),
    {
      name: 'chart-storage',
      partialize: (state) => ({ 
        symbol: state.symbol, 
        symbolName: state.symbolName, 
        timeframe: state.timeframe 
      }), // 只儲存股票代碼、名稱和時間週期，不儲存十字游標位置
    }
  )
);
