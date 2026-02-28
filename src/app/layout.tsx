import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '打卡管理系統',
  description: '員工打卡、請假、排班、薪資管理系統',
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
