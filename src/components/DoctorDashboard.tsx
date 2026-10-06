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
  CalendarX,
  Printer,
  Share2,
  Edit3,
  ShieldCheck,
  Sparkles,
  Download,
  Check,
  LogOut
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EmptyState } from './EmptyState';
import { formatDateTimeDDMMYY } from '../lib/dateUtils';

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
  const [isEditingRx, setIsEditingRx] = useState(false);

  // Synchronize selected consultation whenever consultations update in realtime
  React.useEffect(() => {
    if (selectedConsult) {
      const fresh = consultations.find((c) => c.id === selectedConsult.id);
      if (fresh && (fresh.status !== selectedConsult.status || fresh.prescriptionText !== selectedConsult.prescriptionText)) {
        setSelectedConsult(fresh);
      }
    } else if (consultations.length > 0) {
      setSelectedConsult(consultations[0]);
    }
  }, [consultations]);

  // When selectedConsult changes, sync the form fields
  const handleSelectConsult = (c: DoctorConsultation) => {
    setSelectedConsult(c);
    setIsEditingRx(false);
    setRxError('');
    if (c.prescriptionText) {
      setRxText(c.prescriptionText);
    } else {
      setRxText('');
    }
    if (c.recommendedService) {
      setRecommendedSvc(c.recommendedService);
    }
  };

  const handleIssueRx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsult) return;
    if (!rxText.trim()) {
      setRxError('Please enter clinical prescription orders, dosage, or medical evaluation.');
      return;
    }
    setRxError('');

    const trimmedRx = rxText.trim();
    const updatedConsult: DoctorConsultation = {
      ...selectedConsult,
      status: 'Prescription Issued',
      prescriptionIssued: true,
      prescriptionText: trimmedRx,
      recommendedService: recommendedSvc
    };

    // 1. Immediately reflect issued prescription in local state
    setSelectedConsult(updatedConsult);
    setIsEditingRx(false);

    // 2. Call parent to update App state, Supabase & Cloudflare R2
    onIssuePrescription(selectedConsult.id, trimmedRx, recommendedSvc);

    // 3. Trigger celebration confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err) {}

    setCallSuccess(`✓ Digital Prescription officially authorized & digitally signed for ${selectedConsult.patientName}. Transmitted to Xpress Nurse fleet!`);
    
    setTimeout(() => {
      setCallSuccess('');
    }, 4500);
  };

  const handleStartWhatsAppVideoCall = () => {
    if (!selectedConsult) return;
    const phone = selectedConsult.patientPhone || '';
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const doctorMsg = encodeURIComponent(
      `Hello ${selectedConsult.patientName}, this is Dr. Vikramaditya, MD from Xpress Nurse initiating your medical teleconsultation video call. Please tap or answer to start the clinical review.`
    );
    const whatsappUrl = `https://wa.me/91${cleanPhone}?text=${doctorMsg}`;
    
    setIsCalling(true);
    setCallNotice(`Redirecting to WhatsApp Video Call with ${selectedConsult.patientName} (+91 ${cleanPhone})...`);
    
    window.open(whatsappUrl, '_blank');
    
    setTimeout(() => {
      setIsCalling(false);
      setCallNotice(`WhatsApp Video Call initiated with ${selectedConsult.patientName} (+91 ${cleanPhone}). Complete clinical assessment and issue digital prescription below.`);
    }, 1500);
  };

  const handleSendWhatsAppPrescription = () => {
    if (!selectedConsult) return;
    const cleanPhone = (selectedConsult.patientPhone || '').replace(/\D/g, '').slice(-10);
    const matchedService = serviceList.find((s) => s.id === (selectedConsult.recommendedService || recommendedSvc));
    const serviceTitle = matchedService?.title || 'Home Nursing Clinical Care';
    const message = encodeURIComponent(
      `*Xpress Nurse — Official Medical Prescription*\n` +
      `------------------------------------------\n` +
      `*Patient:* ${selectedConsult.patientName} (${selectedConsult.patientAge} yrs)\n` +
      `*Attending Physician:* Dr. Vikramaditya, MBBS, MD (TSMC Reg: TSMC/2016/9421)\n` +
      `*Locality / Zone:* ${selectedConsult.area}, Hyderabad\n` +
      `*Approved Procedure:* ${serviceTitle}\n` +
      `*Clinical Orders (Rx):*\n${selectedConsult.prescriptionText || rxText}\n` +
      `------------------------------------------\n` +
      `✓ *Digitally Signed & Validated for Xpress Nurse Home Care Fleet*`
    );
    window.open(`https://wa.me/91${cleanPhone}?text=${message}`, '_blank');
  };

  const isIssued = selectedConsult?.status === 'Prescription Issued' || Boolean(selectedConsult?.prescriptionIssued);

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span className="status-pill success" style={{ fontWeight: 700, padding: '4px 10px' }}>
            Dr. Vikramaditya, MD (TSMC/2016/9421) — Active On Duty
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => {
              try {
                sessionStorage.removeItem('xn_auth_user');
                sessionStorage.removeItem('xn_auth_user_doctor');
                localStorage.removeItem('xn_auth_user_doctor');
                const legacy = localStorage.getItem('xn_auth_user');
                if (legacy && legacy.includes('"role":"doctor"')) {
                  localStorage.removeItem('xn_auth_user');
                }
                window.location.href = '/login?portal=doctor';
              } catch {}
            }}
            style={{
              color: '#EF4444',
              borderColor: '#FECDD3',
              background: '#FFF1F2',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
            title="Sign out of Doctor Panel"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Top Clinical Contextual Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#EFF6FF', color: '#0284C7' }}>
            <Stethoscope size={22} />
          </div>
          <div>
            <div className="stat-val">{consultations.length}</div>
            <div className="stat-label">Total Tele-Consults</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-val" style={{ color: '#D97706' }}>
              {consultations.filter(c => c.status === 'Awaiting Call').length}
            </div>
            <div className="stat-label">Awaiting Doctor Call</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="stat-val" style={{ color: '#10B981' }}>
              {consultations.filter(c => c.status === 'Prescription Issued').length}
            </div>
            <div className="stat-label">Prescriptions Issued</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FAF5FF', color: '#9333EA' }}>
            <Video size={22} />
          </div>
          <div>
            <div className="stat-val" style={{ color: '#9333EA', fontSize: '1.1rem' }}>
              WhatsApp Video
            </div>
            <div className="stat-label">Direct Tele-Consults</div>
          </div>
        </div>
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
                  onClick={() => handleSelectConsult(c)}
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
                    <span><Clock size={12} style={{ display: 'inline', verticalAlign: -2 }} /> {formatDateTimeDDMMYY(c.requestedAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Selected Consultation Details & Prescription Form / Display */}
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
                  <div style={{ padding: '0.9rem', background: '#ECFDF5', border: '1.5px solid #A7F3D0', borderRadius: 'var(--radius-md)', color: '#065F46', marginBottom: '1.25rem', fontWeight: 600 }}>
                    {callSuccess}
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

                {/* If prescription is already issued and not currently in editing mode, show the full Official Authorized Prescription Card */}
                {isIssued && !isEditingRx ? (
                  <div style={{
                    border: '2px solid #0284C7',
                    borderRadius: 12,
                    background: '#FFFFFF',
                    padding: '1.5rem',
                    boxShadow: '0 4px 16px rgba(2, 132, 199, 0.08)',
                    position: 'relative'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0F172A', paddingBottom: '0.85rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A' }}>
                          OFFICIAL DIGITAL PRESCRIPTION & CLINICAL ORDERS
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#0284C7', fontWeight: 700 }}>
                          TELANGANA STATE MEDICAL COUNCIL • REG: TSMC/2016/9421
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                          Dr. Vikramaditya, MBBS, MD (Internal Medicine) • Authorized Tele-Consultant
                        </div>
                      </div>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        background: '#DCFCE7',
                        border: '1px solid #86EFAC',
                        color: '#166534',
                        padding: '4px 10px',
                        borderRadius: 9999,
                        fontSize: '0.75rem',
                        fontWeight: 800
                      }}>
                        <ShieldCheck size={14} />
                        <span>Digitally Signed & Valid</span>
                      </span>
                    </div>

                    {/* Patient Bar */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', background: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1.25rem' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Patient</div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A' }}>{selectedConsult.patientName}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Age / Gender</div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>{selectedConsult.patientAge} Years</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Phone</div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>{selectedConsult.patientPhone}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Location</div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>{selectedConsult.area}, Hyderabad</div>
                      </div>
                    </div>

                    {/* Approved Clinical Procedure */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>
                        Approved Clinical Nursing Procedure:
                      </div>
                      <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#0284C7', marginTop: 2 }}>
                        {serviceList.find((s) => s.id === (selectedConsult.recommendedService || recommendedSvc))?.title || 'Saline Infusion Therapy'}
                      </div>
                    </div>

                    {/* Rx Body */}
                    <div style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0369A1', fontWeight: 900, fontSize: '1.1rem', marginBottom: '0.4rem' }}>
                        <span>℞</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Physician Orders & Administration Protocol</span>
                      </div>
                      <div style={{ fontSize: '0.92rem', color: '#0F172A', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontWeight: 600 }}>
                        {selectedConsult.prescriptionText || rxText}
                      </div>
                    </div>

                    {/* Signoff Stamp */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px dashed #CBD5E1', paddingTop: '0.85rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          Issued for Home Nursing Execution across Hyderabad
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                          Ref ID: DOC-RX-{selectedConsult.id}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0F172A' }}>
                          Dr. Vikramaditya, MD
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                          ✓ Digitally Authenticated & Stamped
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: Print, WhatsApp, Revise */}
                    <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
                      >
                        <Printer size={15} />
                        <span>Print Prescription</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendWhatsAppPrescription}
                        className="btn btn-sm"
                        style={{
                          background: '#16A34A',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 8,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontWeight: 700,
                          padding: '0.45rem 0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Share2 size={15} />
                        <span>WhatsApp Rx to Patient</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingRx(true);
                          setRxText(selectedConsult.prescriptionText || '');
                          if (selectedConsult.recommendedService) {
                            setRecommendedSvc(selectedConsult.recommendedService);
                          }
                        }}
                        className="btn btn-outline btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, marginLeft: 'auto' }}
                      >
                        <Edit3 size={14} />
                        <span>Revise / Edit Rx</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Form to Authorize and Issue Digital Prescription */
                  <form onSubmit={handleIssueRx}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        Approved Clinical Nursing Procedure *
                      </label>
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
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        Doctor Prescription & Clinical Orders (Rx) *
                      </label>
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
                        <div className="field-error-msg" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#DC2626', fontSize: '0.8rem', marginTop: 4 }}>
                          <AlertCircle size={14} />
                          <span>{rxError}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '0.85rem', background: '#FFF1F2', borderRadius: 'var(--radius-md)', border: '1px solid #FECDD3', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#9F1239' }}>
                      ⚕️ <strong>Digital Signature Notice:</strong> Issuing this prescription digitally authorizes the Xpress Nurse field team to execute this clinical procedure for the patient. A clinical record is created in Cloudflare R2 and dispatched to central admin.
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ 
                          flex: 1, 
                          padding: '0.75rem', 
                          fontWeight: 800, 
                          fontSize: '0.95rem',
                          background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <FileText size={18} />
                        <span>Authorize & Issue Digital Prescription</span>
                      </button>

                      {isIssued && (
                        <button
                          type="button"
                          onClick={() => setIsEditingRx(false)}
                          className="btn btn-outline"
                          style={{ fontWeight: 700 }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}
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
