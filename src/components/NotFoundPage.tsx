import React from 'react';
import { Home, ArrowLeft, HeartPulse, Search, Phone, Stethoscope } from 'lucide-react';

interface NotFoundPageProps {
  onNavigate: (path: string) => void;
  onOpenBooking: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onNavigate,
  onOpenBooking
}) => {
  return (
    <section className="section-spacing" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center' }}>
      <div className="container" style={{ maxWidth: 680, textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'var(--accent-red-50)',
            color: 'var(--accent-red-500)',
            marginBottom: '1.5rem',
            border: '2px solid rgba(230, 57, 70, 0.2)'
          }}
        >
          <HeartPulse size={42} />
        </div>

        <div style={{ marginBottom: '0.5rem' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '3.5rem',
              fontWeight: 800,
              lineHeight: 1,
              color: 'var(--primary-navy-900)',
              letterSpacing: '-0.03em'
            }}
          >
            404
          </span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: 'var(--primary-navy-900)', marginBottom: '0.75rem' }}>
          Healthcare Page Not Found
        </h1>

        <p style={{ color: 'var(--neutral-600)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          The page or clinical link you are looking for might have been moved, removed, or is temporarily unavailable. Let's get you back to safe, verified healthcare.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
          <button
            onClick={() => onNavigate('/')}
            className="btn btn-primary btn-lg"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Home size={18} />
            <span>Return to Home</span>
          </button>

          <button
            onClick={onOpenBooking}
            className="btn btn-danger btn-lg"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <HeartPulse size={18} />
            <span>Book a Nurse</span>
          </button>
        </div>

        {/* Quick Service Links */}
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--neutral-200)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            textAlign: 'left'
          }}
        >
          <h4 style={{ fontSize: '0.95rem', color: 'var(--primary-navy-900)', marginBottom: '1rem' }}>
            Popular Healthcare Destinations:
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.88rem' }}>
            <a
              href="/"
              onClick={(e) => { e.preventDefault(); onNavigate('/'); }}
              style={{ color: 'var(--clinical-blue-600)', fontWeight: 500 }}
            >
              • Home Nursing Procedures
            </a>
            <a
              href="/doctor"
              onClick={(e) => { e.preventDefault(); onNavigate('/doctor'); }}
              style={{ color: 'var(--clinical-blue-600)', fontWeight: 500 }}
            >
              • Doctor Consultation Panel
            </a>
            <a
              href="/nurse"
              onClick={(e) => { e.preventDefault(); onNavigate('/nurse'); }}
              style={{ color: 'var(--clinical-blue-600)', fontWeight: 500 }}
            >
              • Nurse Staff Portal
            </a>
            <a
              href="tel:+917569657371"
              style={{ color: 'var(--accent-red-500)', fontWeight: 600 }}
            >
              • 24/7 Helpline: 75696 57371
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
