import React, { useState } from 'react';
import { ServiceId, ServiceItem } from '../types';
import { 
  Droplet, 
  ShieldCheck, 
  Activity, 
  FileText, 
  Scissors, 
  TestTube2, 
  Stethoscope, 
  HeartHandshake, 
  Clock, 
  ArrowRight,
  CheckCircle,
  Sparkles,
  Filter,
  Loader2
} from 'lucide-react';

interface ServicesSectionProps {
  services?: ServiceItem[];
  onSelectServiceToBook: (serviceId: ServiceId) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ services = [], onSelectServiceToBook }) => {
  const serviceList = services;
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Ensure newly filtered cards smoothly animate in when switching categories
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const cards = document.querySelectorAll('.service-card-editorial');
      cards.forEach((card) => card.classList.add('is-visible'));
    }, 40);
    return () => clearTimeout(timer);
  }, [activeCategory]);

  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case 'Droplet': return <Droplet size={17} />;
      case 'ShieldCheck': return <ShieldCheck size={17} />;
      case 'Activity': return <Activity size={17} />;
      case 'FileText': return <FileText size={17} />;
      case 'Scissors': return <Scissors size={17} />;
      case 'TestTube2': return <TestTube2 size={17} />;
      case 'Stethoscope': return <Stethoscope size={17} />;
      case 'HeartHandshake': return <HeartHandshake size={17} />;
      default: return <Activity size={17} />;
    }
  };

  const filteredServices = serviceList.filter((srv) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'infusion') return srv.id === 'saline-infusion' || srv.id === 'lab-diagnostics';
    if (activeCategory === 'wound') return srv.id === 'wound-dressing' || srv.id === 'suture-removal';
    if (activeCategory === 'catheter') return srv.id === 'foleys-catheter' || srv.id === 'ryles-tube';
    if (activeCategory === 'consult') return srv.id === 'doctor-consult' || srv.id === 'personalized-nursing';
    return true;
  });

  const cleanPriceDisplay = (srv: ServiceItem) => {
    if (srv.priceNumber) return `₹${srv.priceNumber.toLocaleString('en-IN')}`;
    const match = (srv.indicativePrice || '').match(/₹[\d,]+/);
    return match ? match[0] : (srv.indicativePrice || '₹799');
  };

  return (
    <section className="section-spacing services-editorial-section" id="services">
      <div className="container">
        {/* Section Header */}
        <div className="section-header text-center reveal-on-scroll">
          <span className="section-badge">
            <Sparkles size={13} />
            <span>Home Care, Handled by Professionals</span>
          </span>
          <h2 className="section-title">Our Services</h2>
          <p className="section-subtitle">
            Safe, compassionate medical and nursing procedures delivered at your doorstep by certified professionals.
          </p>
        </div>

        {/* District by Zomato Style Capsule Filter Bar - Full Width with Smooth Centering */}
        <div className="services-filter-container reveal-on-scroll reveal-delay-1">
          <div className="services-filter-bar">
            <button
              onClick={() => setActiveCategory('all')}
              className={`filter-pill ${activeCategory === 'all' ? 'active' : ''}`}
            >
              All Services ({serviceList.length})
            </button>
            <button
              onClick={() => setActiveCategory('infusion')}
              className={`filter-pill ${activeCategory === 'infusion' ? 'active' : ''}`}
            >
              IV Infusions &amp; Injections
            </button>
            <button
              onClick={() => setActiveCategory('wound')}
              className={`filter-pill ${activeCategory === 'wound' ? 'active' : ''}`}
            >
              Post-Op &amp; Wound Care
            </button>
            <button
              onClick={() => setActiveCategory('catheter')}
              className={`filter-pill ${activeCategory === 'catheter' ? 'active' : ''}`}
            >
              Catheter &amp; Tubes
            </button>
            <button
              onClick={() => setActiveCategory('consult')}
              className={`filter-pill ${activeCategory === 'consult' ? 'active' : ''}`}
            >
              Doctor Consultation
            </button>
          </div>
        </div>

        {/* Services Editorial Grid - Clean, Uncluttered District Style */}
        <div className="services-editorial-grid">
          {filteredServices.map((service, index) => (
            <div 
              key={service.id} 
              className={`service-card-editorial reveal-on-scroll reveal-delay-${(index % 6) + 1}`}
              onClick={() => onSelectServiceToBook(service.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectServiceToBook(service.id);
                }
              }}
              aria-label={`Book ${service.title} doorstep nursing visit`}
            >
              {/* Card Media Header - Clean Single Badge */}
              <div className="service-media-wrap">
                <img
                  src={service.imageUrl || '/images/doctor_xpressnurse.jpg'}
                  alt={service.title}
                  className="service-photo"
                  loading="lazy"
                />
                
                {/* Single Clean Tag Pill on Top-Left */}
                <div className="service-single-badge">
                  {service.prescriptionRequired ? (
                    <span className="district-tag rx">Rx Mandatory</span>
                  ) : (
                    <span className="district-tag direct">Direct Booking</span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="service-editorial-body">
                <div className="service-card-header-row">
                  <h3 className="service-card-title">{service.title}</h3>
                  <div className="service-inline-time">
                    <Clock size={12} />
                    <span>{service.duration}</span>
                  </div>
                </div>

                <p className="service-card-desc">{service.subtitle}</p>

                {/* Micro Inclusions Note */}
                <div className="service-inclusion-note">
                  <CheckCircle size={13} className="inclusion-check" />
                  <span>Sealed sterile consumables included</span>
                </div>

                {/* District by Zomato Neat Bottom Bar */}
                <div className="service-district-bottom-row">
                  <div className="district-price-col">
                    <div className="district-price-value">{cleanPriceDisplay(service)}</div>
                    <div className="district-price-note">All-inclusive • Zero advance</div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectServiceToBook(service.id);
                    }}
                    className="district-book-btn"
                  >
                    <span>Book Visit</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
