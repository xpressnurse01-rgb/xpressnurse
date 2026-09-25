import React from 'react';
import { Star, Quote, CheckCircle2, ShieldCheck } from 'lucide-react';

export const Testimonials: React.FC = () => {
  const reviews = [
    {
      name: 'Dr. Suresh Varma',
      role: 'Consultant & Son of 78-yr elderly patient',
      location: 'Gachibowli, Hyderabad',
      text: 'My father required regular IV saline and Foley catheter maintenance post-stroke. Nurse Priya arrived within 35 minutes, carried an immaculate hospital-sealed sterile kit, and managed my father with supreme clinical gentleness. Uncompromising standards of care.',
      rating: 5,
      service: 'IV Infusion & Catheter Care'
    },
    {
      name: 'Sunita Mehra',
      role: 'Post-knee replacement patient',
      location: 'LB Nagar, Hyderabad',
      text: 'Having surgical suture removal done at home saved me a painful, exhausting trip in city traffic. Nurse Rajesh was punctual, inspected the incision site with great diligence, and removed all stitches completely painlessly.',
      rating: 5,
      service: 'Surgical Suture Removal'
    },
    {
      name: 'Ravi Teja G.',
      role: 'Caregiver for senior mother',
      location: 'Banjara Hills, Hyderabad',
      text: 'We were anxious because we lacked an active prescription for daily wound dressing. The Xpress Nurse care team arranged an online doctor consult in under 12 minutes, issued the prescription, and dispatched a nurse immediately.',
      rating: 5,
      service: 'Doctor Consult + Wound Care'
    }
  ];

  return (
    <section className="section-spacing testimonials-editorial-section" id="testimonials">
      <div className="container">
        {/* Header */}
        <div className="section-header text-center reveal-on-scroll">
          <span className="section-badge">
            <CheckCircle2 size={13} />
            <span>Verified Patient Experiences</span>
          </span>
          <h2 className="section-title">Trusted by 10,000+ Families in Hyderabad</h2>
          <p className="section-subtitle">
            Read authentic feedback from patients, physicians, and family caregivers across Hyderabad’s residential neighborhoods.
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="testimonials-editorial-grid">
          {reviews.map((rev, idx) => (
            <div key={idx} className={`testimonial-card-editorial reveal-on-scroll reveal-delay-${idx + 1}`}>
              <div className="testimonial-card-top">
                <div className="testimonial-stars">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} size={15} fill="#F59E0B" color="#F59E0B" />
                  ))}
                </div>
                <span className="testimonial-service-tag">{rev.service}</span>
              </div>

              <p className="testimonial-quote-text">
                "{rev.text}"
              </p>

              <div className="testimonial-author-row">
                <div className="author-avatar-badge">
                  {rev.name.charAt(0)}
                </div>
                <div className="author-details">
                  <div className="author-name-row">
                    <h4 className="author-name">{rev.name}</h4>
                    <span className="author-verified-chip" title="Verified Home Care Patient">
                      <ShieldCheck size={12} />
                      <span>Verified</span>
                    </span>
                  </div>
                  <p className="author-role">{rev.role}</p>
                  <p className="author-location">{rev.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
