import React, { useEffect, useState } from 'react';
import { 
  MapPin, 
  CheckCircle, 
  ShieldCheck, 
  Clock, 
  PhoneCall, 
  MessageCircle, 
  Calendar, 
  HelpCircle, 
  ArrowRight,
  ChevronRight,
  Award,
  Sparkles,
  HeartPulse,
  UserCheck,
  Stethoscope,
  ChevronDown,
  Star,
  FileText,
  Activity
} from 'lucide-react';
import { 
  HyderabadSeoPage, 
  getRelatedServicesForArea, 
  getNearbyAreaPagesForService,
  HYDERABAD_AREAS
} from '../data/hyderabadSeoPages';

interface LocalSeoPageProps {
  page: HyderabadSeoPage;
  onNavigate: (path: string) => void;
  onOpenBookingForService: (serviceId: string, areaHint?: string) => void;
}

function getServiceImage(service: string, serviceId: string): string {
  const s = service.toLowerCase();
  if (serviceId === 'saline-infusion' || s.includes('saline') || s.includes('iv drip')) {
    return '/images/services/saline-infusion.jpg';
  }
  if (serviceId === 'wound-dressing' || s.includes('wound') || s.includes('bed sore')) {
    return '/images/services/wound-dressing.jpg';
  }
  if (serviceId === 'foleys-catheter' || s.includes('catheter')) {
    return '/images/services/foleys-catheter.jpg';
  }
  if (serviceId === 'ryles-tube' || s.includes('ryles')) {
    return '/images/services/ryles-tube.jpg';
  }
  if (serviceId === 'suture-removal' || s.includes('suture') || s.includes('stitch')) {
    return '/images/services/suture-removal.jpg';
  }
  if (s.includes('lab') || s.includes('sample') || s.includes('blood test')) {
    return '/images/services/lab-diagnostics.jpg';
  }
  if (serviceId === 'doctor-consult' || s.includes('doctor') || s.includes('teleconsult')) {
    return '/images/services/doctor-consult.jpg';
  }
  return '/images/services/personalized-nursing.jpg';
}

