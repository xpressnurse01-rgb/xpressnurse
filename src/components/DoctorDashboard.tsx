import React, { useState } from 'react';
import { DoctorConsultation, ServiceId, Booking, ServiceItem } from '../types';
import { 
  Stethoscope, 
  Video, 
  FileText, 
  CheckCircle2, 
  Clock, 
  User, 
  Phone, 
  AlertCircle, 
  Send,
  MapPin,
  CalendarX 
} from 'lucide-react';
import { EmptyState } from './EmptyState';

interface DoctorDashboardProps {
  consultations: DoctorConsultation[];
  services?: ServiceItem[];
  onIssuePrescription: (consultationId: string, prescriptionText: string, recommendedService: ServiceId) => void;
  onAddNewConsultation: (consultation: DoctorConsultation) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  consultations,
  services = [],
  onIssuePrescription,
  onAddNewConsultation
}) => {
  const serviceList = services;
  const [selectedConsult, setSelectedConsult] = useState<DoctorConsultation | null>(consultations[0] || null);
  const [rxText, setRxText] = useState('');
  const [rxError, setRxError] = useState('');
  const [recommendedSvc, setRecommendedSvc] = useState<ServiceId>('saline-infusion');
  const [isCalling, setIsCalling] = useState(false);
  const [callSuccess, setCallSuccess] = useState('');
  const [callNotice, setCallNotice] = useState('');

  const handleIssueRx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsult) return;
    if (!rxText.trim()) {
      setRxError('Please enter clinical prescription orders, dosage, or medical evaluation.');
      return;
    }
    setRxError('');

    onIssuePrescription(selectedConsult.id, rxText, recommendedSvc);
    setCallSuccess(`Prescription issued successfully for ${selectedConsult.patientName}. Transmitted to Xpress Nurse fleet.`);
    setRxText('');
    
    setTimeout(() => {
      setCallSuccess('');
    }, 3500);
  };

  const handleStartWhatsAppVideoCall = () => {
    if (!selectedConsult) return;
    const phone = selectedConsult.patientPhone || '';
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const doctorMsg = encodeURIComponent(
      `Hello ${selectedConsult.patientName}, this is Dr. Vikramaditya, MD from Xpress Nurse initiating your medical teleconsultation video call. Please answer or tap to start video call.`
    );
    const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${doctorMsg}`;
    
    setIsCalling(true);
    setCallNotice(`Redirecting to WhatsApp Video Call with ${selectedConsult.patientName} (+91 ${cleanPhone})...`);
    
    window.open(whatsappUrl, '_blank');
    
    setTimeout(() => {
      setIsCalling(false);
      setCallNotice(`WhatsApp Video Call initiated with ${selectedConsult.patientName} (+91 ${cleanPhone}). Complete assessment and issue clinical prescription below.`);
    }, 1500);
  };

  return (
    <div className="panel-container container">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #0284C7, #0369A1)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Stethoscope size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', color: 'var(--primary-navy-900)' }}>
              Doctor Clinical Consultation & Rx Panel
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--neutral-600)' }}>
              Evaluate patients, clear clinical orders, and issue digital prescriptions for home nursing
            </p>
          </div>
        </div>

        <span className="status-pill success">Dr. Vikramaditya, MD (Internal Medicine) - On Duty</span>
      </div>

      <div className="doctor-dashboard-grid">
        {/* Left Column: Consultation Queue */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Incoming Consultation Requests ({consultations.length})</h3>
          </div>
          <div style={{ padding: '0.75rem' }}>
            {consultations.length === 0 ? (
              <EmptyState
                compact
                icon={<CalendarX size={26} />}
                title="Queue Empty"
                description="No pending tele-consultation requests from Hyderabad patients."
              />
            ) : (
              consultations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedConsult(c)}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                    border: selectedConsult?.id === c.id ? '2px solid var(--primary-navy-700)' : '1px solid var(--neutral-200)',
                    background: selectedConsult?.id === c.id ? 'var(--primary-navy-50)' : 'var(--white)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <strong>{c.patientName} ({c.patientAge} yrs)</strong>
                    <span className={`status-pill ${c.status === 'Prescription Issued' ? 'success' : 'warning'}`}>
                      {c.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--neutral-600)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                    Symptoms: "{c.symptoms}"
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--neutral-500)' }}>
                    <span><MapPin size={12} style={{ display: 'inline', verticalAlign: -2 }} /> {c.area}</span>
                    <span><Clock size={12} style={{ display: 'inline', verticalAlign: -2 }} /> {c.requestedAt}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Selected Consultation Details & Prescription Form */}
        <div>
          {selectedConsult ? (
            <div className="card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Patient Medical Review: {selectedConsult.patientName}</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--neutral-500)' }}>
                    Phone: {selectedConsult.patientPhone} • Area: {selectedConsult.area}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStartWhatsAppVideoCall}
                  className="btn btn-sm"
                  disabled={isCalling}
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    fontWeight: 700,
                    padding: '0.45rem 1rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                    cursor: 'pointer'
                  }}
                >
                  <Video size={16} />
                  <span>{isCalling ? 'Opening WhatsApp...' : 'Start WhatsApp Video Call'}</span>
                </button>
              </div>

              <div className="card-body">
                {callNotice && (
                  <div style={{ padding: '0.85rem 1rem', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 'var(--radius-md)', color: '#1E40AF', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
                    📞 {callNotice}
                  </div>
                )}

                {callSuccess && (
                  <div style={{ padding: '0.9rem', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 'var(--radius-md)', color: '#065F46', marginBottom: '1.25rem' }}>
                    ✓ {callSuccess}
                  </div>
                )}

                <div style={{ padding: '1rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--neutral-200)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Reported Symptoms & Reason for Visit
                  </div>
                  <p style={{ fontSize: '0.95rem', color: 'var(--neutral-800)', marginTop: '0.25rem' }}>
                    {selectedConsult.symptoms}
                  </p>
                </div>

                <form onSubmit={handleIssueRx}>
                  <div className="form-group">
                    <label className="form-label">Approved Clinical Nursing Procedure</label>
                    <select
                      className="form-control"
                      value={recommendedSvc}
                      onChange={(e) => setRecommendedSvc(e.target.value as ServiceId)}
                    >
                      {serviceList.filter((s) => s.prescriptionRequired).map((s) => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Doctor Prescription & Clinical Orders (Rx) *</label>
                    <textarea
                      className={`form-control ${rxError ? 'is-invalid' : ''}`}
                      rows={4}
                      placeholder="e.g. Rx: Administer Normal Saline 0.9% 500ml IV at 30 drops/min. Monitor BP every 20 mins. Maintain strict asepsis. Check SpO2 before discharge."
                      value={rxText}
                      onChange={(e) => {
                        setRxText(e.target.value);
                        if (rxError) setRxError('');
                      }}
                    />
                    {rxError && (
                      <div className="field-error-msg">
                        <AlertCircle size={14} />
                        <span>{rxError}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '0.85rem', background: '#FFF1F2', borderRadius: 'var(--radius-md)', border: '1px solid #FECDD3', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#9F1239' }}>
                    ⚕️ <strong>Digital Signature Notice:</strong> Issuing this prescription digitally authorizes the Xpress Nurse field team to execute this clinical procedure for the patient.
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    <FileText size={18} />
                    <span>Authorize & Issue Digital Prescription</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No Patient Selected"
              description="Select a patient from the incoming consultation queue to review reported symptoms and issue an authorized prescription."
            />
          )}
        </div>
      </div>
    </div>
  );
};
