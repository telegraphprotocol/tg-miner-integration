'use client';

import Header from './Header';
import LinkWalletCard from './LinkWalletCard';
import ProfileDetailsCard from './ProfileDetailsCard';
import { useSession } from '../hooks/useSession';

interface Props {
  onGoHome: () => void;
  onOpenDashboard: () => void;
}

export default function ProfilePage({ onGoHome, onOpenDashboard }: Props) {
  const { user } = useSession();

  return (
    <div className="app">
      <Header onGoHome={onGoHome} onOpenDashboard={onOpenDashboard} onOpenProfile={() => {}} onBack={onGoHome} />
      <div className="app-body">
        <div className="dashboard-body">
          <div className="step-section-heading">
            <div className="step-eyebrow">YOUR PROFILE</div>
            <h2 className="step-title">Profile</h2>
            <p className="step-desc">
              {user ? <>Signed in as <span className="result-mono">{user.email}</span>.</> : 'Sign in to manage your account.'}
            </p>
          </div>

          <ProfileDetailsCard />
          <LinkWalletCard />
        </div>
      </div>
    </div>
  );
}
