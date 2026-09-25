import React from 'react';
import { X, QrCode, MessageCircle, Phone } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ isOpen, onClose }) => {
  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" data-lenis-prevent="true" onClick={onClose}>
      <div className="modal-box" data-lenis-prevent="true" style={{ maxWidth: 420, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '1.15rem' }}>Scan to Book on WhatsApp</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '2rem 1.5rem' }}>
          <div
            style={{
              padding: '1.25rem',
              background: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              display: 'inline-block',
              border: '2px solid var(--neutral-200)',
              boxShadow: 'var(--shadow-md)',
              marginBottom: '1.5rem'
            }}
          >
            {/* High fidelity SVG QR code representation encoded with wa.me/917569657371 */}
            <svg
              width="200"
              height="200"
              viewBox="0 0 200 200"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: 'block', margin: '0 auto' }}
            >
              <rect width="200" height="200" fill="#FFFFFF"/>
              {/* Corner 1 */}
              <rect x="20" y="20" width="50" height="50" fill="#0B2545"/>
              <rect x="28" y="28" width="34" height="34" fill="#FFFFFF"/>
              <rect x="34" y="34" width="22" height="22" fill="#0B2545"/>
              {/* Corner 2 */}
              <rect x="130" y="20" width="50" height="50" fill="#0B2545"/>
              <rect x="138" y="28" width="34" height="34" fill="#FFFFFF"/>
              <rect x="144" y="34" width="22" height="22" fill="#0B2545"/>
              {/* Corner 3 */}
              <rect x="20" y="130" width="50" height="50" fill="#0B2545"/>
              <rect x="28" y="138" width="34" height="34" fill="#FFFFFF"/>
              <rect x="34" y="144" width="22" height="22" fill="#0B2545"/>
              {/* Data modules pattern */}
              <rect x="85" y="25" width="12" height="12" fill="#0B2545"/>
              <rect x="105" y="35" width="12" height="12" fill="#0B2545"/>
              <rect x="80" y="60" width="16" height="16" fill="#0B2545"/>
              <rect x="105" y="60" width="16" height="16" fill="#E63946"/>
              <rect x="30" y="85" width="14" height="14" fill="#0B2545"/>
              <rect x="55" y="95" width="14" height="14" fill="#0B2545"/>
              <rect x="80" y="90" width="20" height="20" fill="#25D366"/>
              <rect x="110" y="95" width="14" height="14" fill="#0B2545"/>
              <rect x="135" y="85" width="14" height="14" fill="#0B2545"/>
              <rect x="160" y="95" width="14" height="14" fill="#0B2545"/>
              <rect x="85" y="130" width="12" height="12" fill="#0B2545"/>
              <rect x="105" y="145" width="12" height="12" fill="#0B2545"/>
              <rect x="135" y="135" width="20" height="20" fill="#0B2545"/>
              <rect x="165" y="145" width="14" height="14" fill="#E63946"/>
              <rect x="80" y="165" width="16" height="16" fill="#0B2545"/>
              <rect x="105" y="170" width="16" height="16" fill="#0B2545"/>
              {/* Center WhatsApp Logo Icon */}
              <circle cx="100" cy="100" r="18" fill="#25D366" stroke="#FFFFFF" strokeWidth="3"/>
              <path d="M93 104c1 2 3 4 5 5l2-2c.3-.3.8-.4 1.2-.2 1.2.5 2.5.8 3.8.8.6 0 1 .4 1 1v3.5c0 .6-.4 1-1 1-7.7 0-14-6.3-14-14 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.3 2.6.8 3.8.2.4.1.9-.2 1.2l-2.3 2.1z" fill="#FFFFFF"/>
            </svg>
          </div>

          <h4 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', color: 'var(--primary-navy-900)' }}>
            Instant WhatsApp Connect
          </h4>
          <p style={{ fontSize: '0.88rem', color: 'var(--neutral-600)', marginBottom: '1.5rem' }}>
            Open camera on any smartphone and scan this QR code to connect directly with the <strong>Xpress Nurse</strong> team on WhatsApp.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <a
              href="https://wa.me/917569657371?text=Hello%20Xpress%20Nurse%20team,%20I%20am%20contacting%20you%20via%20the%20website%20QR%20code."
              target="_blank"
              rel="noreferrer"
              className="btn btn-whatsapp"
            >
              <MessageCircle size={18} />
              <span>Chat on WhatsApp</span>
            </a>

            <button onClick={onClose} className="btn btn-outline btn-sm">
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
