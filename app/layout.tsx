import type { Metadata } from 'next';
import '../src/index.css';
import Providers from '../src/providers';

export const metadata: Metadata = {
  title: 'Telegraph — Miner Registry',
  icons: { icon: '/logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning silences false positives from browser extensions
    // (e.g. Grammarly, wallet/peer extensions) that inject attributes onto
    // <html>/<body> before React hydrates. It only suppresses warnings one
    // level deep, so it does not hide real mismatches inside our own UI.
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@200;300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
