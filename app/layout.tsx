import type { Metadata } from 'next';
import Script from 'next/script';
import '../src/index.css';
import Providers from '../src/providers';
import GlobalProviders from '../src/components/GlobalProviders';

export const metadata: Metadata = {
  title: 'Telegraph · Developer Console',
  description: 'Monetize your APIs, write evaluation scripts, and build autonomous agents powered by scored intelligence.',
  metadataBase: new URL('https://integrate.telegraphprotocol.com'),
  icons: { icon: '/logo.png' },
  openGraph: {
    title: 'Telegraph · Developer Console',
    description: 'Monetize your APIs, write evaluation scripts, and build autonomous agents powered by scored intelligence.',
    url: 'https://integrate.telegraphprotocol.com',
    siteName: 'Telegraph Developer Console',
    images: [
      {
        url: '/telegraph-social-card.jpg',
        width: 1200,
        height: 630,
        alt: 'Telegraph',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Telegraph · Developer Console',
    description: 'Monetize your APIs, write evaluation scripts, and build autonomous agents powered by scored intelligence.',
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
        {/* X (Twitter) conversion tracking base pixel — event fired on successful signup, see src/lib/xPixel.ts.
            strategy="beforeInteractive" is required here: it's the only Script strategy Next.js hoists into
            the server-rendered <head> before </head>, which is what X's install checker verifies. */}
        <Script id="x-pixel-base" strategy="beforeInteractive">
          {`!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
twq('config','rcv9y');`}
        </Script>
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <GlobalProviders>{children}</GlobalProviders>
        </Providers>
      </body>
    </html>
  );
}
