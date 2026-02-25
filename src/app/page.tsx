'use client';

import { useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ChartContainer from '@/components/chart/ChartContainer';
import WatchList from '@/components/widgets/WatchList';
import { useChartStore } from '@/stores/chartStore';

export default function Home() {
  const { setTimeframe } = useChartStore();

  // Keyboard shortcuts: 1=daily, 2=weekly, 3=monthly
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case '1': setTimeframe('daily'); break;
        case '2': setTimeframe('weekly'); break;
        case '3': setTimeframe('monthly'); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setTimeframe]);

  return (
    <DashboardLayout>
      <div className="flex h-full">
        <div className="flex-1 min-w-0">
          <ChartContainer />
        </div>
        <div className="w-52 shrink-0 hidden lg:block">
          <WatchList />
        </div>
      </div>
    </DashboardLayout>
  );
}
