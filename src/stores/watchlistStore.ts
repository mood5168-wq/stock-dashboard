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
    }
  )
);
