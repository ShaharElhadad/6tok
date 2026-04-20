import type { Metadata } from 'next';
import { Rubik, Frank_Ruhl_Libre, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const rubik = Rubik({
  subsets: ['latin', 'hebrew'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-rubik',
  display: 'swap',
});

const frank = Frank_Ruhl_Libre({
  subsets: ['latin', 'hebrew'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-frank',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: '6TOK — למכור בביטחון',
  description:
    'מערכת ניתוח שיחות מכירה — העלאה, תמלול מדויק, וניתוח AI של קירובים, הרחקות, טון ורגש',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${rubik.variable} ${frank.variable} ${mono.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
