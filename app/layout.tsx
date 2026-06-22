import type { Metadata } from 'next';
import '../src/index.css';
import Providers from '../src/providers';

export const metadata: Metadata = {
  title: 'Telegraph — Miner Registry',
  description: 'Register your Telegraph Protocol miner node.',
  metadataBase: new URL('https://integrate.telegraphprotocol.com'),
  icons: { icon: '/logo.png' },
  openGraph: {
    title: 'Telegraph — Miner Registry',
    description: 'Register your Telegraph Protocol miner node.',
    url: 'https://integrate.telegraphprotocol.com',
    siteName: 'Telegraph Miner Registry',
    images: [
      {
        url: '/telegraph-social-card.jpg',
        width: 1200,
        height: 630,
        alt: 'Telegraph Protocol',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Telegraph — Miner Registry',
    description: 'Register your Telegraph Protocol miner node.',
    images: ['/telegraph-social-card.jpg'],
  },
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
