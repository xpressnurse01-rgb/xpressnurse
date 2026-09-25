import React from 'react';
import { Video, CheckCircle2, ArrowRight, Clock, ShieldCheck, Stethoscope, PhoneCall } from 'lucide-react';

interface DoctorConsultSectionProps {
  onOpenBookingDoctor: () => void;
}

export const DoctorConsultSection: React.FC<DoctorConsultSectionProps> = ({ onOpenBookingDoctor }) => {
  return (
    <section className="section-spacing doctor-consult-section" id="doctor-consult">
      <div className="container">
        <div className="doctor-hero-box reveal-on-scroll">
          <div className="doctor-hero-grid">
            {/* Left Content */}
            <div className="doctor-hero-content">
              <div className="doctor-eyebrow-pill">
                <Stethoscope size={14} />
                <span>Online Doctor Consultation</span>
              </div>

              <h2 className="doctor-section-title">
                Talk to a Doctor — <br />
                <span className="doctor-highlight-sky">From the Comfort of Home.</span>
              </h2>

              <p className="doctor-section-lead">
                Get guidance from an experienced doctor before or during your home care, entirely online. Receive an authorized digital prescription needed for procedures like IV saline, catheter care, or wound dressings.
              </p>

              <div className="doctor-features-grid">
                <div className="doctor-feature-item">
                  <CheckCircle2 size={16} className="feature-check" />
                  <span>Valid Digital Prescription on WhatsApp</span>
                </div>
                <div className="doctor-feature-item">
                  <CheckCircle2 size={16} className="feature-check" />
                  <span>Prompt Turnaround for Visiting RN</span>
                </div>
                <div className="doctor-feature-item">
                  <CheckCircle2 size={16} className="feature-check" />
                  <span>Medication Guidance &amp; Symptom Review</span>
                </div>
                <div className="doctor-feature-item">
                  <CheckCircle2 size={16} className="feature-check" />
                  <span>Certified Medical Practitioners</span>
                </div>
              </div>

              <div className="doctor-cta-group">
                <button onClick={onOpenBookingDoctor} className="doctor-main-pill-btn">
                  <Video size={17} />
                  <span>Talk to a Doctor</span>
                  <ArrowRight size={15} />
                </button>

                <a
                  href="https://wa.me/917569657371?text=Hi%20Xpress%20Nurse,%20I%20would%20like%20to%20consult%20a%20doctor%20online%20for%20a%20home%20nursing%20prescription."
                  target="_blank"
                  rel="noreferrer"
                  className="doctor-ghost-pill-btn"
                >
                  <PhoneCall size={15} />
                  <span>WhatsApp: 75696 57371</span>
                </a>
              </div>
            </div>

            {/* Right Column: Clean Telemetry Panel (Unified without nested box clutter) */}
            <div className="doctor-telemetry-col">
              <div className="doctor-telemetry-inner">
                <div className="telemetry-badge">
                  <span className="live-dot-emerald" />
                  <span>Physicians Active Daily</span>
                </div>

                <div className="telemetry-stat">Digital Prescription</div>
                <div className="telemetry-sub">Authorized for Hyderabad Home Nursing</div>

                <div className="telemetry-divider" />

                <div className="telemetry-step-list">
                  <div className="telemetry-step">
                    <span className="step-num">1</span>
                    <span>10-min phone or video consultation</span>
                  </div>
                  <div className="telemetry-step">
                    <span className="step-num">2</span>
                    <span>Instant digitally signed prescription PDF</span>
                  </div>
                  <div className="telemetry-step">
                    <span className="step-num">3</span>
                    <span>Direct coordination with visiting RN</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
