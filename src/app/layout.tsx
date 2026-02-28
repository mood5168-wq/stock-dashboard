import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '台股技術分析 | TradingView Style',
  description: 'K線 + 技術指標 + 大戶籌碼 + 複合訊號',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased">{children}</body>
    </html>
  );
}
