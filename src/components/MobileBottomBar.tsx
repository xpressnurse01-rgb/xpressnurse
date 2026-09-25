import React from 'react';
import { MessageCircle, HeartPulse } from 'lucide-react';

interface MobileBottomBarProps {
  onOpenBooking: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({ onOpenBooking }) => {
  return (
    <div className="mobile-bottom-bar-clean" aria-label="Mobile Quick Booking Actions">
      <a
        href="https://wa.me/917569657371?text=Hi%20Xpress%20Nurse,%20I%20need%20urgent%20home%20nursing%20care."
        target="_blank"
        rel="noreferrer"
        className="btn btn-whatsapp"
        style={{ width: '100%', fontSize: '0.85rem', gap: '0.4rem' }}
      >
        <MessageCircle size={16} />
        <span>WhatsApp Booking</span>
      </a>

      <button
        onClick={onOpenBooking}
        className="btn btn-danger"
        style={{ width: '100%', fontSize: '0.85rem', gap: '0.4rem' }}
      >
        <HeartPulse size={16} />
        <span>Book a Nurse</span>
      </button>
    </div>
  );
};
