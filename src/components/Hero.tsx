import React, { useState, useEffect, useRef } from 'react';
import { 
  HeartPulse, 
  MessageCircle, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface HeroProps {
  onOpenBooking: () => void;
  onOpenQrModal: () => void;
}

interface HeroSlide {
  id: string;
  image: string;
  title: string;
  tag: string;
  description: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'hero-home',
    image: '/images/hero_home_nursing.jpg',
    title: 'Professional Home Nursing Care',
    tag: 'Verified Hyderabad Care',
    description: 'Certified B.Sc & GNM nurses attending in 45-60 minutes'
  },
  {
    id: 'saline-infusion',
    image: '/images/services/saline-infusion.jpg',
    title: 'IV Saline & Fluid Infusions',
    tag: 'Single & Multi Visit',
    description: 'Sterile IV cannulation, normal saline & antibiotic therapy at home'
  },
  {
    id: 'wound-dressing',
    image: '/images/services/wound-dressing.jpg',
    title: 'Wound Care & Surgical Dressing',
    tag: 'Surgical & Diabetic Care',
    description: 'Aseptic post-op dressing, bed sore & diabetic ulcer care'
  },
  {
    id: 'foleys-catheter',
    image: '/images/services/foleys-catheter.jpg',
    title: 'Foley Catheter Replacement',
    tag: 'Sterile Catheter Care',
    description: 'Gentle catheter insertion, bag change & bladder wash'
  },
  {
    id: 'ryles-tube',
    image: '/images/services/ryles-tube.jpg',
    title: 'Ryles / Nasogastric Tube Care',
    tag: 'Enteral Tube Support',
    description: 'Safe NG feeding tube insertion & position verification'
  },
  {
    id: 'suture-removal',
    image: '/images/services/suture-removal.jpg',
    title: 'Suture & Staple Removal',
    tag: 'Post-Surgical Care',
    description: 'Sterile stitch & surgical staple removal with antiseptic care'
  },
  {
    id: 'lab-diagnostics',
    image: '/images/services/lab-diagnostics.jpg',
    title: 'Doorstep Lab Sample Collection',
    tag: 'Home Phlebotomy',
    description: 'Hygienic blood draw with barcode-sealed vacutainer tubes'
  },
  {
    id: 'doctor-consult',
    image: '/images/services/doctor-consult.jpg',
    title: 'Online Doctor Consultation',
    tag: 'Instant Digital Rx',
    description: 'Connect with verified MBBS/MD doctors via WhatsApp video call'
  },
  {
    id: 'injection-administration',
    image: '/images/services/injection-administration.jpg',
    title: 'IM & SC Injections at Home',
    tag: 'Prescribed Injections',
    description: 'Hygienic injection administration & vital parameters check'
  },
  {
    id: 'vitals-monitoring',
    image: '/images/services/personalized-nursing.jpg',
    title: 'Vitals & Senior Health Check',
    tag: 'Elderly Home Care',
    description: 'Digital BP, SpO2, blood sugar & pulse observation log'
  }
];

export const Hero: React.FC<HeroProps> = ({ onOpenBooking }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const slideCount = HERO_SLIDES.length;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideCount);
    }, 4200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, slideCount]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev - 1 + slideCount) % slideCount);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentSlide((prev) => (prev + 1) % slideCount);
  };

  return (
    <section className="hero-editorial-section" id="home">
      {/* Background Ambient Glow */}
      <div className="hero-ambient-glow" />

      <div className="container">
        <div className="hero-editorial-grid">
          {/* Left Column: Editorial Content */}
          <div className="hero-content-col">
            {/* Level 2 & 3: Master Headline with Multi-Tier Typography & Stylized Take Care */}
            <div className="hero-headline-hierarchy">
              <div className="hero-kicker-text">
                <Sparkles size={13} style={{ color: '#0284C7' }} />
                <span>Your Health, Our Priority</span>
              </div>
              <h1 className="hero-editorial-title">
                <span className="hero-title-nowrap">Professional Nursing Care</span> <br />
                <span className="hero-title-gradient">at Home.</span>
              </h1>
            </div>

            {/* Level 4: Editorial Lead Paragraph with Typographic Anchors */}
            <p className="hero-editorial-lead">
              Experienced, <strong>verified nurses</strong> providing safe and hygienic clinical care — right where you're most comfortable. From <strong>IV care &amp; infusions</strong> to <strong>wound dressing</strong>, our trained nursing team is ready to help across Hyderabad, 7 days a week.
            </p>

            {/* Primary Action Buttons - Enhanced, Larger & More Prominent CTA */}
            <div className="hero-editorial-actions">
              <button 
                onClick={onOpenBooking} 
                className="hero-primary-pill-btn hero-btn-large"
                aria-label="Book a Home Visit Now"
              >
                <HeartPulse size={22} className="hero-btn-pulse" />
                <span>Book a Home Visit</span>
                <ArrowRight size={19} />
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
              <span className="helpline-label">Need immediate nursing care? WhatsApp our coordination desk:</span>
              <a href="https://wa.me/917569657371" target="_blank" rel="noreferrer" className="helpline-link">
                <MessageCircle size={14} style={{ color: '#25D366' }} />
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

          {/* Right Column: Visual Showcase Slideshow with Existing Hero & All Services Images */}
          <div className="hero-visual-col">
            <div 
              className="hero-image-stage hero-slideshow-container"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {/* Backing Ambient Frame */}
              <div className="image-stage-backdrop" />

              {/* Slides Container */}
              <div className="hero-slides-wrapper" onClick={onOpenBooking}>
                {HERO_SLIDES.map((slide, idx) => (
                  <div
                    key={slide.id}
                    className={`hero-slide-item ${idx === currentSlide ? 'active' : ''}`}
                    aria-hidden={idx !== currentSlide}
                  >
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="hero-main-photo"
                      loading={idx === 0 ? 'eager' : 'lazy'}
                    />
                  </div>
                ))}
              </div>

              {/* Dynamic Slideshow Caption Card Overlay */}
              <div className="hero-slideshow-caption" onClick={onOpenBooking}>
                <div className="hero-caption-top">
                  <span className="hero-caption-tag">{HERO_SLIDES[currentSlide].tag}</span>
                  <span className="hero-caption-counter">
                    {currentSlide + 1} / {slideCount}
                  </span>
                </div>
                <h3 className="hero-caption-title">{HERO_SLIDES[currentSlide].title}</h3>
                <p className="hero-caption-desc">{HERO_SLIDES[currentSlide].description}</p>
                <div className="hero-caption-cta">
                  <span>Book This Service</span>
                  <ArrowRight size={13} />
                </div>
              </div>

              {/* Slideshow Arrow Controls */}
              <button
                type="button"
                className="hero-slide-btn hero-slide-prev"
                onClick={handlePrev}
                aria-label="Previous slide"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="hero-slide-btn hero-slide-next"
                onClick={handleNext}
                aria-label="Next slide"
              >
                <ChevronRight size={20} />
              </button>

              {/* Slideshow Indicator Dots */}
              <div className="hero-slides-dots" onClick={(e) => e.stopPropagation()}>
                {HERO_SLIDES.map((slide, idx) => (
                  <button
                    key={slide.id}
                    type="button"
                    className={`hero-slide-dot ${idx === currentSlide ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}: ${slide.title}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
