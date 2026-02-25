'use client';

import { ReactNode } from 'react';
import TopToolbar from './TopToolbar';
import LeftToolbar from './LeftToolbar';
import StatusBar from './StatusBar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-[#131722]">
      <TopToolbar />
      <div className="flex flex-1 min-h-0">
        <LeftToolbar />
        <main className="flex-1 min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
