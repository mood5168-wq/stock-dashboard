'use client';

import { ReactNode, useState } from 'react';
import TopToolbar from './TopToolbar';
import LeftToolbar from './LeftToolbar';
import StatusBar from './StatusBar';
import ScannerPanel from '../widgets/ScannerPanel';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [scannerOpen, setScannerOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-[#131722]">
      <TopToolbar onToggleScanner={() => setScannerOpen((v) => !v)} scannerOpen={scannerOpen} />
      <div className="flex flex-1 min-h-0">
        <LeftToolbar />
        <main className="flex-1 min-w-0 overflow-hidden">
          {children}
        </main>
        <ScannerPanel open={scannerOpen} onClose={() => setScannerOpen(false)} />
      </div>
      <StatusBar />
    </div>
  );
}
