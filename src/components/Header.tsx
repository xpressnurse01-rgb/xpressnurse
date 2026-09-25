import React from 'react';
import { 
  HeartPulse, 
  ArrowLeft
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
            >
              <div className="logo-badge">
                <HeartPulse size={20} />
              </div>
              <div className="brand-text">
                <div className="brand-title">Xpress<span>Nurse</span></div>
                <div className="brand-subtitle">Care That Comes To You</div>
              </div>
            </a>
          </div>

          {/* Center Navigation Links (Hidden on dedicated portal/login routes) */}
          {isPortalRoute ? (
            <div className="header-portal-info">
              <span className="section-badge" style={{ margin: 0 }}>
                {currentPath === '/nurse' && 'Nurse Portal'}
                {currentPath === '/doctor' && 'Doctor Panel'}
                {currentPath === '/admin' && 'Admin Operations'}
                {currentPath === '/login' && 'Portal Login'}
              </span>

              <button
                onClick={() => onNavigate('/')}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <ArrowLeft size={14} />
                <span>Back to Home</span>
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

          {/* Action CTAs: Book a Home Visit Pill */}
          <div className="nav-actions-group">
            <button 
              onClick={onOpenBooking} 
              className="nav-book-pill-btn"
            >
              <HeartPulse size={15} />
              <span>Book a Home Visit</span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};
