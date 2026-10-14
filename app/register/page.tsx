import { Suspense } from 'react';
import RequireAuth from '../../src/components/RequireAuth';
import RegisterWizard from '../../src/components/RegisterWizard';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RequireAuth>
        <RegisterWizard />
      </RequireAuth>
    </Suspense>
  );
}
