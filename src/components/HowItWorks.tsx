import React from 'react';
import { CalendarCheck, Navigation, UserCheck, ArrowRight, Sparkles } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01',
      icon: <CalendarCheck size={24} />,
      title: 'Choose Required Care',
      text: 'Select your needed nursing procedure or online doctor consult. Transparent charges with zero advance deposit.'
    },
    {
      num: '02',
      icon: <Navigation size={24} />,
      title: 'Share Location & Details',
      text: '1-tap auto-detect your location or type your address. If prescription is needed, attach or connect with our online doctor.'
    },
    {
      num: '03',
      icon: <UserCheck size={24} />,
      title: 'Prompt, Well-Organized Visit',
      text: 'The nearest available verified nurse is routed promptly to your home with single-use sterile consumables. Pay after care.'
    }
  ];

  return (
    <section className="section-spacing how-it-works-section" id="how-it-works">
      <div className="container">
        <div className="section-header text-center reveal-on-scroll">
          <span className="section-badge">
            <Sparkles size={13} />
            <span>Effortless Workflow</span>
          </span>
          <h2 className="section-title">Clinical Care in 3 Simple Steps</h2>
          <p className="section-subtitle">
            Reliable, timely hospital-grade nursing delivered to your home without complex paperwork.
          </p>
        </div>

        <div className="how-it-works-grid">
          {steps.map((step, idx) => (
            <div key={step.num} className={`step-card-editorial reveal-on-scroll reveal-delay-${idx + 1}`}>
              <div className="step-card-top">
                <div className="step-icon-wrapper">
                  {step.icon}
                </div>
                <span className="step-capsule-badge">Step {step.num}</span>
              </div>
              <h3 className="step-card-title">{step.title}</h3>
              <p className="step-card-desc">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
