import Track3Page from '../../src/components/Track3Page';

// Disable static prerendering — wagmi/RainbowKit are client-only
export const dynamic = 'force-dynamic';

export default function Page() {
  return <Track3Page />;
}
