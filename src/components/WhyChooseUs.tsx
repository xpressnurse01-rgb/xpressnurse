import React from 'react';
import { 
  Award, 
  ShieldCheck, 
  Clock, 
  BadgePercent, 
  HeartHandshake, 
  Sparkles,
  CheckCircle2,
  Stethoscope
} from 'lucide-react';

export const WhyChooseUs: React.FC = () => {
  const pillars = [
    {
      icon: <Award size={22} />,
      title: 'Trained & Experienced Nurses',
      subtitle: 'Verified Hospital Pedigree',
      description: 'Qualified B.Sc Nursing and GNM professionals with ICU and hospital ward experience, verified certifications, and proven clinical competence.'
    },
    {
      icon: <ShieldCheck size={22} />,
      title: 'Hygienic & Safe Procedures',
      subtitle: 'Zero Cross-Contamination',
      description: 'Hospital-grade infection control protocols with pre-packaged, single-use sterile medical consumables and strict aseptic procedures.'
    },
    {
      icon: <Clock size={22} />,
      title: 'Prompt, Well-Organized Visits',
      subtitle: 'Area-Based Nurse Routing',
      description: 'Nearest available verified nurse in Hyderabad is assigned quickly to your home, ensuring smooth coordination and timely clinical care.'
    },
    {
      icon: <BadgePercent size={22} />,
      title: 'Fair, Transparent Charges',
      subtitle: 'No Surprise Charges',
      description: 'Clear, upfront charges inclusive of sterile consumables and nurse visit. Pay safely at home only after your procedure is successfully completed.'
    },
    {
      icon: <Sparkles size={22} />,
      title: 'Available Every Day of the Week',
      subtitle: '24/7 Clinical Support',
      description: 'Dependable home nursing coverage 7 days a week across Hyderabad, with tele-doctor consultation available whenever medical guidance is needed.'
    },
    {
      icon: <HeartHandshake size={22} />,
      title: 'Compassionate & Reliable Care',
      subtitle: 'Gentle Bedside Manner',
      description: 'Empathetic, respectful bedside interaction designed to keep post-operative recovery, bedridden, and elderly patients calm and supported.'
    }
  ];

  return (
    <section className="section-spacing why-us-editorial-section" id="why-us">
      <div className="container">
        {/* Header */}
        <div className="section-header text-center reveal-on-scroll">
          <span className="section-badge">
            <ShieldCheck size={13} />
            <span>Care That Comes To You</span>
          </span>
          <h2 className="section-title">Why Families Choose Xpress Nurse</h2>
          <p className="section-subtitle">
            Professional medical and nursing services delivered safely at home with hospital-grade clinical diligence.
          </p>
        </div>

        {/* 6-Pillar Editorial Grid */}
        <div className="why-editorial-grid">
          {pillars.map((pillar, idx) => (
            <div key={idx} className={`why-card-editorial reveal-on-scroll reveal-delay-${(idx % 6) + 1}`}>
              <div className="why-card-header">
                <div className="why-icon-stage">
                  {pillar.icon}
                </div>
                <span className="why-subtitle-tag">{pillar.subtitle}</span>
              </div>
              <h3 className="why-card-heading">{pillar.title}</h3>
              <p className="why-card-text">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
