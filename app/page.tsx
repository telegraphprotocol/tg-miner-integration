import LandingPage from '../src/components/LandingPage';

// Disable static prerendering — wagmi/RainbowKit are client-only
export const dynamic = 'force-dynamic';

export default function Page() {
  return <LandingPage />;
}
