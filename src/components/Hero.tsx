import React from 'react';
import { 
  HeartPulse, 
  MessageCircle, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  PhoneCall
} from 'lucide-react';

interface HeroProps {
  onOpenBooking: () => void;
  onOpenQrModal: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenBooking }) => {
  return (
    <section className="hero-editorial-section" id="home">
      {/* Background Ambient Glow */}
      <div className="hero-ambient-glow" />

      <div className="container">
        <div className="hero-editorial-grid">
          {/* Left Column: Editorial Content */}
          <div className="hero-content-col">
            {/* Master Headline with Multi-Tier Typography */}

            {/* Level 2 & 3: Master Headline with Multi-Tier Typography */}
            <div className="hero-headline-hierarchy">
              <div className="hero-kicker-text">
                <span>Your Health, Our Priority</span>
              </div>
              <h1 className="hero-editorial-title">
                Professional Nursing Care <br />
                <span className="hero-title-gradient">at Your Doorstep.</span>
              </h1>
            </div>

            {/* Level 4: Editorial Lead Paragraph with Typographic Anchors */}
            <p className="hero-editorial-lead">
              Experienced, <strong>verified nurses</strong> providing safe and hygienic clinical care — right where you're most comfortable. From <strong>IV care &amp; infusions</strong> to <strong>wound dressing</strong>, our trained nursing team is ready to help across Hyderabad, 7 days a week.
            </p>

            {/* Primary Action Buttons from Blueprint */}
            {/* Primary Action Buttons - District style cohesive palette */}
            <div className="hero-editorial-actions">
              <button 
                onClick={onOpenBooking} 
                className="hero-primary-pill-btn"
              >
                <HeartPulse size={18} />
                <span>Book a Home Visit</span>
                <ArrowRight size={16} />
              </button>

              <a
                href="https://wa.me/917569657371?text=Hi%20Xpress%20Nurse,%20I%20would%20like%20to%20request%20home%20nursing%20care."
                target="_blank"
                rel="noreferrer"
                className="hero-secondary-pill-btn"
              >
                <MessageCircle size={18} style={{ color: '#25D366' }} />
                <span>Chat on WhatsApp</span>
              </a>
            </div>

            {/* Direct Helpline Fast-dial */}
            <div className="hero-helpline-row">
              <span className="helpline-label">Need immediate nursing care? Call our coordination desk:</span>
              <a href="tel:+917569657371" className="helpline-link">
                <PhoneCall size={14} />
                <span>+91 75696 57371</span>
              </a>
            </div>

            {/* Cohesive Trust Bar - Unified single container */}
            <div className="hero-trust-bar">
              <div className="trust-bar-item">
                <div className="trust-bar-icon">
                  <ShieldCheck size={16} />
                </div>
                <div className="trust-bar-text">
                  <strong>Verified Nurses</strong>
                  <span>Trained B.Sc &amp; GNM certified</span>
                </div>
              </div>

              <div className="trust-bar-divider" />

              <div className="trust-bar-item">
                <div className="trust-bar-icon">
                  <Clock size={16} />
                </div>
                <div className="trust-bar-text">
                  <strong>Prompt Visits</strong>
                  <span>Nearest available nurse assigned</span>
                </div>
              </div>

              <div className="trust-bar-divider" />

              <div className="trust-bar-item">
                <div className="trust-bar-icon">
                  <CheckCircle2 size={16} />
                </div>
                <div className="trust-bar-text">
                  <strong>Hygienic &amp; Safe</strong>
                  <span>Hospital-sealed consumables</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Showcase & Floating Cards */}
          <div className="hero-visual-col">
            <div className="hero-image-stage">
              {/* Backing Ambient Frame */}
              <div className="image-stage-backdrop" />

              {/* Main Clinical Photography */}
              <img
                src="/images/hero_home_nursing.jpg"
                alt="XpressNurse Professional Indian Nurse Providing Caring Home Health Care"
                className="hero-main-photo"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
