'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { useSession } from '../hooks/useSession';
import { useAuthModal } from './AuthModalProvider';

const REASON = 'You need to register in order to progress';

/** Renders its children only for signed-in users; everyone else gets the sign-in modal, and dismissing it goes home. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useSession();
  const { openLogin } = useAuthModal();

  useEffect(() => {
    if (isLoading || user) return;
    openLogin({ tab: 'signup', reason: REASON, onClose: () => router.push('/') });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user]);

  if (isLoading || !user) return null;
  return <>{children}</>;
}
