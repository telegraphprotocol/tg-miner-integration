import { Suspense } from 'react';
import RegisterWizard from '../../src/components/RegisterWizard';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RegisterWizard />
    </Suspense>
  );
}
