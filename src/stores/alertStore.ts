import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PriceAlert } from '@/lib/types';

interface AlertState {
  alerts: PriceAlert[];
  addAlert: (symbol: string, price: number, direction: 'above' | 'below') => void;
  removeAlert: (id: string) => void;
  markTriggered: (id: string) => void;
  getAlertsForSymbol: (symbol: string) => PriceAlert[];
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set, get) => ({
      alerts: [],
      addAlert: (symbol, price, direction) =>
        set((state) => ({
          alerts: [
            ...state.alerts,
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              symbol,
              price,
              direction,
              triggered: false,
              createdAt: Date.now(),
            },
          ],
        })),
      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),
      markTriggered: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, triggered: true } : a
          ),
        })),
      getAlertsForSymbol: (symbol) =>
        get().alerts.filter((a) => a.symbol === symbol && !a.triggered),
    }),
    {
      name: 'alert-storage',
      version: 1,
    }
  )
);
