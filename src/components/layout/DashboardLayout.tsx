'use client';

import { ReactNode, useState } from 'react';
import TopToolbar from './TopToolbar';
import LeftToolbar from './LeftToolbar';
import StatusBar from './StatusBar';
import ScannerPanel from '../widgets/ScannerPanel';
import { ScanStrategy } from '@/lib/scanner';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [initialStrategy, setInitialStrategy] = useState<ScanStrategy | null>(null);

  const openOldwang = () => {
    setInitialStrategy('four_dragons');
    setScannerOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-[#131722]">
      <TopToolbar
        onToggleScanner={() => {
          setInitialStrategy(null);
          setScannerOpen((v) => !v);
        }}
        scannerOpen={scannerOpen}
        onOpenOldwang={openOldwang}
      />
      <div className="flex flex-1 min-h-0">
        <LeftToolbar />
        <main className="flex-1 min-w-0 overflow-hidden">
          {children}
        </main>
        <ScannerPanel
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          initialStrategy={initialStrategy}
        />
      </div>
      <StatusBar />
    </div>
  );
}
