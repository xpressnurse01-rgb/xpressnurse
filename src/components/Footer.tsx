import React from 'react';
import { HeartPulse, Phone, MessageCircle, Mail, ShieldCheck, LogIn, ChevronRight } from 'lucide-react';
import { PolicyType } from './PolicyModal';

interface FooterProps {
  onOpenBooking: () => void;
  onOpenQrModal: () => void;
  onNavigate: (path: string) => void;
  onOpenPolicy: (policy: PolicyType) => void;
  currentPath?: string;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onOpenPolicy,
  currentPath = '/'
}) => {
  const isHomeScreen = !currentPath || currentPath === '/' || currentPath === '';
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
            <div className="footer-brand-header" style={{ marginBottom: '1.25rem' }}>
              <img
                src="/images/Xpressnurse Healthcare Logo.png"
                alt="Xpress Nurse Healthcare"
                className="footer-main-logo"
              />
            </div>

            <p className="footer-brand-desc">
              Xpress Nurse connects patients and families with trained nursing professionals for safe, compassionate care — without leaving home.
            </p>

            <div className="footer-contact-chips">
              <a href="https://wa.me/917569657371" target="_blank" rel="noreferrer" className="footer-contact-chip" title="WhatsApp: 75696 57371">
                <MessageCircle size={13} style={{ color: '#25D366' }} />
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

        {/* Local SEO: Top Hyderabad Service Areas Crawl Grid - Only on Home Screen */}
        {isHomeScreen && (
          <div style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '1.75rem',
            paddingBottom: '1.5rem',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
              Doorstep Nursing Across Hyderabad Localities:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {[
                { name: 'Gachibowli', slug: 'nursing-services-gachibowli' },
                { name: 'Madhapur', slug: 'nursing-services-madhapur' },
                { name: 'Hitech City', slug: 'nursing-services-hitech-city' },
                { name: 'Kondapur', slug: 'nursing-services-kondapur' },
                { name: 'Manikonda', slug: 'nursing-services-manikonda' },
                { name: 'Kukatpally', slug: 'nursing-services-kukatpally' },
                { name: 'Banjara Hills', slug: 'nursing-services-banjara-hills' },
                { name: 'Jubilee Hills', slug: 'nursing-services-jubilee-hills' },
                { name: 'Miyapur', slug: 'nursing-services-miyapur' },
                { name: 'KPHB Colony', slug: 'nursing-services-kphb-colony' },
                { name: 'Secunderabad', slug: 'nursing-services-secunderabad' },
                { name: 'Ameerpet', slug: 'nursing-services-ameerpet' },
                { name: 'Begumpet', slug: 'nursing-services-begumpet' },
                { name: 'LB Nagar', slug: 'nursing-services-lb-nagar' },
                { name: 'Uppal', slug: 'nursing-services-uppal' },
                { name: 'Attapur', slug: 'nursing-services-attapur' },
                { name: 'Narsingi', slug: 'nursing-services-narsingi' },
                { name: 'Kokapet', slug: 'nursing-services-kokapet' }
              ].map((loc) => (
                <a
                  key={loc.slug}
                  href={`/${loc.slug}`}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.button === 1) return;
                    e.preventDefault();
                    onNavigate(`/${loc.slug}`);
                    window.scrollTo(0, 0);
                  }}
                  title={`Open Home Nursing in ${loc.name}`}
                  style={{
                    fontSize: '0.78rem',
                    color: '#CBD5E1',
                    textDecoration: 'none',
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#38BDF8';
                    e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.5)';
                    e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#CBD5E1';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }}
                >
                  <span>{loc.name}</span>
                  <ChevronRight size={11} style={{ opacity: 0.6 }} />
                </a>
              ))}
            </div>
          </div>
        )}

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
