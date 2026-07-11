import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: '留学サポートデスク｜短期滞在ビザ書類作成',
  description: '短期滞在ビザが必要な留学生向けに、招へい理由書と身元保証書を作成する学内業務用ツールです。',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
