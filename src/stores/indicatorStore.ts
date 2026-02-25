import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IndicatorType } from '@/lib/types';

interface IndicatorState {
  visible: Record<IndicatorType, boolean>;
  toggle: (indicator: IndicatorType) => void;
  setVisible: (indicator: IndicatorType, value: boolean) => void;
}

export const useIndicatorStore = create<IndicatorState>()(
  persist(
    (set) => ({
      visible: {
        MA: true,
        MA5: true,
        MA10: true,
        MA20: true,
        MA60: true,
        Volume: true,
        RSI: true,
        KD: false,
        MACD: true,
        Bollinger: false,
        Chip: true,
      },
      toggle: (indicator) =>
        set((state) => {
          const newVisible = { ...state.visible, [indicator]: !state.visible[indicator] };
          // When toggling master MA switch, also toggle all sub-MAs
          if (indicator === 'MA') {
            const val = newVisible.MA;
            newVisible.MA5 = val;
            newVisible.MA10 = val;
            newVisible.MA20 = val;
            newVisible.MA60 = val;
          }
          // When any sub-MA is toggled on, ensure master MA is on; if all off, turn master off
          if (['MA5', 'MA10', 'MA20', 'MA60'].includes(indicator)) {
            const anyOn = newVisible.MA5 || newVisible.MA10 || newVisible.MA20 || newVisible.MA60;
            newVisible.MA = anyOn;
          }
          return { visible: newVisible };
        }),
      setVisible: (indicator, value) =>
        set((state) => ({
          visible: { ...state.visible, [indicator]: value },
        })),
    }),
    {
      name: 'indicator-storage',
      version: 2,
      merge: (persisted, current) => {
        const p = persisted as Partial<IndicatorState> | undefined;
        if (!p?.visible) return current;
        return {
          ...current,
          visible: { ...current.visible, ...p.visible },
        };
      },
    }
  )
);
