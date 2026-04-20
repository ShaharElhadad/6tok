import type { Metadata } from 'next';
import { Rubik } from 'next/font/google';
import './globals.css';

const rubik = Rubik({
  subsets: ['latin', 'hebrew'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-rubik',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '6TOK — למכור בביטחון',
  description: 'מערכת ניתוח שיחות מכירה — העלאה, תמלול, וניתוח AI של קירובים, הרחקות, טון ורגש',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