export const LocalSeoPage: React.FC<LocalSeoPageProps> = ({
  page,
  onNavigate,
  onOpenBookingForService
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Update document title, meta description, and canonical URL
  useEffect(() => {
    document.title = page.title;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', page.metaDescription);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `https://www.xpressnurse.in/${page.slug}`);

    // Inject Schema.org JSON-LD Structured Data for LocalBusiness & MedicalBusiness
    const schemaData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "MedicalBusiness",
          "@id": `https://www.xpressnurse.in/${page.slug}#localbusiness`,
          "name": `Xpress Nurse — ${page.service} in ${page.area}`,
          "alternateName": [
            `Express Nurse ${page.area}`,
            `ExpressNurse ${page.area}`,
            "Express Nurse Hyderabad",
            "ExpressNurse",
            `Express Nurse — ${page.service} in ${page.area}`
          ],
          "url": `https://www.xpressnurse.in/${page.slug}`,
          "telephone": "+917569657371",
          "priceRange": `₹${page.indicativePrice}`,
          "image": "https://www.xpressnurse.in/images/Xpressnurse%20Healthcare%20Logo.png",
          "description": `${page.metaDescription} Also known as Express Nurse ${page.area}.`,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": `${page.area}`,
            "addressLocality": "Hyderabad",
            "addressRegion": "Telangana",
            "postalCode": "500081",
            "addressCountry": "IN"
          },
          "areaServed": [
            {
              "@type": "AdministrativeArea",
              "name": `${page.area}, Hyderabad`
            }
          ],
          "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            "opens": "08:00",
            "closes": "22:00"
          }
        },
        {
          "@type": "FAQPage",
          "@id": `https://www.xpressnurse.in/${page.slug}#faq`,
          "mainEntity": [
            {
              "@type": "Question",
              "name": `Is Xpress Nurse also called Express Nurse in ${page.area}?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `Yes! Many patients search for "Express Nurse" or "ExpressNurse" when looking for immediate home healthcare in ${page.area}. Xpress Nurse is the official registered service delivering qualified doorstep nurses across Hyderabad.`
              }
            },
            {
              "@type": "Question",
              "name": `How soon can a nurse reach my home in ${page.area}?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `Our registered nurses are locally based across ${page.area} and neighboring ${page.zone} hubs. We dispatch the nearest available verified nurse promptly upon booking confirmation.`
              }
            },
            {
              "@type": "Question",
              "name": `Is ${page.service} available on weekends in ${page.area}?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `Yes, Xpress Nurse operates 7 days a week including Sundays and public holidays across ${page.area}, Hyderabad.`
              }
            },
            {
              "@type": "Question",
              "name": `Do I need a doctor's prescription for ${page.service} in ${page.area}?`,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": `Clinical procedures such as IV infusions, injections, and catheterization require a valid prescription. If you don't have one, our on-call tele-doctor can assess the patient and issue a digital prescription.`
              }
            }
          ]
        }
      ]
    };

    const scriptId = 'local-seo-schema-script';
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.text = JSON.stringify(schemaData);

    return () => {
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, [page]);

  const relatedServices = getRelatedServicesForArea(page.area, page.slug);
  const nearbyAreaPages = getNearbyAreaPagesForService(page.service, page.area, page.slug);

  const heroImage = getServiceImage(page.service, page.serviceId);

  const whatsappMessage = encodeURIComponent(
    `Hi Xpress Nurse, I would like to book ${page.service} at my home in ${page.area}, Hyderabad.`
  );
  const whatsappUrl = `https://wa.me/917569657371?text=${whatsappMessage}`;

  const faqs = [
    {
      q: `Is Xpress Nurse also known as Express Nurse in ${page.area}?`,
      a: `Yes! Many Hyderabad families search for "Express Nurse" or "ExpressNurse" when looking for fast home nursing care. Xpress Nurse is the official verified platform providing certified doorstep nurses, IV saline therapy, and doctor consultations across ${page.area}.`
    },
    {
      q: `How soon can a verified nurse reach my address in ${page.area}?`,
      a: `Our Hyderabad dispatch team coordinates with nursing staff stationed across ${page.area} and adjacent ${page.zone} hubs. Once your booking is confirmed, the nearest available certified nurse is assigned to visit your home without requiring hospital travel.`
    },
    {
      q: `Is ${page.service} available on weekends and holidays in ${page.area}?`,
      a: `Yes! Medical care cannot wait for working hours. Xpress Nurse provides doorstep nursing care 7 days a week, from 8:00 AM to 10:00 PM across all residential communities in ${page.area}.`
    },
    {
      q: `What qualifications do the attending nurses hold?`,
      a: `Every attending healthcare professional is a licensed B.Sc Nursing or GNM registered nurse with verified State Nursing Council credentials, clean background checks, and hands-on hospital clinical training.`
    },
    {
      q: `Do I need a doctor's prescription for ${page.service}?`,
      a: `Clinical procedures (such as IV infusions, antibiotic drips, catheters, and Ryles tube insertions) require a valid clinical prescription. If you do not have one, our in-house consulting tele-doctor can assess the patient and issue a digital prescription online.`
    }
  ];

  return (
    <div className="local-seo-page-root">
      {/* 1. Breadcrumb Navigation */}
      <div className="container" style={{ paddingTop: '1.25rem', paddingBottom: '0.5rem' }}>
        <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', color: '#64748B', flexWrap: 'wrap' }}>
          <a href="/" onClick={(e) => { e.preventDefault(); onNavigate('/'); }} style={{ color: '#0284C7', textDecoration: 'none', fontWeight: 600 }}>Home</a>
          <ChevronRight size={13} style={{ color: '#94A3B8' }} />
          <span style={{ color: '#64748B' }}>Hyderabad</span>
          <ChevronRight size={13} style={{ color: '#94A3B8' }} />
          <span style={{ color: '#64748B' }}>{page.area}</span>
          <ChevronRight size={13} style={{ color: '#94A3B8' }} />
          <span style={{ color: '#0F172A', fontWeight: 700 }}>{page.service}</span>
        </nav>
      </div>

      {/* 2. Hero Section (Split 2-Column Luxury Healthtech Layout) */}
      <section className="local-seo-hero" style={{
        background: 'linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 100%)',
        padding: '2.5rem 0 3.5rem',
        borderBottom: '1px solid #E2E8F0'
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '2.5rem',
            alignItems: 'center'
          }}>
            {/* Left Content Column */}
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: '#E0F2FE',
                color: '#0369A1',
                padding: '0.35rem 0.95rem',
                borderRadius: 9999,
                fontSize: '0.84rem',
                fontWeight: 800,
                marginBottom: '1rem',
                border: '1px solid #BAE6FD'
              }}>
                <MapPin size={14} style={{ color: '#0284C7' }} />
                <span>Doorstep Nursing in {page.area}, Hyderabad ({page.zone})</span>
              </div>

              <h1 style={{
                fontSize: 'clamp(1.85rem, 3.5vw, 2.75rem)',
                color: 'var(--primary-navy-950)',
                fontWeight: 850,
                letterSpacing: '-0.025em',
                lineHeight: 1.25,
                marginBottom: '1.2rem'
              }}>
                {page.h1}
              </h1>

              <p style={{
                fontSize: '1.05rem',
                color: '#475569',
                lineHeight: 1.65,
                marginBottom: '1.5rem'
              }}>
                Need certified clinical home care in <strong>{page.area}</strong>? Xpress Nurse dispatches licensed, verified Registered Nurses directly to your doorstep. We regularly attend patients and elderly family members in residential communities and apartments near <strong>{page.landmarks.slice(0, 3).join(', ')}</strong>.
              </p>

              {/* Price Transparency Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: '0.65rem',
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                padding: '0.5rem 1rem',
                borderRadius: 12,
                marginBottom: '1.75rem'
              }}>
                <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Doorstep Visit Fee:</span>
                <span style={{ fontSize: '1.45rem', fontWeight: 850, color: '#0284C7' }}>₹{page.indicativePrice}</span>
                <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>• Zero Hidden Surcharges</span>
              </div>

              {/* Direct CTAs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => onOpenBookingForService(page.serviceId, page.area)}
                  className="btn btn-primary"
                  style={{
                    padding: '0.85rem 1.85rem',
                    fontSize: '1rem',
                    fontWeight: 800,
                    borderRadius: 9999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 8px 24px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  <Calendar size={18} />
                  <span>Book {page.service.split('(')[0].trim()} Now</span>
                </button>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline"
                  style={{
                    padding: '0.85rem 1.65rem',
                    fontSize: '0.96rem',
                    fontWeight: 700,
                    borderRadius: 9999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#FFFFFF',
                    borderColor: '#25D366',
                    color: '#15803D'
                  }}
                >
                  <MessageCircle size={18} style={{ color: '#25D366' }} />
                  <span>WhatsApp 24/7</span>
                </a>

                <a
                  href="tel:+917569657371"
                  className="btn btn-outline"
                  style={{
                    padding: '0.85rem 1.35rem',
                    fontSize: '0.96rem',
                    fontWeight: 700,
                    borderRadius: 9999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#FFFFFF'
                  }}
                >
                  <PhoneCall size={16} />
                  <span>75696 57371</span>
                </a>
              </div>

              {/* Trust Features Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                flexWrap: 'wrap',
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid #E2E8F0',
                fontSize: '0.84rem',
                color: '#475569'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldCheck size={16} style={{ color: '#059669' }} />
                  <span>Verified B.Sc / GNM Nurses</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <CheckCircle size={16} style={{ color: '#0284C7' }} />
                  <span>100% Sterile Consumables</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={16} style={{ color: '#D97706' }} />
                  <span>7 Days a Week Availability</span>
                </div>
              </div>
            </div>

            {/* Right Visual Image Column */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'relative',
                borderRadius: 20,
                overflow: 'hidden',
                boxShadow: '0 20px 45px rgba(2, 132, 199, 0.16)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                background: '#FFFFFF'
              }}>
                <img
                  src={heroImage}
                  alt={`${page.service} in ${page.area}, Hyderabad`}
                  style={{
                    width: '100%',
                    height: 380,
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />

                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(4, 13, 26, 0.75) 100%)'
                }} />

                <div style={{
                  position: 'absolute',
                  bottom: 16,
                  left: 16,
                  right: 16,
                  color: '#FFFFFF'
                }}>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38BDF8', fontWeight: 800 }}>
                    Clinical Care At Your Doorstep
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 850 }}>
                    {page.service}
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#E2E8F0', marginTop: 2 }}>
                    Serving {page.area} & surrounding {page.zone} communities
                  </div>
                </div>
              </div>

              {/* Floating Verified Badge */}
              <div style={{
                position: 'absolute',
                top: -12,
                right: -12,
                background: '#FFFFFF',
                borderRadius: 14,
                padding: '0.65rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                border: '1px solid #E2E8F0'
              }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#DEF7EC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#03543F' }}>
                  <UserCheck size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>Registered Nurse (RN)</div>
                  <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>Council Verified Staff</div>
                </div>
              </div>

              {/* Floating Vitals Check Badge */}
              <div style={{
                position: 'absolute',
                bottom: -14,
                left: -10,
                background: '#FFFFFF',
                borderRadius: 14,
                padding: '0.6rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                border: '1px solid #E2E8F0'
              }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7' }}>
                  <Activity size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A' }}>Vitals Checked</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>BP, Pulse, SpO2 & Temp</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How Doorstep Care Works in 3 Simple Steps */}
      <section style={{ padding: '3.5rem 0', background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}>
        <div className="container" style={{ maxWidth: 960 }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div className="section-badge" style={{ margin: '0 auto 0.5rem' }}>Simple 3-Step Process</div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 850, color: 'var(--primary-navy-950)', margin: '0 0 0.5rem' }}>
              How Doorstep Nursing Works in {page.area}
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.95rem', margin: 0 }}>
              Convenient, safe clinical home care without the hassle of hospital waiting rooms.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem'
          }}>
            <div style={{
              background: '#F8FAFC',
              borderRadius: 16,
              padding: '1.75rem',
              border: '1px solid #E2E8F0',
              position: 'relative'
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#0284C7',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.2rem',
                marginBottom: '1rem',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
              }}>
                1
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                Book in 60 Seconds
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                Select {page.service}, enter your patient address in {page.area}, and choose your preferred time slot online or over WhatsApp.
              </p>
            </div>

            <div style={{
              background: '#F8FAFC',
              borderRadius: 16,
              padding: '1.75rem',
              border: '1px solid #E2E8F0',
              position: 'relative'
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#0284C7',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.2rem',
                marginBottom: '1rem',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
              }}>
                2
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                Nurse Dispatched
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                A council-certified Registered Nurse arrives at your home equipped with sterile sealed disposables and a clinical vitals kit.
              </p>
            </div>

            <div style={{
              background: '#F8FAFC',
              borderRadius: 16,
              padding: '1.75rem',
              border: '1px solid #E2E8F0',
              position: 'relative'
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#0284C7',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.2rem',
                marginBottom: '1rem',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
              }}>
                3
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                Safe Clinical Care
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                The nurse administers {page.service} following strict hospital protocols, logs session vitals, and issues a digital invoice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Clinical Procedure & Standards in Area */}
      <section style={{ padding: '3.5rem 0', background: '#F8FAFC' }}>
        <div className="container" style={{ maxWidth: 980 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '2rem', alignItems: 'center' }}>
            {/* Left Content */}
            <div>
              <div className="section-badge" style={{ marginBottom: '0.5rem' }}>Clinical Excellence</div>
              <h2 style={{ fontSize: '1.65rem', fontWeight: 850, color: 'var(--primary-navy-950)', marginBottom: '1rem', lineHeight: 1.3 }}>
                Why Families in {page.area} Choose Xpress Nurse
              </h2>
              <p style={{ color: '#475569', lineHeight: 1.65, fontSize: '0.96rem', marginBottom: '1.5rem' }}>
                Whether it is post-surgical recovery, elderly bedridden care, or chronic therapy, Xpress Nurse brings certified clinical expertise to your bedside:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#DEF7EC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#03543F', flexShrink: 0, marginTop: 2 }}>
                    ✓
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>Baseline Vitals Recorded Every Visit</strong>
                    <div style={{ fontSize: '0.84rem', color: '#64748B' }}>Every procedure begins with checking blood pressure, pulse rate, oxygen saturation (SpO2), and temperature.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#DEF7EC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#03543F', flexShrink: 0, marginTop: 2 }}>
                    ✓
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>Single-Use Sealed Medical Kits</strong>
                    <div style={{ fontSize: '0.84rem', color: '#64748B' }}>Strict aseptic protocol using hospital-grade single-use needles, catheters, IV cannulas, and sterile dressings.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#DEF7EC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#03543F', flexShrink: 0, marginTop: 2 }}>
                    ✓
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>Doctor Collaboration On-Demand</strong>
                    <div style={{ fontSize: '0.84rem', color: '#64748B' }}>Instant tele-doctor clearance available if an updated dose or prescription renewal is needed.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div>
              <div style={{
                borderRadius: 18,
                overflow: 'hidden',
                boxShadow: '0 16px 36px rgba(0,0,0,0.08)',
                border: '1px solid #E2E8F0',
                position: 'relative'
              }}>
                <img
                  src="/images/xpressnurse_team_uniforms.jpg"
                  alt={`Certified Nurses Serving ${page.area} wearing official Xpress Nurse uniforms`}
                  style={{
                    width: '100%',
                    height: 330,
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(to top, rgba(4, 13, 26, 0.9) 0%, transparent 100%)',
                  padding: '16px 18px 12px',
                  color: '#fff',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }}></span>
                  Official Xpress Nurse Clinical Staff &amp; Doctors serving {page.area}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Tele-Doctor Consultation Banner */}
      <section style={{ padding: '2.5rem 0', background: '#FFFFFF' }}>
        <div className="container" style={{ maxWidth: 960 }}>
          <div style={{
            background: 'linear-gradient(135deg, #040D1A 0%, #163B66 100%)',
            borderRadius: 18,
            padding: '2rem',
            color: '#FFFFFF',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.75rem',
            alignItems: 'center',
            boxShadow: '0 12px 30px rgba(4, 13, 26, 0.15)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#38BDF8', fontSize: '0.84rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                <Stethoscope size={16} />
                <span>Doctor Teleconsultation & Clearance</span>
              </div>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 850, color: '#FFFFFF', margin: '0 0 0.75rem' }}>
                Need a Prescription Before Your Nurse Visit?
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#CBD5E1', lineHeight: 1.6, margin: 0 }}>
                If your prescription has expired or you need clinical dosage evaluation for {page.service}, our consulting MBBS / MD physicians evaluate patients online and issue instant valid digital prescriptions.
              </p>
            </div>

            <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.08)', padding: '1.5rem', borderRadius: 14, border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              <div style={{ fontSize: '0.82rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>
                Online Tele-Doctor Consult
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 850, color: '#FFFFFF', margin: '0.25rem 0' }}>
                ₹299
              </div>
              <div style={{ fontSize: '0.78rem', color: '#38BDF8', marginBottom: '1rem' }}>
                Instant Video / Audio Clinical Review
              </div>
              <button
                type="button"
                onClick={() => onOpenBookingForService('doctor-consult', page.area)}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.65rem 1rem',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  borderRadius: 8
                }}
              >
                Book Doctor Consult →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Local FAQ Accordion */}
      <section style={{ padding: '3.5rem 0', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div className="container" style={{ maxWidth: 840 }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div className="section-badge" style={{ margin: '0 auto 0.5rem' }}>Frequently Asked Questions</div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 850, color: 'var(--primary-navy-950)', margin: '0 0 0.5rem' }}>
              Frequently Asked Questions About {page.service} in {page.area}
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.94rem', margin: 0 }}>
              Helpful information on doorstep nursing visits in your neighborhood.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div 
                  key={idx}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 12,
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '1.15rem 1.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#0F172A',
                      gap: '0.75rem'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <HelpCircle size={18} style={{ color: '#0284C7', flexShrink: 0 }} />
                      <span>{faq.q}</span>
                    </span>
                    <ChevronDown 
                      size={18} 
                      style={{ 
                        color: '#64748B', 
                        transform: isOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0
                      }} 
                    />
                  </button>
                  {isOpen && (
                    <div style={{
                      padding: '0 1.4rem 1.25rem 2.75rem',
                      color: '#475569',
                      fontSize: '0.92rem',
                      lineHeight: 1.65,
                      borderTop: '1px solid #F1F5F9'
                    }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. Hyper-Local Internal Links Web (Google SEO Anchor Web) */}
      <section style={{ padding: '3.5rem 0', background: '#FFFFFF' }}>
        <div className="container" style={{ maxWidth: 980 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '2.5rem' }}>
            {/* Related Services in this Area */}
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <HeartPulse size={18} style={{ color: '#E11D48' }} />
                <span>Other Nursing Services in {page.area}</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {relatedServices.map((rel) => (
                  <a
                    key={rel.slug}
                    href={`/${rel.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(`/${rel.slug}`);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: '#F8FAFC',
                      borderRadius: 10,
                      border: '1px solid #E2E8F0',
                      textDecoration: 'none',
                      color: '#0F172A',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0284C7')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E2E8F0')}
                  >
                    <span>{rel.service} in {rel.area}</span>
                    <ArrowRight size={14} style={{ color: '#0284C7' }} />
                  </a>
                ))}
              </div>
            </div>

            {/* Same Service in Nearby Localities */}
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <MapPin size={18} style={{ color: '#0284C7' }} />
                <span>{page.service} in Nearby Areas</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {nearbyAreaPages.map((near) => (
                  <a
                    key={near.slug}
                    href={`/${near.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(`/${near.slug}`);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: '#F8FAFC',
                      borderRadius: 10,
                      border: '1px solid #E2E8F0',
                      textDecoration: 'none',
                      color: '#0F172A',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0284C7')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E2E8F0')}
                  >
                    <span>{near.service} in {near.area}</span>
                    <ArrowRight size={14} style={{ color: '#0284C7' }} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Citywide All 35 Areas Explorer */}
          <div style={{ marginTop: '3.5rem', paddingTop: '2rem', borderTop: '1px solid #E2E8F0' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#334155', marginBottom: '0.85rem' }}>
              Xpress Nurse Serves All 35 Neighborhoods Across Hyderabad:
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {HYDERABAD_AREAS.map((area) => {
                const areaGeneralSlug = `nursing-services-${area.toLowerCase().trim().replace(/\s+/g, '-')}`;
                return (
                  <a
                    key={area}
                    href={`/${areaGeneralSlug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(`/${areaGeneralSlug}`);
                    }}
                    style={{
                      padding: '0.3rem 0.65rem',
                      background: area === page.area ? '#0284C7' : '#F1F5F9',
                      color: area === page.area ? '#FFFFFF' : '#475569',
                      borderRadius: 9999,
                      fontSize: '0.78rem',
                      fontWeight: area === page.area ? 800 : 600,
                      textDecoration: 'none',
                      border: area === page.area ? 'none' : '1px solid #E2E8F0'
                    }}
                  >
                    {area}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 8. Bottom Sticky Quick Action Bar on Mobile */}
      <div className="local-seo-bottom-bar mobile-only-cta" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 850,
        background: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        padding: '0.65rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.08)'
      }}>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            background: '#F0FDF4',
            border: '1px solid #86EFAC',
            color: '#15803D',
            padding: '0.6rem 0.5rem',
            borderRadius: 8,
            fontSize: '0.84rem',
            fontWeight: 700,
            textDecoration: 'none'
          }}
        >
          <MessageCircle size={16} style={{ color: '#25D366' }} />
          <span>WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={() => onOpenBookingForService(page.serviceId, page.area)}
          style={{
            flex: 2,
            background: '#0284C7',
            color: '#FFFFFF',
            border: 'none',
            padding: '0.65rem 0.75rem',
            borderRadius: 8,
            fontSize: '0.88rem',
            fontWeight: 800,
            cursor: 'pointer'
          }}
        >
          Book in {page.area} (₹{page.indicativePrice})
        </button>
      </div>
    </div>
  );
};
