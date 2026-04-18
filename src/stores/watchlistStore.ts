'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const WATCHLIST_MAX = 50;

export interface WatchlistItem {
  code: string;
  name: string;
}

interface WatchlistState {
  items: WatchlistItem[];
  addItem: (item: WatchlistItem) => { ok: boolean; reason?: 'duplicate' | 'full' };
  removeItem: (code: string) => void;
  isTracking: (code: string) => boolean;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const state = get();
        if (state.items.some((entry) => entry.code === item.code)) {
          return { ok: false, reason: 'duplicate' };
        }
        if (state.items.length >= WATCHLIST_MAX) {
          return { ok: false, reason: 'full' };
        }
        set({ items: [...state.items, item] });
        return { ok: true };
      },
      removeItem: (code) =>
        set((state) => ({
          items: state.items.filter((item) => item.code !== code),
        })),
      isTracking: (code) => get().items.some((item) => item.code === code),
    }),
    {
      name: 'dashboard.watchlist',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      // 未來若 schema 變動（例：加 addedAt），在此轉換舊資料而非讓它靜默壞掉
      migrate: (persisted: unknown, version): { items: WatchlistItem[] } => {
        if (!persisted || typeof persisted !== 'object') return { items: [] };
        const state = persisted as { items?: unknown };
        if (!Array.isArray(state.items)) return { items: [] };
        const items = state.items
          .filter((it): it is WatchlistItem =>
            !!it && typeof it === 'object' &&
            typeof (it as WatchlistItem).code === 'string' &&
            typeof (it as WatchlistItem).name === 'string'
          )
          .slice(0, WATCHLIST_MAX);
        return { items };
      },
    }
  )
);
