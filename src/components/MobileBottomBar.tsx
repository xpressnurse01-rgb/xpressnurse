import React from 'react';
import { MessageCircle, HeartPulse, ArrowRight } from 'lucide-react';

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
        className="mobile-bar-whatsapp-btn"
        aria-label="Direct WhatsApp Consultation"
        title="Chat with nurse coordinator on WhatsApp"
      >
        <MessageCircle size={20} />
        <span className="mobile-bar-btn-sub">Chat</span>
      </a>

      <button
        onClick={onOpenBooking}
        className="mobile-bar-primary-btn"
        aria-label="Book a Verified Home Nurse"
      >
        <div className="mobile-bar-btn-content">
          <div className="mobile-bar-btn-title">
            <HeartPulse size={16} />
            <span>Book Home Visit</span>
          </div>
          <div className="mobile-bar-btn-meta">Doorstep in 60-90m • From ₹699</div>
        </div>
        <ArrowRight size={16} className="mobile-bar-btn-arrow" />
      </button>
    </div>
  );
};

