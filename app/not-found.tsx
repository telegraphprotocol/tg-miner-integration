import Link from 'next/link';
import AppBackground from '../src/components/AppBackground';

export default function NotFound() {
  return (
    <div className="not-found">
      <AppBackground />
      <Link href="/" className="auth-page-logo">
        <img src="/logo.png" alt="Telegraph" className="lv2-logo-img" />
        <span className="lv2-logo-text">TELEGRAPH</span>
      </Link>
      <div className="not-found-body">
        <div className="step-eyebrow">ERROR 404</div>
        <h1 className="step-title">Page not found</h1>
        <p className="step-desc">The page you're looking for doesn't exist or has been moved.</p>
        <Link href="/" className="lv2-hero-cta-primary">Back to home →</Link>
      </div>
    </div>
  );
}
