import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DTRS SYSTEM • Compound Delay & Segment Engine',
  description: 'Compound ETA & Delay Calculation Engine across operational scenarios and corridor route segmentations in DTRS SYSTEM.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🚆</text></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-irctc-bg text-irctc-text antialiased">
        {children}
      </body>
    </html>
  );
}
