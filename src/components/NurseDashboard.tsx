import React, { useState } from 'react';
import { NurseProfile, NurseLead, Booking, HyderabadArea, ServiceId, ServiceItem, InvoiceDetails } from '../types';
import { 
  Award, 
  Coins, 
  TrendingUp, 
  UserPlus, 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  Phone, 
  FileCheck, 
  AlertCircle,
  Clock,
  ArrowRight,
  Send,
  Database,
  RefreshCw,
  Cloud,
  FileText,
  Receipt,
  Printer,
  Download,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EmptyState } from './EmptyState';
import { 
  generateInvoiceDetails, 
  openPrintableInvoiceWindow, 
  saveInvoiceToCloudflareBucket 
} from '../lib/cloudflareStorage';

interface NurseDashboardProps {
  currentNurse: NurseProfile;
  allNurses: NurseProfile[];
  onSelectNurse: (nurse: NurseProfile) => void;
  bookings: Booking[];
  leads?: NurseLead[];
  services?: ServiceItem[];
  onAddNewLead: (lead: NurseLead) => void;
  onUpdateNurse: (nurse: NurseProfile) => void;
  onReassignBooking?: (bookingId: string, targetNurseId: string) => void;
}

export const NurseDashboard: React.FC<NurseDashboardProps> = ({
  currentNurse,
  allNurses,
  onSelectNurse,
  bookings,
  leads = [],
  services = [],
  onAddNewLead,
  onUpdateNurse,
  onReassignBooking
}) => {
  const serviceList = services;
  const [activeTab, setActiveTab] = useState<'overview' | 'new-lead' | 'visits' | 'referrals' | 'onboarding'>('overview');

  // New lead form states
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [serviceId, setServiceId] = useState<ServiceId>('foleys-catheter');
  const [area, setArea] = useState<HyderabadArea>('LB Nagar');
  const [leadSuccessMsg, setLeadSuccessMsg] = useState('');
  const [leadErrorMsg, setLeadErrorMsg] = useState('');

  // Reassign modal state
  const [reassignModalBooking, setReassignModalBooking] = useState<Booking | null>(null);
  const [targetReassignNurseId, setTargetReassignNurseId] = useState<string>('nurse-102');

  // Invoice modal & preview state
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceDetails | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const handleOpenBookingInvoice = async (booking: Booking) => {
    const inv = generateInvoiceDetails(booking);
    setPreviewInvoice(inv);
    setIsInvoiceModalOpen(true);
    try {
      await saveInvoiceToCloudflareBucket(booking);
    } catch {
      // safe fallback
    }
  };

  // OTP Verification state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(currentNurse.certificateVerified);
  const [otpNotice, setOtpNotice] = useState<{ type: 'info' | 'success' | 'error'; message: string } | null>(null);

  // Bookings assigned to THIS nurse to execute
  const assignedVisits = bookings.filter((b) => b.assignedNurseId === currentNurse.id);

  // Leads referred by THIS nurse (from Supabase leads table)
  const myLeads = leads.filter((l) => l.nurseId === currentNurse.id);
  const pendingLeads = myLeads.filter((l) => l.status === 'Pending Approval');
  const approvedLeads = myLeads.filter((l) => l.status === 'Approved' || l.status === 'Converted');

  // Bookings referred by THIS nurse (to cross-reference dispatch)
  const myReferrals = bookings.filter((b) => b.referringNurseId === currentNurse.id);

  // Cross-area matching preview for the new lead form
  const previewExecutingNurse = allNurses.find((n) => n.serviceArea === area) || allNurses[0];
  const selectedServiceObj = serviceList.find((s) => s.id === serviceId) || serviceList[0];
  const previewFee = selectedServiceObj.priceNumber || 800;
  const previewReferralBonus = Math.round(previewFee * 0.1);
  const isCrossAreaReferral = currentNurse.serviceArea !== area;

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !patientPhone.trim()) {
      setLeadErrorMsg('Please fill in patient full name and contact mobile number.');
      return;
    }
    const cleanPhone = patientPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setLeadErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLeadErrorMsg('');

    // Lead submitted with "Pending Approval" status.
    // Points and referral commission will be decided and credited by Admin upon review.
    const newLead: NurseLead = {
      id: 'LD-' + Math.floor(1000 + Math.random() * 9000),
      nurseId: currentNurse.id,
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim(),
      serviceId,
      area,
      submittedAt: new Date().toISOString(),
      status: 'Pending Approval',
      assignedNurseId: previewExecutingNurse.id,
      leadValueRupees: previewFee,
      pointsAwarded: 0,
      referralCommissionRupees: 0
    };

    onAddNewLead(newLead);

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });

    setLeadSuccessMsg(
      isCrossAreaReferral
        ? `Order dispatched to ${previewExecutingNurse.name} (${area} RN)! Lead registered with status "Pending Admin Approval". Admin will decide and credit your reward points & referral payout shortly.`
        : `Personal lead registered and dispatched! Status: "Pending Admin Approval". Admin will decide and credit your reward points & referral payout shortly.`
    );
    setPatientName('');
    setPatientPhone('');

    setTimeout(() => {
      setLeadSuccessMsg('');
      setActiveTab('referrals');
    }, 2800);
  };

  const handleConfirmReassign = () => {
    if (reassignModalBooking && onReassignBooking) {
      onReassignBooking(reassignModalBooking.id, targetReassignNurseId);
      setReassignModalBooking(null);
    }
  };

  const handleSendOtp = () => {
    setOtpSent(true);
    setOtpNotice({
      type: 'info',
      message: `Simulation: OTP sent to ${currentNurse.phone}. Please enter demo code 7569.`
    });
  };

  const handleVerifyOtp = () => {
    if (otpCode === '7569' || otpCode === '1234') {
      setOtpVerified(true);
      onUpdateNurse({
        ...currentNurse,
        certificateVerified: true,
        pointsEarned: currentNurse.pointsEarned + 300
      });
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setOtpNotice({
        type: 'success',
        message: 'Verification successful! 300 Welcome Points added to your account.'
      });
    } else {
      setOtpNotice({
        type: 'error',
        message: 'Invalid OTP code. Please enter 7569 for simulation.'
      });
    }
  };

  return (
    <div className="panel-container container">
      {/* Logged In Nurse Status Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--neutral-600)' }}>
          <span>Nurse Staff Portal</span>
          <span>•</span>
          <span style={{ fontWeight: 700, color: 'var(--primary-navy-900)' }}>{currentNurse.name}</span>
          <span style={{ background: '#F1F5F9', padding: '0.2rem 0.55rem', borderRadius: 9999, fontSize: '0.74rem', fontWeight: 600, color: 'var(--neutral-600)' }}>
            Station: {currentNurse.serviceArea}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--success-green)', background: '#ECFDF5', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-full)', border: '1px solid #A7F3D0' }}>
          <Database size={13} />
          <span>Supabase Real-Time Connected</span>
        </div>
      </div>

      {/* Header */}
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <img
            src={currentNurse.avatarUrl}
            alt={currentNurse.name}
            style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-navy-700)' }}
          />
          <div>
            <h2 style={{ fontSize: '1.35rem', color: 'var(--primary-navy-900)' }}>
              {currentNurse.name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--neutral-600)', flexWrap: 'wrap' }}>
              <span>Stationed Base: <strong>{currentNurse.serviceArea}</strong></span>
              <span>•</span>
              <span>Exp: {currentNurse.experienceYears} Years</span>
              <span>•</span>
              {otpVerified ? (
                <span className="status-pill success"><ShieldCheck size={12} /> Verified RN</span>
              ) : (
                <span className="status-pill warning"><AlertCircle size={12} /> Pending Verification</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('new-lead')}
          className="btn btn-primary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <UserPlus size={15} />
          <span>Refer Patient Lead</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="panel-tabs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`panel-tab ${activeTab === 'overview' ? 'active' : ''}`}
        >
          Overview & Rewards
        </button>
        <button
          onClick={() => setActiveTab('visits')}
          className={`panel-tab ${activeTab === 'visits' ? 'active' : ''}`}
        >
          Assigned Visits ({assignedVisits.length})
        </button>
        <button
          onClick={() => setActiveTab('referrals')}
          className={`panel-tab ${activeTab === 'referrals' ? 'active' : ''}`}
        >
          <span>My Referrals & Earnings ({myLeads.length > 0 ? myLeads.length : myReferrals.length})</span>
          {pendingLeads.length > 0 && (
            <span style={{
              marginLeft: '0.35rem',
              background: '#F59E0B',
              color: '#FFFFFF',
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '0.15rem 0.45rem',
              borderRadius: 9999
            }}>
              {pendingLeads.length} Pending
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('new-lead')}
          className={`panel-tab ${activeTab === 'new-lead' ? 'active' : ''}`}
        >
          + Submit New Lead
        </button>
        <button
          onClick={() => setActiveTab('onboarding')}
          className={`panel-tab ${activeTab === 'onboarding' ? 'active' : ''}`}
        >
          Certificate & OTP
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div>
          {/* Pending Approval Notice if any */}
          {pendingLeads.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
              border: '1px solid #FCD34D',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1.15rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span style={{ fontSize: '1.35rem' }}>⏳</span>
                <div>
                  <div style={{ fontWeight: 800, color: '#92400E', fontSize: '0.9rem' }}>
                    {pendingLeads.length} Referral Lead{pendingLeads.length > 1 ? 's' : ''} Awaiting Admin Decision & Approval
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#B45309' }}>
                    Your submitted leads are being reviewed. Reward points and referral commission earnings will be credited once approved by Admin.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('referrals')}
                className="btn btn-sm"
                style={{
                  background: '#D97706',
                  color: '#FFFFFF',
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.85rem'
                }}
              >
                View Referrals Ledger
              </button>
            </div>
          )}

          {/* Key Metric Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#EEF5FF', color: 'var(--primary-navy-700)' }}>
                <Users size={24} />
              </div>
              <div>
                <div className="stat-val">{currentNurse.totalLeads}</div>
                <div className="stat-label">Total Leads Referred</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div className="stat-val">{currentNurse.convertedLeads}</div>
                <div className="stat-label">Successful Conversions</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
                <Coins size={24} />
              </div>
              <div>
                <div className="stat-val">{currentNurse.pointsEarned}</div>
                <div className="stat-label">Total Points Earned</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#FFF1F2', color: '#E11D48' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <div className="stat-val">₹{currentNurse.referralEarningsRupees}</div>
                <div className="stat-label">10% Referral Earnings</div>
              </div>
            </div>
          </div>

          {/* Points & Referral Benefits Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Xpress Nurse Points & Rewards Ledger</h3>
              <span className="status-pill success">Live Rewards Program</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>Initial Onboarding Reward</div>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--primary-navy-800)' }}>300 Points</strong>
                  <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginTop: '0.25rem' }}>
                    Awarded upon certificate upload & OTP verification
                  </p>
                </div>

                <div style={{ padding: '1rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>Milestone Bonus</div>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--primary-navy-800)' }}>50 Points</strong>
                  <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginTop: '0.25rem' }}>
                    Awarded for every successful referred lead
                  </p>
                </div>

                <div style={{ padding: '1rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>Lead Conversion Cash</div>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--primary-navy-800)' }}>Up to ₹300</strong>
                  <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginTop: '0.25rem' }}>
                    Additional incentive upon procedure completion
                  </p>
                </div>

                <div style={{ padding: '1rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>10% Referral Share</div>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--accent-red-600)' }}>10% of Order Fee</strong>
                  <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginTop: '0.25rem' }}>
                    10% credited on every cross-area or referred booking
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Visits Schedule Quick View */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">My Assigned Visits Schedule ({currentNurse.serviceArea} Base)</h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--neutral-500)' }}>
                  Patient procedures you are dispatched to execute at home
                </span>
              </div>
              <button onClick={() => setActiveTab('visits')} className="btn btn-outline btn-sm">
                View All ({assignedVisits.length})
              </button>
            </div>
            {assignedVisits.length === 0 ? (
              <EmptyState
                compact
                title="No Assigned Visits Yet"
                description={`You have no patient visits assigned in ${currentNurse.serviceArea} right now.`}
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Patient</th>
                      <th>Procedure</th>
                      <th>Area & Address</th>
                      <th>Dispatch Source</th>
                      <th>Fee</th>
                      <th>Status</th>
                      <th>Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedVisits.slice(0, 5).map((booking) => {
                      const isReferredFromColleague = booking.referringNurseId && booking.referringNurseId !== currentNurse.id;
                      return (
                        <tr key={booking.id} style={{ background: isReferredFromColleague ? '#FFFBEB' : undefined }}>
                          <td><strong>{booking.id}</strong></td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{booking.patientName}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>{booking.patientPhone}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{booking.serviceTitle}</div>
                            {booking.prescriptionFileName ? (
                              <a
                                href={booking.prescriptionUrl || `https://pub-830eaa9d07034c8d985d7d00577f77e9.r2.dev/prescriptions/${booking.prescriptionFileName}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  fontSize: '0.72rem',
                                  color: '#0284C7',
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  marginTop: '0.2rem'
                                }}
                                title="Inspect Verified Doctor Prescription"
                              >
                                <FileText size={11} />
                                <span>Rx: {booking.prescriptionFileName.length > 12 ? booking.prescriptionFileName.slice(0, 10) + '...' : booking.prescriptionFileName}</span>
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>✓ Verified Rx</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <MapPin size={14} style={{ color: 'var(--neutral-500)' }} />
                              <span>{booking.area}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>{booking.fullAddress}</div>
                          </td>
                          <td>
                            {isReferredFromColleague ? (
                              <span className="status-pill warning" title={booking.notes}>
                                ⚡ Cross-Area Referral: {booking.referringNurseName || 'Colleague RN'}
                              </span>
                            ) : booking.referringNurseId === currentNurse.id ? (
                              <span className="status-pill info">Your Personal Lead</span>
                            ) : (
                              <span className="status-pill success">Station Match: {booking.area}</span>
                            )}
                          </td>
                          <td><strong>₹{booking.estimatedFee}</strong></td>
                          <td>
                            <span className="status-pill success">{booking.status}</span>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleOpenBookingInvoice(booking)}
                              className="btn btn-outline btn-sm"
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.25rem 0.5rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                color: '#0284C7',
                                borderColor: '#BAE6FD',
                                background: '#F0F9FF',
                                borderRadius: 6
                              }}
                              title="Generate Official GST Invoice"
                            >
                              <Receipt size={12} />
                              <span>Invoice</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ASSIGNED VISITS TAB */}
      {activeTab === 'visits' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Patient Visits Dispatched to You ({currentNurse.serviceArea})</h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--neutral-500)' }}>
                Direct location-matched and colleague-referred orders assigned for home execution
              </span>
            </div>
            <span className="status-pill success">Total: {assignedVisits.length} Visits</span>
          </div>

          {assignedVisits.length === 0 ? (
            <EmptyState
              title="No Patient Visits Stationed"
              description={`There are currently no home visits assigned to you in ${currentNurse.serviceArea}.`}
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Patient Name & Phone</th>
                    <th>Clinical Procedure</th>
                    <th>Locality & Address</th>
                    <th>Dispatch Origin</th>
                    <th>Fee</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedVisits.map((booking) => {
                    const isReferredFromColleague = booking.referringNurseId && booking.referringNurseId !== currentNurse.id;
                    return (
                      <tr key={booking.id} style={{ background: isReferredFromColleague ? '#FFFBEB' : undefined }}>
                        <td><strong>{booking.id}</strong></td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{booking.patientName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>{booking.patientPhone}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{booking.serviceTitle}</div>
                          {booking.prescriptionFileName ? (
                            <a
                              href={booking.prescriptionUrl || `https://pub-830eaa9d07034c8d985d7d00577f77e9.r2.dev/prescriptions/${booking.prescriptionFileName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                fontSize: '0.72rem',
                                color: '#0284C7',
                                fontWeight: 700,
                                textDecoration: 'none',
                                marginTop: '0.2rem'
                              }}
                              title="Inspect Verified Doctor Prescription"
                            >
                              <FileText size={11} />
                              <span>Rx: {booking.prescriptionFileName.length > 14 ? booking.prescriptionFileName.slice(0, 12) + '...' : booking.prescriptionFileName}</span>
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>✓ Verified Rx</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                            <MapPin size={14} style={{ color: 'var(--neutral-500)' }} />
                            <span>{booking.area}</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)' }}>{booking.fullAddress}</div>
                        </td>
                        <td>
                          {isReferredFromColleague ? (
                            <div>
                              <span className="status-pill warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                ⚡ Referred by {booking.referringNurseName || 'Colleague'}
                              </span>
                              <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', marginTop: '0.2rem' }}>
                                Dispatched to you in {booking.area}
                              </div>
                            </div>
                          ) : (
                            <span className="status-pill success">Direct Station Match</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--primary-navy-900)' }}>₹{booking.estimatedFee}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>Transport Included</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenBookingInvoice(booking)}
                              className="btn btn-outline btn-sm"
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.3rem 0.55rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                color: '#0284C7',
                                borderColor: '#BAE6FD',
                                background: '#F0F9FF',
                                fontWeight: 700
                              }}
                              title="Generate Official GST Tax Invoice"
                            >
                              <Receipt size={13} />
                              <span>Invoice</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReassignModalBooking(booking);
                                setTargetReassignNurseId(allNurses.find((n) => n.id !== currentNurse.id)?.id || 'nurse-102');
                              }}
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '0.75rem', padding: '0.3rem 0.55rem' }}
                              title="Transfer this order to another colleague nurse"
                            >
                              <RefreshCw size={12} />
                              <span>Transfer</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MY REFERRALS & 10% EARNINGS TAB */}
      {activeTab === 'referrals' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 className="card-title">My Patient Referrals & Rewards Ledger</h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--neutral-500)' }}>
                Track patients you referred across Hyderabad, Admin approval status, and your credited points & commission
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="status-pill success">
                Approved Referral Earnings: ₹{currentNurse.referralEarningsRupees}
              </span>
              <span className="status-pill info">
                Approved Points: {currentNurse.pointsEarned} pts
              </span>
              {pendingLeads.length > 0 && (
                <span className="status-pill warning" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
                  ⏳ {pendingLeads.length} Awaiting Admin Decision
                </span>
              )}
            </div>
          </div>

          {myLeads.length === 0 && myReferrals.length === 0 ? (
            <EmptyState
              title="No Patient Referrals Yet"
              description="You have not referred any patient leads yet. Submit a lead for any Hyderabad locality! Once approved by Admin, points and cash commission will be credited directly to your account."
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lead ID & Date</th>
                    <th>Patient Name & Area</th>
                    <th>Procedure & Fee</th>
                    <th>Executing Nurse (Station)</th>
                    <th>Reward Points</th>
                    <th>Referral Earning</th>
                    <th>Admin Approval Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(myLeads.length > 0 ? myLeads : myReferrals.map((b): NurseLead => ({
                    id: b.id,
                    submittedAt: b.createdAt,
                    patientName: b.patientName,
                    patientPhone: b.patientPhone,
                    serviceId: b.serviceId,
                    area: b.area,
                    leadValueRupees: b.estimatedFee,
                    assignedNurseId: b.assignedNurseId,
                    pointsAwarded: 50,
                    referralCommissionRupees: b.referralBonusRupees || Math.round((b.estimatedFee || 800) * 0.1),
                    status: 'Approved',
                    nurseId: currentNurse.id,
                    adminNotes: undefined
                  }))).map((leadItem) => {
                    const isPending = leadItem.status === 'Pending Approval';
                    const isApproved = leadItem.status === 'Approved' || leadItem.status === 'Converted';
                    const isRejected = leadItem.status === 'Rejected';
                    const executingNurse = allNurses.find((n) => n.id === leadItem.assignedNurseId);
                    const isSelf = leadItem.assignedNurseId === currentNurse.id;

                    return (
                      <tr 
                        key={leadItem.id}
                        style={{
                          background: isPending ? '#FFFDF5' : undefined,
                          borderLeft: isPending ? '4px solid #F59E0B' : undefined
                        }}
                      >
                        <td>
                          <strong style={{ fontFamily: 'monospace' }}>{leadItem.id}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>
                            {leadItem.submittedAt && leadItem.submittedAt.includes('T') ? new Date(leadItem.submittedAt).toLocaleDateString() : leadItem.submittedAt || 'Recent'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{leadItem.patientName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <MapPin size={11} />
                            <span>{leadItem.area}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{leadItem.serviceId}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Fee: ₹{leadItem.leadValueRupees || 800}</div>
                        </td>
                        <td>
                          {isSelf ? (
                            <span style={{ fontWeight: 600 }}>Self ({currentNurse.serviceArea})</span>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--primary-navy-800)' }}>
                                {executingNurse?.name || 'Stationed RN'}
                              </div>
                              <span style={{ fontSize: '0.72rem', color: '#059669' }}>
                                ✓ {executingNurse?.serviceArea || leadItem.area} Station
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          {isPending ? (
                            <span style={{
                              background: '#FEF3C7',
                              color: '#92400E',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.5rem',
                              borderRadius: 6
                            }}>
                              ⏳ Pending Decision
                            </span>
                          ) : isRejected ? (
                            <span style={{ color: 'var(--neutral-400)', fontSize: '0.8rem' }}>0 pts</span>
                          ) : (
                            <strong style={{ color: '#059669', fontSize: '0.9rem' }}>
                              +{leadItem.pointsAwarded || 50} pts
                            </strong>
                          )}
                        </td>
                        <td>
                          {isPending ? (
                            <span style={{
                              background: '#FEF3C7',
                              color: '#92400E',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.5rem',
                              borderRadius: 6
                            }}>
                              ⏳ Est. ₹{leadItem.referralCommissionRupees || Math.round((leadItem.leadValueRupees || 800) * 0.1)}
                            </span>
                          ) : isRejected ? (
                            <span style={{ color: 'var(--neutral-400)', fontSize: '0.8rem' }}>₹0</span>
                          ) : (
                            <strong style={{ color: '#059669', fontSize: '0.95rem' }}>
                              +₹{leadItem.referralCommissionRupees !== undefined ? leadItem.referralCommissionRupees : Math.round((leadItem.leadValueRupees || 800) * 0.1)}
                            </strong>
                          )}
                        </td>
                        <td>
                          <span className={`status-pill ${
                            isApproved ? 'success' :
                            isPending ? 'warning' :
                            isRejected ? 'danger' : 'neutral'
                          }`}>
                            {isPending ? '⏳ Awaiting Admin Approval' : isApproved ? '✓ Approved & Credited' : isRejected ? '✕ Rejected' : leadItem.status}
                          </span>
                          {leadItem.adminNotes && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                              Admin Note: "{leadItem.adminNotes}"
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* NEW LEAD TAB */}
      {activeTab === 'new-lead' && (
        <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Submit New Patient Referral</h3>
              <span style={{ fontSize: '0.82rem', color: 'var(--neutral-500)' }}>
                Refer any patient across Hyderabad. The nearest stationed nurse receives the order, and you earn 50 points + 10% commission!
              </span>
            </div>
          </div>
          <div className="card-body">
            {leadSuccessMsg && (
              <div style={{ padding: '1rem', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 'var(--radius-md)', color: '#065F46', marginBottom: '1.25rem' }}>
                ✓ {leadSuccessMsg}
              </div>
            )}
            {leadErrorMsg && (
              <div style={{ padding: '0.85rem 1rem', background: 'var(--accent-red-50)', border: '1px solid #FECDD3', borderRadius: 'var(--radius-md)', color: '#9F1239', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                <AlertCircle size={16} />
                <span>{leadErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLeadSubmit}>
              <div className="form-group">
                <label className="form-label">Patient Full Name & Age *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Smt. Lakshmi Devi (74 yrs)"
                  value={patientName}
                  onChange={(e) => {
                    setPatientName(e.target.value);
                    if (leadErrorMsg) setLeadErrorMsg('');
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Patient Phone Number *</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="e.g. 97654 32109"
                  value={patientPhone}
                  onChange={(e) => {
                    setPatientPhone(e.target.value);
                    if (leadErrorMsg) setLeadErrorMsg('');
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Clinical Procedure Required (As per official PDF charges)</label>
                <select
                  className="form-control"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value as ServiceId)}
                >
                  {serviceList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} — {s.indicativePrice}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Patient Location / Hyderabad Area *</label>
                <select
                  className="form-control"
                  value={area}
                  onChange={(e) => setArea(e.target.value as HyderabadArea)}
                >
                  <option value="LB Nagar">LB Nagar (Stationed Nurse: Nurse Rajesh Kumar)</option>
                  <option value="Gachibowli">Gachibowli (Stationed Nurse: Nurse Priya Sharma)</option>
                  <option value="Madhapur">Madhapur (Stationed Nurse: Nurse Anjali Rao)</option>
                  <option value="Banjara Hills">Banjara Hills (Stationed Nurse: Nurse Sunita Reddy)</option>
                  <option value="Jubilee Hills">Jubilee Hills</option>
                  <option value="Kukatpally">Kukatpally</option>
                  <option value="Secunderabad">Secunderabad</option>
                </select>
              </div>

              {/* Dynamic Dispatch & Benefit Callout */}
              <div style={{ padding: '1rem', background: isCrossAreaReferral ? '#FEF3C7' : '#EFF6FF', border: `1px solid ${isCrossAreaReferral ? '#FDE68A' : '#BFDBFE'}`, borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary-navy-950)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Send size={15} style={{ color: isCrossAreaReferral ? '#D97706' : '#2563EB' }} />
                  <span>
                    {isCrossAreaReferral
                      ? `Cross-Area Dispatch: Order will be assigned to ${previewExecutingNurse.name} (${area})`
                      : `Local Area Match: Order will be assigned to your own schedule (${currentNurse.serviceArea})`}
                  </span>
                </div>
                <div style={{ color: 'var(--neutral-700)', lineHeight: 1.5 }}>
                  Procedure Fee: <strong>₹{previewFee}</strong> • Standard Referral Share: <strong style={{ color: '#E11D48' }}>~₹{previewReferralBonus} (10%)</strong> • Milestone Reward: <strong>~50 Points</strong>
                  <div style={{ fontSize: '0.78rem', color: '#B45309', marginTop: '0.25rem', fontWeight: 600 }}>
                    ⚖️ Admin Review: Points and referral payout are reviewed and approved directly by Admin before crediting to your account.
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}>
                <UserPlus size={18} />
                <span>Submit Lead & Dispatch Order</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ONBOARDING & CERTIFICATE TAB */}
      {activeTab === 'onboarding' && (
        <div className="card" style={{ maxWidth: 680, margin: '0 auto' }}>
          <div className="card-header">
            <h3 className="card-title">Nurse Registration & Credential Verification</h3>
            <span className="status-pill success">300 Points Reward</span>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '0.9rem', color: 'var(--neutral-600)', marginBottom: '1.5rem' }}>
              Xpress Nurse strictly verifies nursing certificates (B.Sc / GNM) and OTP to ensure hospital asepsis and patient safety standards across Hyderabad.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Nursing Degree / Council Registration Certificate</label>
              <div style={{ border: '2px dashed var(--neutral-300)', padding: '2rem', borderRadius: 'var(--radius-md)', textAlign: 'center', background: 'var(--neutral-50)' }}>
                <FileCheck size={36} style={{ color: 'var(--primary-navy-700)', margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 600 }}>{currentNurse.qualification} Verified</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>
                  Certificate: RN_Telangana_Council_{currentNurse.id.toUpperCase()}.pdf
                </div>
              </div>
            </div>

            {/* OTP Verification Section */}
            <div style={{ padding: '1.25rem', background: '#F8FAFC', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={18} style={{ color: '#10B981' }} />
                <span>Mobile P.O.T.P. / OTP Authentication</span>
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginBottom: '1rem' }}>
                Verify your registered mobile number ({currentNurse.phone}) to unlock full visit dispatch access and 300 Welcome Points.
              </p>

              {otpNotice && (
                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem', background: otpNotice.type === 'success' ? '#ECFDF5' : otpNotice.type === 'error' ? '#FFF1F2' : '#EFF6FF', color: otpNotice.type === 'success' ? '#065F46' : otpNotice.type === 'error' ? '#9F1239' : '#1E40AF' }}>
                  {otpNotice.message}
                </div>
              )}

              {otpVerified ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10B981', fontWeight: 600 }}>
                  <CheckCircle2 size={18} />
                  <span>Authenticated & 300 Welcome Points Credited to Rewards Ledger</span>
                </div>
              ) : (
                <div>
                  {!otpSent ? (
                    <button onClick={handleSendOtp} className="btn btn-outline btn-sm">
                      <Phone size={14} />
                      <span>Send OTP to {currentNurse.phone}</span>
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', maxWidth: 320 }}>
                      <input
                        type="text"
                        placeholder="Enter OTP (7569)"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        className="form-control"
                      />
                      <button onClick={handleVerifyOtp} className="btn btn-primary btn-sm">
                        Verify
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer / Reassign Modal */}
      {reassignModalBooking && (
        <div className="modal-backdrop" onClick={() => setReassignModalBooking(null)}>
          <div className="modal-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Transfer Order to Colleague Nurse</h3>
            </div>
            <div className="modal-body" style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.88rem', color: 'var(--neutral-600)', marginBottom: '1rem' }}>
                Transfer booking <strong>{reassignModalBooking.id}</strong> ({reassignModalBooking.serviceTitle} in {reassignModalBooking.area}) to a colleague nurse stationed nearby:
              </p>

              <div className="form-group">
                <label className="form-label">Select Colleague Nurse</label>
                <select
                  className="form-control"
                  value={targetReassignNurseId}
                  onChange={(e) => setTargetReassignNurseId(e.target.value)}
                >
                  {allNurses.filter((n) => n.id !== currentNurse.id).map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} (Station: {n.serviceArea})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setReassignModalBooking(null)}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReassign}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  Confirm Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NURSE TAX INVOICE PREVIEW MODAL */}
      {isInvoiceModalOpen && previewInvoice && (
        <div 
          className="modal-overlay" 
          onClick={() => setIsInvoiceModalOpen(false)}
          style={{ zIndex: 999999, pointerEvents: 'auto' }}
        >
          <div 
            className="modal-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: 720, borderRadius: 20, pointerEvents: 'auto', maxHeight: '92vh', overflowY: 'auto' }}
          >
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: '#FAFAFA', borderBottom: '1px solid var(--neutral-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFFBEB', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                    Tax Invoice {previewInvoice.invoiceNumber}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--neutral-500)' }}>
                    Attending Nurse: {currentNurse.name} ({currentNurse.qualification}) • Station: {currentNurse.serviceArea}
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsInvoiceModalOpen(false)} 
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                title="Close Modal"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {/* Header Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: '#F8FAFC', padding: '1rem', borderRadius: 12, border: '1px solid #E2E8F0', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Billed To Patient</div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A', marginTop: 2 }}>{previewInvoice.patientName}</div>
                  <div style={{ fontSize: '0.8rem', color: '#334155' }}>{previewInvoice.patientPhone}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 4 }}>{previewInvoice.fullAddress}, {previewInvoice.area}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>Service & Invoice Details</div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', marginTop: 2 }}>{previewInvoice.serviceTitle}</div>
                  <div style={{ fontSize: '0.8rem', color: '#334155' }}>Booking ID: {previewInvoice.bookingId}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 4 }}>Date: {previewInvoice.invoiceDate}</div>
                </div>
              </div>

              {/* Line Items Table */}
              <table className="data-table" style={{ width: '100%', marginBottom: '1.25rem' }}>
                <thead>
                  <tr>
                    <th>Procedure Description</th>
                    <th>SAC Code</th>
                    <th style={{ textAlign: 'right' }}>Taxable</th>
                    <th style={{ textAlign: 'right' }}>GST (18%)</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>{previewInvoice.serviceTitle}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Doorstep clinical nursing visit with aseptic consumables</div>
                    </td>
                    <td>999312</td>
                    <td style={{ textAlign: 'right' }}>₹{previewInvoice.taxableAmount}</td>
                    <td style={{ textAlign: 'right' }}>₹{previewInvoice.cgst + previewInvoice.sgst}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{previewInvoice.totalAmount}</td>
                  </tr>
                </tbody>
              </table>

              {/* Total Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <div style={{ width: 280, background: '#F8FAFC', padding: '1rem', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                    <span>Taxable Value:</span>
                    <span>₹{previewInvoice.taxableAmount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                    <span>CGST (9%):</span>
                    <span>₹{previewInvoice.cgst}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 8 }}>
                    <span>SGST (9%):</span>
                    <span>₹{previewInvoice.sgst}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', color: '#0F172A', borderTop: '1px solid #CBD5E1', paddingTop: 8 }}>
                    <span>Total Payable:</span>
                    <span style={{ color: '#059669' }}>₹{previewInvoice.totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="btn btn-outline btn-sm"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => openPrintableInvoiceWindow(previewInvoice)}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
                >
                  <Printer size={15} />
                  <span>Print / Save Tax Invoice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
