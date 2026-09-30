import React, { useState } from 'react';
import { 
  NurseProfile, 
  NurseLead, 
  Booking, 
  ServiceItem, 
  InvoiceDetails 
} from '../types';
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
  RefreshCw,
  FileText,
  Receipt,
  X,
  CreditCard,
  Check,
  HelpCircle,
  UploadCloud
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EmptyState } from './EmptyState';
import { 
  generateInvoiceDetails, 
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
  // Bind directly to currentNurse (the logged in nurse)
  const nurse: NurseProfile = (currentNurse as NurseProfile) || (allNurses && allNurses.length > 0 ? (allNurses[0] as NurseProfile) : null) || {
    id: 'nurse-101',
    name: 'Nurse Priya Sharma',
    phone: '9849012345',
    email: 'priya.nursing@xpressnurse.in',
    experienceYears: 5,
    qualification: 'B.Sc Nursing (Registered RN)',
    serviceArea: 'Hyderabad Central',
    status: 'Active',
    totalLeads: 0,
    convertedLeads: 0,
    totalReferrals: 0,
    pointsEarned: 0,
    referralEarningsRupees: 0,
    rating: 4.9,
    certificateVerified: true
  };

  const isVerifiedNurse = Boolean(nurse.certificateVerified);

  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'referrals' | 'onboarding'>('overview');

  // Nurse-Refer-Nurse Form States
  const [refNurseName, setRefNurseName] = useState('');
  const [refNursePhone, setRefNursePhone] = useState('');
  const [refNurseQual, setRefNurseQual] = useState('B.Sc Nursing');
  const [refNurseExp, setRefNurseExp] = useState('3');
  const [refNurseArea, setRefNurseArea] = useState('');
  const [refSuccessMsg, setRefSuccessMsg] = useState('');
  const [refErrorMsg, setRefErrorMsg] = useState('');

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

  // Bookings assigned to THIS nurse to execute
  const assignedVisits = bookings.filter((b) => b.assignedNurseId === nurse.id);
  const completedVisits = assignedVisits.filter((b) => b.status === 'Completed');

  // Nurse referrals submitted by THIS nurse
  const myNurseReferrals = leads.filter((l) => l.nurseId === nurse.id);

  // Nurse Payment & Payout Calculations
  // Each visit yields a fixed nurse visit earning (approx 65-70% of procedure fee)
  const visitEarnings = assignedVisits.map((b) => {
    const fee = b.estimatedFee || 800;
    const baseShare = Math.round(fee * 0.7);
    const nightShare = b.nightSurcharge ? Math.round(b.nightSurcharge * 0.6) : 0;
    const totalVisitPay = baseShare + nightShare;
    const isCompleted = b.status === 'Completed';
    return {
      id: `PAY-VST-${b.id}`,
      bookingId: b.id,
      date: b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
      description: `Home Visit Fee: ${b.serviceTitle} for ${b.patientName}`,
      calculation: `Base Care: ₹${baseShare}${nightShare > 0 ? ` + Night Shift: ₹${nightShare}` : ''}`,
      amount: totalVisitPay,
      status: isCompleted ? ('Paid' as const) : ('Pending' as const),
      rejectionReason: b.rejectionReason || undefined,
      payoutNote: isCompleted 
        ? `Paid via UPI directly to linked bank account (Txn: UPI-${b.id.replace(/\D/g, '') || '94021'})`
        : 'Pending procedure completion and weekly Tuesday disbursement cycle.'
    };
  });

  // Approved nurse referrals yield ₹500 each
  const referralEarnings = myNurseReferrals.map((ref) => {
    const isApproved = ref.status === 'Approved' || ref.status === 'Converted';
    const isRejected = ref.status === 'Rejected';
    return {
      id: `PAY-REF-${ref.id}`,
      bookingId: ref.id,
      date: ref.submittedAt ? new Date(ref.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
      description: `Colleague Nurse Referral Bonus: ${ref.referredNurseName || ref.patientName || 'Nurse Colleague'}`,
      calculation: 'Flat Onboarding Reward upon Clinical Certificate Approval',
      amount: 500,
      status: isApproved ? ('Paid' as const) : ('Pending' as const),
      rejectionReason: isRejected ? (ref.rejectionReason || 'Certificate invalid or duplicate application') : undefined,
      payoutNote: isApproved
        ? 'Credited to UPI upon nurse certificate approval'
        : isRejected
        ? `Rejected: ${ref.rejectionReason || 'Documentation unverified'}`
        : 'Awaiting Admin certificate verification for referred nurse colleague.'
    };
  });

  const allPaymentItems = [...visitEarnings, ...referralEarnings];
  const paidEarningsTotal = allPaymentItems.filter(p => p.status === 'Paid').reduce((sum, item) => sum + item.amount, 0);
  const pendingEarningsTotal = allPaymentItems.filter(p => p.status === 'Pending').reduce((sum, item) => sum + item.amount, 0);
  const totalEarningsAccrued = paidEarningsTotal + pendingEarningsTotal;

  // Handle Nurse-Refer-Nurse Submission
  const handleNurseReferralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRefErrorMsg('');
    setRefSuccessMsg('');

    if (!refNurseName.trim()) {
      setRefErrorMsg('Please enter your colleague nurse full name.');
      return;
    }
    const cleanPhone = refNursePhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setRefErrorMsg('Please enter a valid 10-digit mobile number for the nurse.');
      return;
    }

    const newLead: NurseLead = {
      id: `REF-NUR-${Math.floor(1000 + Math.random() * 9000)}`,
      nurseId: nurse.id,
      referredNurseName: refNurseName.trim(),
      referredNursePhone: refNursePhone.trim(),
      patientName: `Nurse ${refNurseName.trim()}`,
      patientPhone: refNursePhone.trim(),
      qualification: refNurseQual,
      experienceYears: parseInt(refNurseExp) || 3,
      area: refNurseArea.trim() || 'Hyderabad',
      submittedAt: new Date().toISOString(),
      status: 'Pending Approval',
      leadValueRupees: 500,
      referralCommissionRupees: 500
    };

    onAddNewLead(newLead);
    setRefSuccessMsg(`Nurse ${refNurseName.trim()} has been referred successfully! Our clinical admin will verify their credentials, and ₹500 referral reward will be credited to your account.`);
    setRefNurseName('');
    setRefNursePhone('');
    setRefNurseArea('');

    try {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    } catch {}
  };

  return (
    <div className="panel-container container" style={{ paddingBottom: '4rem' }}>
      
      {/* Top Profile Header Bar */}
      <div className="panel-header" style={{ marginBottom: '1.5rem', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: 58, 
              height: 58, 
              borderRadius: '50%', 
              background: '#0284C7', 
              color: '#FFFFFF', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              flexShrink: 0
            }}>
              {nurse.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('')}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                  {nurse.name}
                </h1>
                {isVerifiedNurse ? (
                  <span className="status-pill success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '3px 9px' }}>
                    <ShieldCheck size={12} />
                    <span>Verified Registered RN</span>
                  </span>
                ) : (
                  <span className="status-pill warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '3px 9px' }}>
                    <AlertCircle size={12} />
                    <span>Referral-Only Mode (No Certificate)</span>
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.82rem', color: '#64748B', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                <span>ID: <strong style={{ color: '#0F172A' }}>{nurse.id}</strong></span>
                <span>•</span>
                <span>Qualification: <strong style={{ color: '#0F172A' }}>{nurse.qualification}</strong></span>
                <span>•</span>
                <span>Experience: <strong style={{ color: '#0F172A' }}>{nurse.experienceYears} Yrs</strong></span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Phone size={12} />
                  <span>{nurse.phone}</span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('referrals')}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: 10, fontWeight: 700 }}
          >
            <UserPlus size={15} />
            <span>Refer a Fellow Nurse (+₹500)</span>
          </button>
        </div>
      </div>

      {/* Verification Status Banner if Unverified */}
      {!isVerifiedNurse && (
        <div style={{ 
          background: '#FFFBEB', 
          border: '1.5px solid #FCD34D', 
          borderRadius: 12, 
          padding: '1rem 1.25rem', 
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={22} style={{ color: '#D97706', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, color: '#92400E', fontSize: '0.92rem' }}>
                Referral-Only Mode Active (Nursing Certificate Pending Verification)
              </div>
              <div style={{ fontSize: '0.82rem', color: '#B45309', marginTop: '0.15rem' }}>
                You can currently refer fellow nurses to earn rewards. To be assigned direct patient visits for home procedures, please upload your Telangana / Indian Nursing Council certificate for Admin verification.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('onboarding')}
            className="btn btn-sm"
            style={{ background: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '0.4rem 0.85rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Upload Certificate
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="panel-tabs" style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`panel-tab ${activeTab === 'overview' ? 'active' : ''}`}
        >
          <span>Overview & Payout Details</span>
        </button>
        <button
          onClick={() => setActiveTab('visits')}
          className={`panel-tab ${activeTab === 'visits' ? 'active' : ''}`}
        >
          <span>Assigned Visits ({assignedVisits.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('referrals')}
          className={`panel-tab ${activeTab === 'referrals' ? 'active' : ''}`}
        >
          <span>Refer Fellow Nurses ({myNurseReferrals.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('onboarding')}
          className={`panel-tab ${activeTab === 'onboarding' ? 'active' : ''}`}
        >
          <span>Certificate & Documents</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. OVERVIEW & PAYOUT DETAILS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div>
          {/* Key Metric Stats Cards */}
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#EFF6FF', color: '#0284C7' }}>
                <Calendar size={22} />
              </div>
              <div>
                <div className="stat-val">{assignedVisits.length}</div>
                <div className="stat-label">Assigned Home Visits</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                <CreditCard size={22} />
              </div>
              <div>
                <div className="stat-val" style={{ color: '#16A34A' }}>₹{paidEarningsTotal}</div>
                <div className="stat-label">Total Paid Out (UPI)</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
                <Clock size={22} />
              </div>
              <div>
                <div className="stat-val" style={{ color: '#D97706' }}>₹{pendingEarningsTotal}</div>
                <div className="stat-label">Pending Next Payout</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#FAF5FF', color: '#9333EA' }}>
                <Users size={22} />
              </div>
              <div>
                <div className="stat-val">{myNurseReferrals.length}</div>
                <div className="stat-label">Colleague Nurses Referred</div>
              </div>
            </div>
          </div>

          {/* Transparent Payment & Payout Breakdown ("Why Everything") */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: '0 0 0.25rem 0' }}>
                  Nurse Earnings & Payout Breakdown
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                  Transparent record showing what has been paid, what is pending, and why each rupee was calculated.
                </p>
              </div>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#F1F5F9', padding: '0.35rem 0.85rem', borderRadius: 9999, fontSize: '0.76rem', fontWeight: 700, color: '#334155' }}>
                <Clock size={13} />
                <span>Weekly Payout Cycle: Every Tuesday directly to UPI</span>
              </div>
            </div>

            {allPaymentItems.length === 0 ? (
              <EmptyState
                compact
                title="No Payout History Yet"
                description="Once you complete assigned home visits or refer fellow nurses, your transparent earnings breakdown will appear here."
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Reference ID</th>
                      <th>Service & Payout Description ("Why")</th>
                      <th>Calculation Breakdown</th>
                      <th>Amount</th>
                      <th>Payout Status & Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPaymentItems.map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontSize: '0.8rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                          {item.date}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem', color: '#0F172A' }}>
                            {item.bookingId}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--primary-navy-950)' }}>
                            {item.description}
                          </div>
                          {item.rejectionReason && (
                            <div style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600, marginTop: '0.2rem' }}>
                              Rejection Reason: {item.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                          {item.calculation}
                        </td>
                        <td>
                          <strong style={{ fontSize: '0.92rem', color: item.status === 'Paid' ? '#16A34A' : '#D97706' }}>
                            ₹{item.amount}
                          </strong>
                        </td>
                        <td>
                          {item.status === 'Paid' ? (
                            <div>
                              <span className="status-pill success" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                                ✓ Paid (UPI Processed)
                              </span>
                              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.2rem' }}>
                                {item.payoutNote}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="status-pill warning" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                                ⏳ Pending Payout
                              </span>
                              <div style={{ fontSize: '0.72rem', color: '#B45309', marginTop: '0.2rem' }}>
                                {item.payoutNote}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ASSIGNED VISITS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'visits' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: '0 0 0.25rem 0' }}>
                Your Assigned Home Patient Visits
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#64748B', margin: 0 }}>
                Patients waiting for clinical care. Use the direct Call button to reach the family immediately.
              </p>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0284C7', background: '#F0F9FF', padding: '0.35rem 0.85rem', borderRadius: 9999, border: '1px solid #BAE6FD' }}>
              Total Assigned: {assignedVisits.length}
            </div>
          </div>

          {assignedVisits.length === 0 ? (
            <EmptyState
              title="No Patient Visits Currently Dispatched"
              description={isVerifiedNurse ? "You are on active standby. When new emergency or scheduled orders arrive in your zone, they will appear here." : "Your account is in Referral-Only mode. Please upload your nursing certificate to unlock patient visit dispatch."}
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Timing / Type</th>
                    <th>Patient Name & Direct Call</th>
                    <th>Clinical Procedure</th>
                    <th>Address / Real Location</th>
                    <th>Fee</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedVisits.map((booking) => {
                    const isInstant = booking.bookingType === 'Instant' || booking.preferredTime?.toLowerCase().includes('immediate') || booking.preferredDate?.toLowerCase().includes('instant');
                    const isCancelledOrRejected = booking.status === 'Cancelled' || (booking as any).status === 'Rejected';

                    return (
                      <tr key={booking.id} style={{ background: isCancelledOrRejected ? '#FEF2F2' : undefined }}>
                        <td>
                          <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0F172A' }}>
                            {booking.id}
                          </span>
                        </td>

                        {/* Timing Badge */}
                        <td>
                          {isInstant ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              background: '#FEF3C7',
                              color: '#92400E',
                              border: '1px solid #FCD34D',
                              borderRadius: 9999,
                              padding: '2px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 800
                            }}>
                              ⚡ Instant (ASAP)
                            </span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                background: '#EFF6FF',
                                color: '#1D4ED8',
                                border: '1px solid #BFDBFE',
                                borderRadius: 9999,
                                padding: '2px 8px',
                                fontSize: '0.72rem',
                                fontWeight: 800
                              }}>
                                📅 Scheduled
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>
                                {booking.scheduledSlot || booking.preferredTime || '2-Hr Window'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Patient & DIRECT CALL BUTTON */}
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#0F172A', marginBottom: '0.35rem' }}>
                            {booking.patientName}
                          </div>
                          
                          {/* Direct Call Patient Button */}
                          <a
                            href={`tel:${booking.patientPhone}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              background: '#16A34A',
                              color: '#FFFFFF',
                              padding: '0.32rem 0.65rem',
                              borderRadius: 6,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                            }}
                            title={`Call patient directly: ${booking.patientPhone}`}
                          >
                            <Phone size={12} />
                            <span>Call {booking.patientPhone}</span>
                          </a>
                        </td>

                        {/* Procedure */}
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{booking.serviceTitle}</div>
                          {booking.prescriptionFileName ? (
                            <a
                              href={booking.prescriptionUrl || `https://pub-830eaa9d07034c8d985d7d00577f77e9.r2.dev/prescriptions/${booking.prescriptionFileName}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', color: '#0284C7', fontWeight: 700, textDecoration: 'none', marginTop: '0.2rem' }}
                            >
                              <FileText size={11} />
                              <span>View Mandatory Rx</span>
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 600 }}>✓ Verified Rx</span>
                          )}
                        </td>

                        {/* Address */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700, fontSize: '0.82rem', color: '#0F172A' }}>
                            <MapPin size={13} style={{ color: '#0284C7' }} />
                            <span>{booking.area || 'Hyderabad'}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', maxWidth: 220, wordBreak: 'break-word', marginTop: '0.15rem' }}>
                            {booking.fullAddress}
                          </div>
                        </td>

                        {/* Fee */}
                        <td>
                          <strong style={{ color: '#0F172A' }}>₹{booking.finalFee || booking.estimatedFee}</strong>
                        </td>

                        {/* Status with Rejection Reason */}
                        <td>
                          {isCancelledOrRejected ? (
                            <div>
                              <span className="status-pill error" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                                Cancelled / Rejected
                              </span>
                              {booking.rejectionReason && (
                                <div style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 600, marginTop: '0.25rem' }}>
                                  Reason: {booking.rejectionReason}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="status-pill success" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                              {booking.status}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
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
                              borderRadius: 6,
                              fontWeight: 700
                            }}
                            title="Generate Official Invoice"
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
      )}

      {/* ========================================================================= */}
      {/* 3. REFER FELLOW NURSES TAB (NURSE REFER NURSE ONLY) */}
      {/* ========================================================================= */}
      {activeTab === 'referrals' && (
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          
          {/* Header Info Banner */}
          <div style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)', border: '1px solid #BFDBFE', borderRadius: 14, padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <Users size={20} style={{ color: '#1D4ED8' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E3A8A', margin: 0 }}>
                Nurse Refer Nurse Program
              </h3>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#1E40AF', margin: 0, lineHeight: 1.5 }}>
              Refer fellow certified nurses (B.Sc, GNM, Critical Care RNs) across Hyderabad. When your colleague is verified and joins our care fleet, you earn <strong>₹500 cash referral bonus</strong> directly credited to your account!
            </p>
          </div>

          {/* Referral Submission Form */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: '0 0 1rem 0' }}>
              Refer a Colleague Nurse
            </h4>

            {refSuccessMsg && (
              <div style={{ padding: '0.85rem 1rem', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, color: '#065F46', marginBottom: '1.25rem', fontSize: '0.86rem' }}>
                ✓ {refSuccessMsg}
              </div>
            )}
            {refErrorMsg && (
              <div style={{ padding: '0.85rem 1rem', background: '#FEF2F2', border: '1px solid #FECDD3', borderRadius: 10, color: '#9F1239', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.86rem' }}>
                <AlertCircle size={16} />
                <span>{refErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleNurseReferralSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    Colleague Nurse Full Name *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Nurse Rajesh or Sunita"
                    value={refNurseName}
                    onChange={(e) => setRefNurseName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    Mobile Number (10 digits) *
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    className="form-control"
                    placeholder="10-digit phone"
                    value={refNursePhone}
                    onChange={(e) => setRefNursePhone(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    Nursing Qualification *
                  </label>
                  <select
                    className="form-control"
                    value={refNurseQual}
                    onChange={(e) => setRefNurseQual(e.target.value)}
                  >
                    <option value="B.Sc Nursing">B.Sc Nursing (Registered RN)</option>
                    <option value="General Nursing & Midwifery (GNM)">General Nursing & Midwifery (GNM)</option>
                    <option value="Critical Care / ICU Specialist RN">Critical Care / ICU Specialist RN</option>
                    <option value="Auxiliary Nurse Midwife (ANM)">Auxiliary Nurse Midwife (ANM)</option>
                    <option value="Post-Basic B.Sc Nursing">Post-Basic B.Sc Nursing</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    Years of Clinical Experience *
                  </label>
                  <select
                    className="form-control"
                    value={refNurseExp}
                    onChange={(e) => setRefNurseExp(e.target.value)}
                  >
                    <option value="1">1 - 2 Years</option>
                    <option value="3">3 - 5 Years</option>
                    <option value="6">6 - 10 Years</option>
                    <option value="11">More than 10 Years</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  Colleague Locality / Base Area in Hyderabad
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Madhapur, Kukatpally, Secunderabad, LB Nagar"
                  value={refNurseArea}
                  onChange={(e) => setRefNurseArea(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', borderRadius: 10, fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <UserPlus size={18} />
                <span>Submit Colleague Referral (Earn ₹500 Upon Approval)</span>
              </button>
            </form>
          </div>

          {/* Referred Nurses List */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: '0 0 1rem 0' }}>
              My Referred Nurses ({myNurseReferrals.length})
            </h4>

            {myNurseReferrals.length === 0 ? (
              <EmptyState
                compact
                title="No Nurse Referrals Submitted Yet"
                description="Share details of your nursing colleagues above to help grow the Xpress Nurse fleet and earn ₹500 per verified colleague."
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Colleague Nurse</th>
                      <th>Phone</th>
                      <th>Qualification & Exp</th>
                      <th>Area</th>
                      <th>Reward</th>
                      <th>Status & Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myNurseReferrals.map((ref) => {
                      const isApproved = ref.status === 'Approved' || ref.status === 'Converted';
                      const isRejected = ref.status === 'Rejected';

                      return (
                        <tr key={ref.id} style={{ background: isRejected ? '#FEF2F2' : undefined }}>
                          <td style={{ fontWeight: 700, color: '#0F172A' }}>
                            {ref.referredNurseName || ref.patientName}
                          </td>
                          <td style={{ fontSize: '0.82rem', color: '#64748B' }}>
                            {ref.referredNursePhone || ref.patientPhone}
                          </td>
                          <td style={{ fontSize: '0.8rem' }}>
                            <div>{ref.qualification || 'Registered Nurse'}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{ref.experienceYears ? `${ref.experienceYears} Yrs` : 'Clinical'}</div>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                            {ref.area || 'Hyderabad'}
                          </td>
                          <td>
                            <strong style={{ color: isApproved ? '#16A34A' : '#D97706' }}>
                              ₹500
                            </strong>
                          </td>
                          <td>
                            {isApproved ? (
                              <span className="status-pill success" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                                ✓ Approved & Onboarded
                              </span>
                            ) : isRejected ? (
                              <div>
                                <span className="status-pill error" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                                  Rejected
                                </span>
                                {ref.rejectionReason && (
                                  <div style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 600, marginTop: '0.2rem' }}>
                                    Reason: {ref.rejectionReason}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="status-pill warning" style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                                ⏳ Under Review
                              </span>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CERTIFICATE & DOCUMENT VERIFICATION TAB */}
      {/* ========================================================================= */}
      {activeTab === 'onboarding' && (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: '0 0 0.5rem 0' }}>
              Nursing Degree & Council Registration Certificate
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
              Xpress Nurse strictly verifies nursing certificates (B.Sc / GNM / Council Registration) to ensure hospital asepsis and patient safety across Hyderabad.
            </p>

            <div style={{ background: isVerifiedNurse ? '#F0FDF4' : '#FFFBEB', border: `1.5px solid ${isVerifiedNurse ? '#BBF7D0' : '#FCD34D'}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                {isVerifiedNurse ? (
                  <CheckCircle2 size={24} style={{ color: '#16A34A' }} />
                ) : (
                  <AlertCircle size={24} style={{ color: '#D97706' }} />
                )}
                <div>
                  <div style={{ fontWeight: 800, color: isVerifiedNurse ? '#166534' : '#92400E', fontSize: '0.96rem' }}>
                    {isVerifiedNurse ? 'Nursing Certificate Verified & Active' : 'Certificate Verification Pending'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: isVerifiedNurse ? '#15803D' : '#B45309' }}>
                    {isVerifiedNurse ? 'Your degree and Telangana State Nursing Council registration are verified.' : 'Upload your registration document to unlock direct patient visits dispatch.'}
                  </div>
                </div>
              </div>

              {nurse.certificateUrl && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.8rem', color: '#475569', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <FileText size={14} />
                    <span>Uploaded Certificate Document</span>
                  </span>
                  <a
                    href={nurse.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline"
                    style={{ fontSize: '0.76rem', padding: '0.25rem 0.65rem' }}
                  >
                    View Document
                  </a>
                </div>
              )}
            </div>

            <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '1.5rem', textAlign: 'center', background: '#F8FAFC' }}>
              <UploadCloud size={32} style={{ color: '#0284C7', margin: '0 auto 0.75rem auto' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.25rem' }}>
                Upload Updated Certificate or Council Renewal
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '1rem' }}>
                Supports PDF, JPG, PNG (Max 15 MB)
              </div>
              <input
                type="file"
                accept="application/pdf,image/*"
                id="nurse-cert-file-input"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = reader.result as string;
                      onUpdateNurse({
                        ...nurse,
                        certificateUrl: dataUrl,
                        status: 'Pending Verification'
                      });
                      alert('Certificate uploaded successfully! Admin will review and verify your profile.');
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById('nurse-cert-file-input')?.click()}
                className="btn btn-primary btn-sm"
                style={{ padding: '0.5rem 1.25rem', borderRadius: 8, fontWeight: 700 }}
              >
                Choose Certificate File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal Preview */}
      {isInvoiceModalOpen && previewInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Official Patient Visit Invoice</h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 10, fontSize: '0.84rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              <div><strong>Invoice:</strong> {previewInvoice.invoiceNumber}</div>
              <div><strong>Date:</strong> {previewInvoice.invoiceDate}</div>
              <div><strong>Patient:</strong> {previewInvoice.patientName}</div>
              <div><strong>Phone:</strong> {previewInvoice.patientPhone}</div>
              <div><strong>Address:</strong> {previewInvoice.fullAddress}</div>
              <div><strong>Service:</strong> {previewInvoice.serviceTitle}</div>
              <div><strong>Nurse Attending:</strong> {nurse.name}</div>
              <div style={{ borderTop: '1px dashed #CBD5E1', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                <strong>Total Amount:</strong> ₹{previewInvoice.totalAmount} ({previewInvoice.paymentStatus})
              </div>
            </div>

            <button
              onClick={() => setIsInvoiceModalOpen(false)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.65rem' }}
            >
              Close Invoice
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
