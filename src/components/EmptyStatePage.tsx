import React from 'react';
import { HeartPulse, CalendarX, ArrowLeft, Phone, MessageCircle } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface EmptyStatePageProps {
  onNavigate: (path: string) => void;
  onOpenBooking: () => void;
}

export const EmptyStatePage: React.FC<EmptyStatePageProps> = ({
  onNavigate,
  onOpenBooking
}) => {
  return (
    <section className="section-spacing" style={{ minHeight: '65vh', display: 'flex', alignItems: 'center' }}>
      <div className="container" style={{ maxWidth: 720 }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={() => onNavigate('/')}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={14} />
            <span>Back to Home</span>
          </button>
        </div>

        <EmptyState
          icon={<CalendarX size={36} style={{ color: 'var(--clinical-blue-600)' }} />}
          title="No Active Bookings or Medical Records"
          description="You currently have no scheduled nurse visits, diagnostic appointments, or active doctor teleconsultations in your session. Book a certified nurse or connect with our clinical desk anytime."
          actionText="Book Home Nursing Visit"
          onAction={onOpenBooking}
          secondaryActionText="Explore Services"
          onSecondaryAction={() => onNavigate('/')}
        />

        <div
          style={{
            marginTop: '2rem',
            padding: '1.25rem',
            background: 'var(--neutral-100)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Phone size={16} style={{ color: 'var(--accent-red-500)' }} />
            <span style={{ fontSize: '0.88rem', color: 'var(--neutral-700)' }}>
              Need urgent clinical assistance? Call 24/7 Helpline: <a href="tel:+917569657371" style={{ color: 'var(--primary-navy-900)', fontWeight: 700 }}>+91 75696 57371</a>
            </span>
          </div>

          <a
            href="https://wa.me/917569657371?text=Hi%20Xpress%20Nurse,%20I%20need%20assistance%20with%20my%20appointment."
            target="_blank"
            rel="noreferrer"
            className="btn btn-whatsapp btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <MessageCircle size={14} />
            <span>WhatsApp Care Desk</span>
          </a>
        </div>
      </div>
    </section>
  );
};
