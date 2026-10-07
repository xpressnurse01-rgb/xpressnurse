import React from 'react';
import { 
  HeartPulse, 
  ArrowLeft,
  LogIn
} from 'lucide-react';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenBooking: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  onNavigate,
  onOpenBooking
}) => {
  const isPortalRoute = currentPath === '/nurse' || currentPath === '/doctor' || currentPath === '/admin' || currentPath === '/login';

  // Smooth scroll handler across routes
  const handleAnchorClick = (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();
    if (currentPath !== '/' && currentPath !== '') {
      onNavigate('/');
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } else {
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="site-header">
      <nav className="main-navbar">
        <div className="container nav-inner">
          {/* Brand Logo & Location Pill */}
          <div className="header-brand-wrap">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/');
              }}
              className="brand-logo"
              title="Xpress Nurse — Professional Home Nursing"
            >
              <img
                src="/images/Xpressnurse Healthcare Logo.png"
                alt="Xpress Nurse Healthcare"
                className="site-main-logo"
              />
            </a>
          </div>

          {/* Center Navigation Links (Hidden on dedicated portal/login routes) */}
          {isPortalRoute ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className="section-badge desktop-only-cta" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                {currentPath === '/nurse' && 'Nurse Portal'}
                {currentPath === '/doctor' && 'Doctor Panel'}
                {currentPath === '/admin' && 'Admin Operations'}
                {currentPath === '/login' && 'Portal Login'}
              </span>

              <button
                onClick={() => onNavigate('/')}
                className="btn btn-outline btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: 8,
                  fontWeight: 700
                }}
              >
                <ArrowLeft size={14} />
                <span>Home</span>
              </button>
            </div>
          ) : (
            <div className="nav-links-desktop">
              <a href="#services" onClick={(e) => handleAnchorClick(e, 'services')} className="nav-text-link">
                Services
              </a>
              <a href="#why-us" onClick={(e) => handleAnchorClick(e, 'why-us')} className="nav-text-link">
                Why Choose Us
              </a>
              <a href="#doctor-consult" onClick={(e) => handleAnchorClick(e, 'doctor-consult')} className="nav-text-link">
                Doctor Consult
              </a>
              <a href="#about" onClick={(e) => handleAnchorClick(e, 'about')} className="nav-text-link">
                About Us
              </a>
            </div>
          )}

          {/* Action CTAs: Login & Book a Home Visit (Hidden on dedicated portal/login routes) */}
          {!isPortalRoute && (
            <div className="nav-actions-group">
              {/* Top Login Button */}
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="nav-login-top-btn"
                title="Staff & Patient Portal Login"
              >
                <LogIn size={15} />
                <span>Login</span>
              </button>

              <a
                href="https://wa.me/917569657371"
                target="_blank" rel="noreferrer"
                className="header-phone-quick-link mobile-only-cta"
                aria-label="Direct Clinical WhatsApp 24/7"
                title="WhatsApp 24/7 Helpline"
              >
                <HeartPulse size={15} />
                <span>24/7 Help</span>
              </a>

              <button 
                onClick={onOpenBooking} 
                className="nav-book-pill-btn desktop-only-cta"
              >
                <HeartPulse size={15} />
                <span>Book a Home Visit</span>
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};
