import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Mexico Trip',
  description: 'Josiah + Débora · 1–10 May 2026',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#faf5ee',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
