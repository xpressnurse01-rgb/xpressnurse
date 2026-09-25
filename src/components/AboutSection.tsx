import React from 'react';
import { 
  HeartHandshake, 
  ShieldCheck, 
  Users, 
  Stethoscope, 
  PhoneCall, 
  MessageCircle, 
  CheckCircle2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface AboutSectionProps {
  onOpenBooking: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ onOpenBooking }) => {
  return (
    <section className="section-spacing about-editorial-section" id="about">
      <div className="container">
        {/* Section Header */}
        <div className="section-header text-center reveal-on-scroll">
          <span className="section-badge">
            <Sparkles size={13} />
            <span>Care That Comes To You</span>
          </span>
          <h2 className="section-title">About Xpress Nurse — Home Healthcare You Can Rely On</h2>
          <p className="section-subtitle">
            Xpress Nurse connects patients and families with trained nursing professionals for safe, compassionate care — without leaving home.
          </p>
        </div>

        {/* Content Showcase Grid */}
        <div className="about-editorial-grid">
          {/* Left Column: Mission & Care Model */}
          <div className="about-narrative-card reveal-on-scroll">
            <div className="about-eyebrow">Our Patient-Focused Care Model</div>
            <h3 className="about-heading">
              Professional Medical &amp; Nursing Services Delivered with Dignity and Safety.
            </h3>
            
            <p className="about-paragraph">
              Navigating hospital visits for routine clinical procedures — like IV saline infusions, post-operative wound dressings, or catheter replacements — can be exhausting and stressful for recovering patients and elderly family members.
            </p>

            <p className="about-paragraph">
              Xpress Nurse was founded to bridge hospital discharge with safe, dependable home recovery. We mobilize qualified, verified registered nurses directly to your doorstep across Hyderabad, equipped with single-use sterile consumables and strict hospital-grade aseptic hygiene protocols.
            </p>

            {/* 4 Feature Highlights */}
            <div className="about-features-list">
              <div className="about-feature-item">
                <CheckCircle2 size={18} className="about-check-icon" />
                <div>
                  <strong>Trained &amp; Experienced Nurses</strong>
                  <span>Qualified B.Sc &amp; GNM professionals with hospital ward and ICU background.</span>
                </div>
              </div>

              <div className="about-feature-item">
                <CheckCircle2 size={18} className="about-check-icon" />
                <div>
                  <strong>Area-Based Order Routing</strong>
                  <span>Incoming bookings are routed promptly to the nearest verified nurse in your Hyderabad locality.</span>
                </div>
              </div>

              <div className="about-feature-item">
                <CheckCircle2 size={18} className="about-check-icon" />
                <div>
                  <strong>Doctor Consultation Integration</strong>
                  <span>Seamless digital tele-consultation with verified doctors when a medical prescription is needed.</span>
                </div>
              </div>

              <div className="about-feature-item">
                <CheckCircle2 size={18} className="about-check-icon" />
                <div>
                  <strong>Fair &amp; Transparent Charges</strong>
                  <span>Fixed, upfront pricing with zero surprise charges. Pay after your procedure is completed.</span>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="about-actions-row">
              <button onClick={onOpenBooking} className="btn btn-danger btn-md">
                <HeartHandshake size={17} />
                <span>Book a Home Visit</span>
                <ArrowRight size={15} />
              </button>

              <a
                href="https://wa.me/917569657371?text=Hi%20Xpress%20Nurse,%20I%20would%20like%20to%20learn%20more%20about%20your%20home%20nursing%20care."
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-md"
              >
                <MessageCircle size={17} />
                <span>WhatsApp: 75696 57371</span>
              </a>
            </div>
          </div>

          {/* Right Column: Standards & Verification Card */}
          <div className="about-side-cards">
            <div className="about-standards-card reveal-on-scroll reveal-delay-2">
              <div className="trust-card-header">
                <div className="standards-icon-box">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h4 className="trust-card-title">Clinical Standards &amp; Safety</h4>
                  <div className="trust-card-sub">Hospital Asepsis at Home</div>
                </div>
              </div>

              <div className="trust-pillars-stack">
                <div className="trust-pillar-point">
                  <div className="point-bullet" />
                  <div>
                    <strong>Mandatory Prescription Policy:</strong> All invasive procedures (IV, Catheter, Ryles Tube, Sutures) strictly require a valid medical prescription for patient safety.
                  </div>
                </div>

                <div className="trust-pillar-point">
                  <div className="point-bullet" />
                  <div>
                    <strong>100% Sterile Consumables:</strong> Every syringe, cannula, dressing kit, and catheter is hospital-sealed and opened only in the patient's presence.
                  </div>
                </div>

                <div className="trust-pillar-point">
                  <div className="point-bullet" />
                  <div>
                    <strong>Available Every Day:</strong> Dedicated home healthcare support 7 days a week across Gachibowli, LB Nagar, Madhapur, Banjara Hills, and all Hyderabad zones.
                  </div>
                </div>
              </div>

              {/* Direct Reach Bar */}
              <div className="about-direct-reach">
                <div className="reach-icon">
                  <PhoneCall size={18} />
                </div>
                <div className="reach-meta">
                  <div className="reach-label">Direct Clinical Help Desk</div>
                  <a href="tel:+917569657371" className="reach-number">+91 75696 57371</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
