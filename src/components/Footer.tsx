import React from 'react';
import { HeartPulse, Phone, MessageCircle, Mail, ShieldCheck, LogIn } from 'lucide-react';
import { PolicyType } from './PolicyModal';

interface FooterProps {
  onOpenBooking: () => void;
  onOpenQrModal: () => void;
  onNavigate: (path: string) => void;
  onOpenPolicy: (policy: PolicyType) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenPolicy
}) => {
  const handleAnchorNavigate = (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();
    if (window.location.pathname !== '/' && window.location.pathname !== '') {
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
    <footer className="footer-simple">
      <div className="container">
        {/* Site-Wide Closing Banner from Blueprint Section 15 */}
        <div 
          className="reveal-on-scroll"
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '2rem',
            marginBottom: '2.5rem',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#E63946', fontWeight: 700, marginBottom: '0.35rem' }}>
            Care That Comes To You
          </div>
          <h3 style={{ fontSize: '1.45rem', color: '#FFFFFF', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
            Your Health, Our Priority — Care That Comes to You.
          </h3>
          <p style={{ fontSize: '0.92rem', color: '#94A3B8', margin: 0, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>
            Xpress Nurse — Professional Home Nursing, Whenever You Need It.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="footer-simple-grid reveal-on-scroll reveal-delay-2">
          {/* Brand & Mission */}
          <div className="footer-simple-col brand">
            <div className="footer-brand-header">
              <div className="logo-badge" style={{ width: 32, height: 32 }}>
                <HeartPulse size={18} />
              </div>
              <div className="brand-title" style={{ fontSize: '1.25rem', color: '#FFFFFF' }}>
                Xpress<span style={{ color: '#E63946' }}>Nurse</span>
              </div>
            </div>

            <p className="footer-brand-desc">
              Xpress Nurse connects patients and families with trained nursing professionals for safe, compassionate care — without leaving home.
            </p>

            <div className="footer-contact-chips">
              <a href="tel:+917569657371" className="footer-contact-chip" title="Call / WhatsApp: 75696 57371">
                <Phone size={13} style={{ color: '#E63946' }} />
                <span>+91 75696 57371</span>
              </a>

              <a href="mailto:info@xpressnurse.in" className="footer-contact-chip" title="Email: info@xpressnurse.in">
                <Mail size={13} style={{ color: '#38BDF8' }} />
                <span>info@xpressnurse.in</span>
              </a>

              <a
                href="https://wa.me/917569657371?text=Hi%20Xpress%20Nurse,%20I%20would%20like%20to%20request%20home%20nursing%20care."
                target="_blank"
                rel="noreferrer"
                className="footer-contact-chip wa"
                title="WhatsApp: 75696 57371"
              >
                <MessageCircle size={13} style={{ color: '#25D366' }} />
                <span>WhatsApp: 75696 57371</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-simple-col">
            <h4 className="footer-col-title">Navigation</h4>
            <ul className="footer-simple-links">
              <li>
                <a href="#services" onClick={(e) => handleAnchorNavigate(e, 'services')}>
                  Our Services
                </a>
              </li>
              <li>
                <a href="#about" onClick={(e) => handleAnchorNavigate(e, 'about')}>
                  About Xpress Nurse
                </a>
              </li>
              <li>
                <a href="#why-us" onClick={(e) => handleAnchorNavigate(e, 'why-us')}>
                  Why Choose Us
                </a>
              </li>
              <li>
                <a href="#doctor-consult" onClick={(e) => handleAnchorNavigate(e, 'doctor-consult')}>
                  Doctor Consultation
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className="footer-link-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#38BDF8' }}
                >
                  <LogIn size={13} />
                  <span>Staff & Patient Login</span>
                </button>
              </li>
            </ul>
          </div>


        </div>

        {/* Subtle Regulatory & Emergency Disclaimer */}
        <div className="footer-disclaimer-text">
          Doctor prescription required for invasive medical procedures. In acute life-threatening emergencies, please dial 108 or visit the nearest hospital emergency department immediately.
        </div>

        {/* Bottom Bar */}
        <div className="footer-simple-bottom">
          <div>
            © {new Date().getFullYear()} Xpress Nurse Technologies Pvt. Ltd.
          </div>
          <div className="footer-policy-row">
            <button type="button" onClick={() => onOpenPolicy('privacy')} className="footer-policy-link">
              Privacy Policy
            </button>
            <span>•</span>
            <button type="button" onClick={() => onOpenPolicy('terms')} className="footer-policy-link">
              Terms of Care
            </button>
            <span>•</span>
            <button type="button" onClick={() => onOpenPolicy('refund')} className="footer-policy-link">
              Refund Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
