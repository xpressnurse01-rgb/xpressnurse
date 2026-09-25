import React from 'react';
import { X, ShieldCheck, FileText, RefreshCw } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

export type PolicyType = 'privacy' | 'terms' | 'refund' | null;

interface PolicyModalProps {
  policy: PolicyType;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ policy, onClose }) => {
  useBodyScrollLock(Boolean(policy));
  if (!policy) return null;

  return (
    <div className="modal-overlay" data-lenis-prevent="true" onClick={onClose}>
      <div
        className="modal-box" data-lenis-prevent="true"
        style={{ maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {policy === 'privacy' && <ShieldCheck size={22} style={{ color: 'var(--clinical-blue-600)' }} />}
            {policy === 'terms' && <FileText size={22} style={{ color: 'var(--primary-navy-700)' }} />}
            {policy === 'refund' && <RefreshCw size={22} style={{ color: 'var(--accent-red-500)' }} />}
            <div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-navy-900)' }}>
                {policy === 'privacy' && 'Privacy & Health Data Policy'}
                {policy === 'terms' && 'Terms of Home Clinical Care'}
                {policy === 'refund' && 'Cancellation & Refund Policy'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>
                Digital Personal Data Protection (DPDP) Act Compliant
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" data-lenis-prevent="true" style={{ maxHeight: '65vh', overflowY: 'auto', fontSize: '0.88rem', lineHeight: 1.65, color: 'var(--neutral-700)' }}>
          {policy === 'privacy' && (
            <div>
              <p style={{ marginBottom: '1rem' }}>
                Xpress Nurse Technologies Pvt. Ltd. adheres to the highest medical confidentiality protocols and the Indian Digital Personal Data Protection (DPDP) Act.
              </p>
              <h4 style={{ color: 'var(--primary-navy-900)', fontSize: '0.98rem', margin: '1rem 0 0.4rem' }}>
                1. Clinical Data Protection
              </h4>
              <p style={{ marginBottom: '0.8rem' }}>
                Patient medical prescriptions, vitals, and physician notes are securely stored with end-to-end encryption. Clinical records are shared strictly with the attending registered nurse and consulting doctor.
              </p>
              <h4 style={{ color: 'var(--primary-navy-900)', fontSize: '0.98rem', margin: '1rem 0 0.4rem' }}>
                2. Contact & Geolocation Use
              </h4>
              <p style={{ marginBottom: '0.8rem' }}>
                Your phone number and Hyderabad locality coordinates are utilized exclusively for nurse dispatch routing and WhatsApp booking confirmations. We never sell or share patient contact details with third-party advertisers.
              </p>
              <h4 style={{ color: 'var(--primary-navy-900)', fontSize: '0.98rem', margin: '1rem 0 0.4rem' }}>
                3. Consent & Data Erasure
              </h4>
              <p>
                Patients or authorized family guardians can request complete deletion of past consultation files and uploaded prescriptions by writing to <strong>care@xpressnurse.in</strong>.
              </p>
            </div>
          )}

          {policy === 'terms' && (
            <div>
              <p style={{ marginBottom: '1rem' }}>
                By booking home healthcare through Xpress Nurse, you acknowledge and agree to our clinical standard operating guidelines:
              </p>
              <h4 style={{ color: 'var(--primary-navy-900)', fontSize: '0.98rem', margin: '1rem 0 0.4rem' }}>
                1. Prescription Requirement
              </h4>
              <p style={{ marginBottom: '0.8rem' }}>
                In compliance with medical regulations, all invasive nursing procedures (including IV Saline Infusions, Foley Catheterizations, Ryles NG Tube placements, and Suture Removals) strictly require a valid, signed doctor prescription. If you lack an active prescription, our on-call tele-physician must evaluate the patient first.
              </p>
              <h4 style={{ color: 'var(--primary-navy-900)', fontSize: '0.98rem', margin: '1rem 0 0.4rem' }}>
                2. Emergency Situations
              </h4>
              <p style={{ marginBottom: '0.8rem' }}>
                Xpress Nurse is a home visit platform and not a replacement for intensive care resuscitation or critical emergency services. In case of acute chest pain, sudden breathlessness, severe hemorrhage, or loss of consciousness, dial emergency services (108) or proceed to the nearest hospital emergency department immediately.
              </p>
              <h4 style={{ color: 'var(--primary-navy-900)', fontSize: '0.98rem', margin: '1rem 0 0.4rem' }}>
                3. Safety & Professional Dignity
              </h4>
              <p>
                Our visiting healthcare personnel are registered, verified nursing professionals. Patients and families must provide a safe, respectful domestic environment for clinical care.
              </p>
            </div>
          )}

          {policy === 'refund' && (
            <div>
              <p style={{ marginBottom: '1rem' }}>
                We believe in transparent, stress-free billing for families undergoing medical recovery:
              </p>
              <h4 style={{ color: 'var(--primary-navy-900)', fontSize: '0.98rem', margin: '1rem 0 0.4rem' }}>
                1. Cancellation Before Nurse Dispatch
              </h4>
              <p style={{ marginBottom: '0.8rem' }}>
                If you cancel a booking before the assigned nurse departs for your address, 100% of any advance payment is refunded immediately without any cancellation fee.
              </p>
              <h4 style={{ color: 'var(--primary-navy-900)', fontSize: '0.98rem', margin: '1rem 0 0.4rem' }}>
                2. Cancellation After Arrival
              </h4>
              <p style={{ marginBottom: '0.8rem' }}>
                If a nurse has already reached your doorstep and the procedure is cancelled due to patient refusal or missing doctor prescription, a nominal travel & asepsis kit charge of ₹200 is retained, with the remaining balance refunded.
              </p>
              <h4 style={{ color: 'var(--primary-navy-900)', fontSize: '0.98rem', margin: '1rem 0 0.4rem' }}>
                3. Refund Processing Timeline
              </h4>
              <p>
                Approved refunds are processed back to the original payment source (UPI / Card / NetBanking) within 2 to 4 business days. For assistance, email <strong>care@xpressnurse.in</strong> or call <strong>+91 75696 57371</strong>.
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Understood & Close
          </button>
        </div>
      </div>
    </div>
  );
};
