import App from '../src/App';

// Disable static prerendering — wagmi/RainbowKit are client-only
export const dynamic = 'force-dynamic';

export default function Page() {
  return <App />;
}
