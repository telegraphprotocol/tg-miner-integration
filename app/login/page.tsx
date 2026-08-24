import { Suspense } from 'react';
import AuthPage from '../../src/components/AuthPage';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AuthPage />
    </Suspense>
  );
}
