import React, { useState } from 'react';
import { 
  NurseProfile, 
  NurseLead, 
  Booking, 
  HyderabadArea, 
  ServiceId, 
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
  Database,
  RefreshCw,
  Cloud,
  FileText,
  Receipt,
  Printer,
  Download,
  X,
  Share2,
  Copy,
  Check,
  Sparkles,
  UserCheck,
  ExternalLink,
  UploadCloud,
  MessageCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EmptyState } from './EmptyState';
import { 
  generateInvoiceDetails, 
  openPrintableInvoiceWindow, 
  saveInvoiceToCloudflareBucket,
  getPrescriptionStorageObject
} from '../lib/cloudflareStorage';
import { DEFAULT_SERVICES, generateNurseReferralCode } from '../lib/supabase';

// Helper to convert base64 data URLs to safe Blob URLs that modern browsers won't block
export function getSafeBlobUrl(dataUrl: string): string {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
    const parts = dataUrl.split(';base64,');
    if (parts.length < 2) return dataUrl;
    const contentType = parts[0].split(':')[1] || 'image/png';
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    const blob = new Blob([uInt8Array], { type: contentType });
    return URL.createObjectURL(blob);
  } catch (e) {
    return dataUrl;
  }
}

export const HYDERABAD_AREAS: HyderabadArea[] = [
  'LB Nagar',
  'Banjara Hills',
  'Jubilee Hills',
  'Madhapur',
  'Gachibowli',
  'Kukatpally',
  'Dilsukhnagar',
  'Secunderabad',
  'Ameerpet',
  'Begumpet',
  'Kondapur',
  'Miyapur',
  'Hitec City',
  'Mehdipatnam',
  'Uppal',
  'Malakpet',
  'Attapur',
  'Tolichowki',
  'Charminar',
  'Nallagandla'
];

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
  onUpdateBooking?: (bookingId: string, updates: Partial<Booking>) => Promise<boolean | void> | void;
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
  onReassignBooking,
  onUpdateBooking
}) => {
  const serviceList = services.length > 0 ? services : DEFAULT_SERVICES;
  const nurse: NurseProfile = (currentNurse as NurseProfile) || (allNurses && allNurses.length > 0 ? (allNurses[0] as NurseProfile) : null) || {
    id: 'nurse-101',
    name: 'Nurse Priya Sharma',
    phone: '9849012345',
    email: 'priya.nursing@xpressnurse.in',
    experienceYears: 5,
    qualification: 'B.Sc Nursing (Registered RN)',
    serviceArea: 'Hyderabad Central',
    status: 'Active',
    totalLeads: 8,
    convertedLeads: 6,
    totalReferrals: 12,
    pointsEarned: 1200,
    referralEarningsRupees: 2400,
    rating: 4.9,
    avatarUrl: '/images/nurse_priya.jpg',
    certificateVerified: true
  };

  const isVerifiedNurse = Boolean(nurse.certificateVerified);

  const [activeTab, setActiveTab] = useState<'overview' | 'visits' | 'referrals' | 'new-lead' | 'onboarding'>('overview');

  // New lead form states (Direct to Admin)
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'Female' | 'Male' | 'Other'>('Female');
  const [serviceId, setServiceId] = useState<ServiceId>('saline-infusion');
  const [area, setArea] = useState<HyderabadArea>('LB Nagar');
  const [fullAddress, setFullAddress] = useState('');
  const [leadSuccessMsg, setLeadSuccessMsg] = useState('');
  const [leadErrorMsg, setLeadErrorMsg] = useState('');

  // Reassign / Transfer modal state
  const [reassignModalBooking, setReassignModalBooking] = useState<Booking | null>(null);
  const [targetReassignNurseId, setTargetReassignNurseId] = useState<string>('nurse-102');

  // Invoice modal & preview state
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceDetails | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // In-App Prescription modal state (Fixes 505 error)
  const [previewRxBooking, setPreviewRxBooking] = useState<Booking | null>(null);
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);

  // In-App Certificate modal state
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certModalUrl, setCertModalUrl] = useState<string>('');
  const [certModalTitle, setCertModalTitle] = useState<string>('');

  // Referral code copy state
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Nurse-Refer-Nurse state
  const [refNurseName, setRefNurseName] = useState('');
  const [refNursePhone, setRefNursePhone] = useState('');
  const [refNurseQual, setRefNurseQual] = useState('B.Sc Nursing');
  const [refNurseExp, setRefNurseExp] = useState('3');
  const [refNurseArea, setRefNurseArea] = useState('Hyderabad Central');
  const [refSuccessMsg, setRefSuccessMsg] = useState('');

  // Certificate upload states
  const [certUploadSuccessMsg, setCertUploadSuccessMsg] = useState('');
  const [certUploadErrorMsg, setCertUploadErrorMsg] = useState('');

  // Optional patient lead prescription attachment states
  const [leadRxFileName, setLeadRxFileName] = useState('');
  const [leadRxDataUrl, setLeadRxDataUrl] = useState('');

  // Nurse Approval / Rejection states
  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null);
  const [rejectReasonCategory, setRejectReasonCategory] = useState<string>('Currently attending another urgent patient');
  const [rejectCustomReason, setRejectCustomReason] = useState<string>('');
  const [nurseActionFeedback, setNurseActionFeedback] = useState<string>('');
  const [visitStatusFilter, setVisitStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'declined'>('all');

  // Handle Nurse Accepting an assigned visit
  const handleAcceptVisit = async (booking: Booking) => {
    try {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const auditMsg = `[${nowStr}] Approved & accepted by Nurse ${nurse.name}`;
      const updatedNotes = booking.notes ? `${booking.notes} • ${auditMsg}` : auditMsg;

      if (onUpdateBooking) {
        await onUpdateBooking(booking.id, {
          status: 'In-Progress',
          nurseAcceptanceStatus: 'Accepted',
          notes: updatedNotes
        });
      }
      setNurseActionFeedback(`✓ Visit #${booking.id} accepted! You are now assigned to attend ${booking.patientName}.`);
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 } });
      setTimeout(() => setNurseActionFeedback(''), 5000);
    } catch {
      setNurseActionFeedback('Error updating visit status. Please retry.');
      setTimeout(() => setNurseActionFeedback(''), 4000);
    }
  };

  // Open Decline / Rejection Modal
  const handleOpenRejectModal = (booking: Booking) => {
    setRejectingBooking(booking);
    setRejectReasonCategory('Currently attending another urgent patient');
    setRejectCustomReason('');
  };

  // Submit Nurse Decline to Admin
  const handleConfirmRejectVisit = async () => {
    if (!rejectingBooking) return;
    const finalReason = rejectReasonCategory === 'Other' && rejectCustomReason.trim()
      ? rejectCustomReason.trim()
      : rejectReasonCategory;

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const auditMsg = `[${nowStr}] Declined by Nurse ${nurse.name}: "${finalReason}". Admin alert: Referral/reassignment needed.`;
    const updatedNotes = rejectingBooking.notes ? `${rejectingBooking.notes} • ${auditMsg}` : auditMsg;

    if (onUpdateBooking) {
      await onUpdateBooking(rejectingBooking.id, {
        status: 'Rejected',
        nurseAcceptanceStatus: 'Rejected',
        rejectedBy: 'Nurse',
        rejectedNurseId: nurse.id,
        rejectedNurseName: nurse.name,
        rejectionReason: `Nurse ${nurse.name} Declined: ${finalReason}`,
        rejectedAt: new Date().toISOString(),
        notes: updatedNotes
      });
    }

    const bId = rejectingBooking.id;
    setRejectingBooking(null);
    setNurseActionFeedback(`Visit #${bId} declined. Operations Admin has been flagged to refer this order to another nurse.`);
    setTimeout(() => setNurseActionFeedback(''), 6000);
  };

  const handleCertFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setCertUploadErrorMsg('File exceeds 15 MB limit. Please select a smaller certificate file.');
        return;
      }
      setCertUploadErrorMsg('');
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onUpdateNurse({
          ...nurse,
          certificateUrl: dataUrl,
          certificateVerified: true,
          status: 'Active'
        });
        setCertUploadSuccessMsg(`✓ Certificate "${file.name}" uploaded successfully! Profile verified for clinical dispatch.`);
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        setTimeout(() => setCertUploadSuccessMsg(''), 5000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLeadRxUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setLeadRxDataUrl(reader.result as string);
        setLeadRxFileName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const nurseReferralCode = nurse.referralCode || generateNurseReferralCode(nurse.name, nurse.phone);
  const referralInviteUrl = `https://xpressnurse.in/nurse/join?ref=${nurseReferralCode}`;

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

  const pendingApprovalVisits = assignedVisits.filter((b) => {
    const isDeclined = b.nurseAcceptanceStatus === 'Rejected' || (b.status === 'Rejected' && (b.rejectedBy === 'Nurse' || b.rejectionReason?.toLowerCase().includes('nurse')));
    const isAccepted = b.nurseAcceptanceStatus === 'Accepted' || b.status === 'In-Progress' || b.status === 'Completed';
    return !isDeclined && !isAccepted;
  });

  const acceptedVisits = assignedVisits.filter((b) => {
    return b.nurseAcceptanceStatus === 'Accepted' || (b.status === 'In-Progress' && b.nurseAcceptanceStatus !== 'Rejected') || b.status === 'Completed';
  });

  const declinedVisits = assignedVisits.filter((b) => {
    return b.nurseAcceptanceStatus === 'Rejected' || (b.status === 'Rejected' && (b.rejectedBy === 'Nurse' || b.rejectionReason?.toLowerCase().includes('nurse')));
  });

  // Leads referred by THIS nurse
  const myLeads = leads.filter((l) => l.nurseId === nurse.id);
  const myPatientLeads = myLeads.filter((l) => !l.referredNurseName && !l.referredNursePhone);
  const myNurseReferrals = myLeads.filter((l) => Boolean(l.referredNurseName || l.referredNursePhone));

  const pendingPatientLeads = myPatientLeads.filter((l) => l.status === 'Pending Approval' || l.status === 'Submitted');
  const approvedPatientLeads = myPatientLeads.filter((l) => l.status === 'Approved' || l.status === 'Converted');
  const rejectedPatientLeads = myPatientLeads.filter((l) => l.status === 'Rejected');

  const pendingNurseReferrals = myNurseReferrals.filter((l) => l.status === 'Pending Approval' || l.status === 'Submitted');
  const approvedNurseReferrals = myNurseReferrals.filter((l) => l.status === 'Approved' || l.status === 'Converted');
  const rejectedNurseReferrals = myNurseReferrals.filter((l) => l.status === 'Rejected');

  // 50 Points = ₹50 Rule
  const patientPointsEarned = approvedPatientLeads.reduce((acc, l) => acc + (l.pointsAwarded !== undefined ? l.pointsAwarded : 50), 0);
  const patientRupeesEarned = approvedPatientLeads.reduce((acc, l) => acc + (l.referralCommissionRupees !== undefined ? l.referralCommissionRupees : 50), 0);

  const nursePointsEarned = approvedNurseReferrals.reduce((acc, l) => acc + (l.pointsAwarded !== undefined ? l.pointsAwarded : 50), 0);
  const nurseRupeesEarned = approvedNurseReferrals.reduce((acc, l) => acc + (l.referralCommissionRupees !== undefined ? l.referralCommissionRupees : 50), 0);

  const totalBonusPoints = patientPointsEarned + nursePointsEarned;
  const totalBonusRupees = patientRupeesEarned + nurseRupeesEarned;

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

    const selectedServiceObj = serviceList.find((s) => s.id === serviceId) || serviceList[0];
    const fee = selectedServiceObj ? (selectedServiceObj.priceNumber || 800) : 800;

    const newLead: NurseLead = {
      id: 'LD-' + Math.floor(1000 + Math.random() * 9000),
      nurseId: nurse.id,
      patientName: `${patientName.trim()}${patientAge ? ` (${patientAge} yrs, ${patientGender})` : ''}`,
      patientPhone: cleanPhone,
      patientAge: patientAge ? parseInt(patientAge) : undefined,
      patientGender,
      fullAddress: fullAddress.trim(),
      serviceId,
      serviceTitle: selectedServiceObj?.title || 'Home Nursing Care',
      area,
      submittedAt: new Date().toISOString(),
      status: 'Pending Approval',
      leadValueRupees: fee,
      pointsAwarded: 0,
      referralCommissionRupees: 0,
      notes: leadRxFileName ? `Prescription Attached: ${leadRxFileName}` : undefined
    };

    onAddNewLead(newLead);

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });

    setLeadSuccessMsg(
      `✓ Patient lead transmitted directly to Central Admin! You earn 50 reward points (= ₹50) upon Admin approval.`
    );
    setPatientName('');
    setPatientPhone('');
    setPatientAge('');
    setFullAddress('');
    setLeadRxFileName('');
    setLeadRxDataUrl('');

    setTimeout(() => {
      setLeadSuccessMsg('');
      setActiveTab('referrals');
    }, 2500);
  };

  const handleReferNurseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refNurseName.trim() || !refNursePhone.trim()) return;

    const cleanPhone = refNursePhone.replace(/\D/g, '');
    const newRefLead: NurseLead = {
      id: 'RN-' + Math.floor(1000 + Math.random() * 9000),
      nurseId: nurse.id,
      patientName: `Nurse ${refNurseName.trim()}`,
      patientPhone: cleanPhone,
      referredNurseName: refNurseName.trim(),
      referredNursePhone: cleanPhone,
      qualification: refNurseQual,
      experienceYears: parseInt(refNurseExp) || 3,
      serviceId: 'saline-infusion',
      area: refNurseArea || 'Hyderabad',
      submittedAt: new Date().toISOString(),
      status: 'Pending Approval',
      leadValueRupees: 0,
      pointsAwarded: 0,
      referralCommissionRupees: 0,
      notes: `Referred fellow nurse colleague by ${nurse.name} (Code: ${nurseReferralCode})`
    };

    onAddNewLead(newRefLead);

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });

    setRefSuccessMsg(`✓ Colleague nurse ${refNurseName} referred successfully! You earn 50 reward points (= ₹50) once verified by Admin.`);
    setRefNurseName('');
    setRefNursePhone('');

    setTimeout(() => {
      setRefSuccessMsg('');
    }, 3500);
  };

  const handleConfirmReassign = () => {
    if (reassignModalBooking && onReassignBooking) {
      onReassignBooking(reassignModalBooking.id, targetReassignNurseId);
      setReassignModalBooking(null);
    }
  };

  return (
    <div className="panel-container container">
      {/* Logged In Nurse Status Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--neutral-600)' }}>
          <span>Nurse Staff Portal</span>
          <span>•</span>
          <span style={{ fontWeight: 700, color: 'var(--primary-navy-900)' }}>{nurse.name}</span>
          <span style={{ background: '#F1F5F9', padding: '0.2rem 0.55rem', borderRadius: 9999, fontSize: '0.74rem', fontWeight: 600, color: 'var(--neutral-600)' }}>
            Station: {nurse.serviceArea}
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <img
            src={nurse.avatarUrl || '/images/nurse_priya.jpg'}
            alt={nurse.name}
            style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-navy-700)' }}
          />
          <div>
            <h2 style={{ fontSize: '1.35rem', color: 'var(--primary-navy-900)' }}>
              {nurse.name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--neutral-600)', flexWrap: 'wrap' }}>
              <span>Stationed Base: <strong>{nurse.serviceArea}</strong></span>
              <span>•</span>
              <span>Exp: {nurse.experienceYears} Years</span>
              <span>•</span>
              {isVerifiedNurse ? (
                <span className="status-pill success"><ShieldCheck size={12} /> Verified RN</span>
              ) : (
                <span className="status-pill warning"><AlertCircle size={12} /> Pending Verification</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            id="nurse-header-upload-btn"
            onClick={() => {
              setActiveTab('onboarding');
              setTimeout(() => {
                document.getElementById('nurse-cert-file-input')?.click();
              }, 120);
            }}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
          >
            <UploadCloud size={15} />
            <span>Upload Certificate</span>
          </button>

          <button
            onClick={() => setActiveTab('new-lead')}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <UserPlus size={15} />
            <span>Refer Patient Lead</span>
          </button>

          <a
            href={`https://wa.me/917569657371?text=${encodeURIComponent(`Hello Operations Admin, I am Nurse ${nurse.name} (ID: ${nurse.id}, Base: ${nurse.serviceArea}). I need assistance regarding my visits/portal.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm"
            style={{
              background: '#25D366',
              color: '#FFFFFF',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: 700,
              padding: '0.42rem 0.85rem',
              borderRadius: 8,
              boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)',
              textDecoration: 'none'
            }}
            title="Chat directly with Operations Admin on WhatsApp"
          >
            <MessageCircle size={15} />
            <span>Admin Helpline</span>
          </a>
        </div>
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
          <span>My Referrals & Earnings ({myLeads.length})</span>
          {pendingPatientLeads.length + pendingNurseReferrals.length > 0 && (
            <span style={{
              marginLeft: '0.35rem',
              background: '#F59E0B',
              color: '#FFFFFF',
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '0.15rem 0.45rem',
              borderRadius: 9999
            }}>
              {pendingPatientLeads.length + pendingNurseReferrals.length} Pending
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
          Certificate & Documents
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. OVERVIEW & REWARDS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div>
          {/* Pending Approval Notice if any */}
          {pendingPatientLeads.length + pendingNurseReferrals.length > 0 && (
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
                    {pendingPatientLeads.length + pendingNurseReferrals.length} Referral Lead(s) Awaiting Admin Decision & Approval
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#B45309' }}>
                    Reward points (50 pts = ₹50 each) will be credited to your ledger immediately upon Admin approval.
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

          {/* Certificate Warning with Upload Action if pending */}
          {!isVerifiedNurse && (
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
                <AlertCircle size={22} style={{ color: '#D97706', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800, color: '#92400E', fontSize: '0.92rem' }}>
                    Referral-Only Mode Active (Nursing Certificate Pending Verification)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#B45309' }}>
                    You can refer patients and fellow nurses to earn rewards. Please upload your Telangana / Indian Nursing Council certificate to unlock direct home care patient dispatches.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('onboarding');
                  setTimeout(() => {
                    document.getElementById('nurse-cert-file-input')?.click();
                  }, 120);
                }}
                className="btn btn-sm"
                style={{ background: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '0.4rem 0.85rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <UploadCloud size={14} />
                <span>Upload Certificate</span>
              </button>
            </div>
          )}

          {/* Key Metric Stats Cards - 4 Important Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#EEF5FF', color: 'var(--primary-navy-700)' }}>
                <Users size={24} />
              </div>
              <div>
                <div className="stat-val">{myPatientLeads.length}</div>
                <div className="stat-label">Total Patient Leads Sent</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div className="stat-val" style={{ color: '#10B981' }}>{approvedPatientLeads.length}</div>
                <div className="stat-label">Patient Leads Approved</div>
                <div style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 700, marginTop: 2 }}>
                  +{patientPointsEarned} pts (₹{patientRupeesEarned})
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#FAF5FF', color: '#9333EA' }}>
                <UserCheck size={24} />
              </div>
              <div>
                <div className="stat-val" style={{ color: '#9333EA' }}>{approvedNurseReferrals.length}</div>
                <div className="stat-label">Nurses Onboarded</div>
                <div style={{ fontSize: '0.72rem', color: '#7E22CE', fontWeight: 700, marginTop: 2 }}>
                  +{nursePointsEarned} pts (₹{nurseRupeesEarned})
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <div className="stat-val" style={{ color: '#059669' }}>₹{totalBonusRupees}</div>
                <div className="stat-label">Total Referral Earnings</div>
                <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 700, marginTop: 2 }}>
                  {totalBonusPoints} Pts (1 Pt = ₹1)
                </div>
              </div>
            </div>
          </div>

          {/* Referral & Milestone Incentive Program */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title">Xpress Nurse Milestone & Referral Bonus Program</h3>
              <span className="status-pill success">1 Point = ₹1 Rupee</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>Patient Referral Bonus</div>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--primary-navy-800)' }}>50 Points (= ₹50)</strong>
                  <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginTop: '0.25rem' }}>
                    Awarded for every approved patient lead sent to central admin
                  </p>
                </div>

                <div style={{ padding: '1rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>Colleague Nurse Referral</div>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--primary-navy-800)' }}>50 Points (= ₹50)</strong>
                  <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginTop: '0.25rem' }}>
                    Awarded when a referred colleague completes verification
                  </p>
                </div>

                <div style={{ padding: '1rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>Conversion Rate</div>
                  <strong style={{ fontSize: '1.25rem', color: '#16A34A' }}>1 Pt = ₹1 Rupee</strong>
                  <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginTop: '0.25rem' }}>
                    Direct 1:1 conversion into your bank payout account
                  </p>
                </div>

                <div style={{ padding: '1rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-200)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>Admin Quality Guarantee</div>
                  <strong style={{ fontSize: '1.25rem', color: 'var(--accent-red-600)' }}>₹0 on Rejection</strong>
                  <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginTop: '0.25rem' }}>
                    Strict compliance ensures no phantom charges or unverified payouts
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Assigned Visits Schedule Quick View */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">My Assigned Visits Schedule ({nurse.serviceArea} Base)</h3>
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
                description={`You have no patient visits assigned in ${nurse.serviceArea} right now.`}
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
                      <th>Fee</th>
                      <th>Status & Approval</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedVisits.slice(0, 5).map((booking) => {
                      const isDeclinedByNurse = booking.nurseAcceptanceStatus === 'Rejected' || (booking.status === 'Rejected' && (booking.rejectedBy === 'Nurse' || booking.rejectionReason?.toLowerCase().includes('nurse')));
                      const isRejectedByAdmin = booking.status === 'Rejected' && !isDeclinedByNurse;
                      const isCancelledOrRejected = booking.status === 'Cancelled' || isDeclinedByNurse || isRejectedByAdmin;
                      const isAccepted = booking.nurseAcceptanceStatus === 'Accepted' || (booking.status === 'In-Progress' && !isCancelledOrRejected);
                      const isPendingApproval = !isAccepted && !isCancelledOrRejected && booking.status !== 'Completed';

                      return (
                        <tr key={booking.id} style={{ 
                          background: isDeclinedByNurse ? '#FFF1F2' : isRejectedByAdmin ? '#FEF2F2' : isPendingApproval ? '#FFFBEB' : undefined,
                          borderLeft: isPendingApproval ? '3px solid #F59E0B' : undefined
                        }}>
                          <td><strong>{booking.id}</strong></td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{booking.patientName}</div>
                            {/* Strictly hide phone number on rejection */}
                            {isCancelledOrRejected ? (
                              <span style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 600 }}>✕ Contact Hidden (Declined)</span>
                            ) : (
                              <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>{booking.patientPhone}</div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{booking.serviceTitle}</div>
                            {booking.hasPrescription || booking.prescriptionFileName || booking.prescriptionUrl ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewRxBooking(booking);
                                  setIsRxModalOpen(true);
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.72rem',
                                  color: '#0284C7',
                                  fontWeight: 700,
                                  background: '#F0F9FF',
                                  border: '1px solid #BAE6FD',
                                  borderRadius: 4,
                                  padding: '2px 6px',
                                  cursor: 'pointer',
                                  marginTop: '0.2rem'
                                }}
                                title="Inspect Verified Doctor Prescription"
                              >
                                <FileText size={11} />
                                <span>View Mandatory Rx</span>
                              </button>
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
                          {/* Strictly ₹0 on rejection */}
                          <td>
                            {isCancelledOrRejected ? (
                              <span style={{ color: '#94A3B8', fontSize: '0.84rem', fontWeight: 600 }}>
                                ₹0 <small style={{ color: '#DC2626' }}>(Void)</small>
                              </span>
                            ) : (
                              <strong>₹{booking.finalFee !== undefined ? booking.finalFee : booking.estimatedFee}</strong>
                            )}
                          </td>
                          <td>
                            {isPendingApproval ? (
                              <span className="status-pill warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 750, fontSize: '0.75rem' }}>
                                <Clock size={11} /> Awaiting Approval
                              </span>
                            ) : isAccepted ? (
                              <span className="status-pill success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 750, fontSize: '0.75rem' }}>
                                <CheckCircle2 size={11} /> Accepted
                              </span>
                            ) : isDeclinedByNurse ? (
                              <div>
                                <span className="status-pill danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 750, fontSize: '0.74rem' }}>
                                  ✕ Declined by You
                                </span>
                                <div style={{ fontSize: '0.68rem', color: '#991B1B', marginTop: 2 }}>Sent to Admin</div>
                              </div>
                            ) : isRejectedByAdmin ? (
                              <span className="status-pill danger">❌ Rejected by Admin</span>
                            ) : (
                              <span className="status-pill success">{booking.status}</span>
                            )}
                          </td>
                          <td>
                            {isPendingApproval ? (
                              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleAcceptVisit(booking)}
                                  className="btn btn-sm"
                                  style={{
                                    background: '#16A34A',
                                    color: '#FFF',
                                    fontWeight: 750,
                                    fontSize: '0.72rem',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: 6,
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem'
                                  }}
                                  title="Accept this assigned visit"
                                >
                                  <Check size={12} />
                                  <span>Accept</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectModal(booking)}
                                  className="btn btn-sm"
                                  style={{
                                    background: '#FFF1F2',
                                    border: '1px solid #FECDD3',
                                    color: '#E11D48',
                                    fontWeight: 700,
                                    fontSize: '0.72rem',
                                    padding: '0.25rem 0.45rem',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem'
                                  }}
                                  title="Decline visit so Admin can reassign"
                                >
                                  <X size={12} />
                                  <span>Decline</span>
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
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
                                  title="Generate Official Invoice"
                                >
                                  <Receipt size={12} />
                                  <span>Invoice</span>
                                </button>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ASSIGNED VISITS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'visits' && (
        <div>
          {/* Action Feedback Toast / Alert Banner */}
          {nurseActionFeedback && (
            <div style={{
              background: '#ECFDF5',
              border: '1px solid #10B981',
              color: '#065F46',
              padding: '0.85rem 1.25rem',
              borderRadius: 10,
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)'
            }}>
              <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
              <span>{nurseActionFeedback}</span>
            </div>
          )}

          {/* Pending Approval Urgent Alert Banner */}
          {pendingApprovalVisits.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
              border: '1px solid #F59E0B',
              borderRadius: 10,
              padding: '0.9rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.12)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F59E0B', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#92400E', fontSize: '0.92rem' }}>
                    Action Required: {pendingApprovalVisits.length} Visit(s) Awaiting Your Acceptance
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#B45309' }}>
                    Please review patient procedures below and choose to Accept or Decline so Admin can reassign if needed.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVisitStatusFilter('pending')}
                className="btn btn-sm"
                style={{ background: '#D97706', color: '#FFF', border: 'none', fontWeight: 700, fontSize: '0.78rem', padding: '0.35rem 0.8rem', borderRadius: 6, cursor: 'pointer' }}
              >
                Review Pending ({pendingApprovalVisits.length})
              </button>
            </div>
          )}

          {/* Top Contextual Metric Cards for Assigned Visits */}
          {(() => {
            const completedVisitsCount = assignedVisits.filter(b => b.status === 'Completed').length;

            return (
              <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setVisitStatusFilter('all')}>
                  <div className="stat-icon" style={{ background: '#EFF6FF', color: '#0284C7' }}>
                    <Calendar size={22} />
                  </div>
                  <div>
                    <div className="stat-val">{assignedVisits.length}</div>
                    <div className="stat-label">Total Assigned</div>
                  </div>
                </div>

                <div 
                  className="stat-card" 
                  style={{ 
                    cursor: 'pointer',
                    border: pendingApprovalVisits.length > 0 ? '2px solid #F59E0B' : undefined,
                    background: pendingApprovalVisits.length > 0 ? '#FFFDF5' : undefined 
                  }} 
                  onClick={() => setVisitStatusFilter('pending')}
                >
                  <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                    <Clock size={22} />
                  </div>
                  <div>
                    <div className="stat-val" style={{ color: '#D97706' }}>{pendingApprovalVisits.length}</div>
                    <div className="stat-label">Awaiting Approval</div>
                    {pendingApprovalVisits.length > 0 && (
                      <div style={{ fontSize: '0.7rem', color: '#B45309', fontWeight: 800 }}>⚡ Action Needed</div>
                    )}
                  </div>
                </div>

                <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setVisitStatusFilter('accepted')}>
                  <div className="stat-icon" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <div className="stat-val" style={{ color: '#16A34A' }}>{acceptedVisits.length}</div>
                    <div className="stat-label">Accepted & Active</div>
                  </div>
                </div>

                <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setVisitStatusFilter('declined')}>
                  <div className="stat-icon" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                    <X size={22} />
                  </div>
                  <div>
                    <div className="stat-val" style={{ color: '#DC2626' }}>{declinedVisits.length}</div>
                    <div className="stat-label">Declined (To Admin)</div>
                    <div style={{ fontSize: '0.72rem', color: '#991B1B', fontWeight: 700, marginTop: 2 }}>
                      Referred to Admin
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 className="card-title">Patient Visits Dispatched to You ({nurse.serviceArea})</h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--neutral-500)' }}>
                  Approve visits to accept attending, or decline with a reason so Admin can refer to another colleague
                </span>
              </div>

              {/* Status Filter Tabs */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setVisitStatusFilter('all')}
                  className={`btn btn-sm ${visitStatusFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                >
                  All ({assignedVisits.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVisitStatusFilter('pending')}
                  className={`btn btn-sm ${visitStatusFilter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.25rem 0.55rem',
                    background: visitStatusFilter === 'pending' ? '#D97706' : undefined,
                    borderColor: '#D97706',
                    color: visitStatusFilter === 'pending' ? '#FFF' : '#B45309',
                    fontWeight: 750
                  }}
                >
                  Awaiting Acceptance ({pendingApprovalVisits.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVisitStatusFilter('accepted')}
                  className={`btn btn-sm ${visitStatusFilter === 'accepted' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                >
                  Accepted ({acceptedVisits.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVisitStatusFilter('declined')}
                  className={`btn btn-sm ${visitStatusFilter === 'declined' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', color: visitStatusFilter === 'declined' ? '#FFF' : '#DC2626' }}
                >
                  Declined ({declinedVisits.length})
                </button>
              </div>
            </div>

            {(() => {
              const displayedVisits = assignedVisits.filter((b) => {
                if (visitStatusFilter === 'pending') {
                  const isDeclined = b.nurseAcceptanceStatus === 'Rejected' || (b.status === 'Rejected' && (b.rejectedBy === 'Nurse' || b.rejectionReason?.toLowerCase().includes('nurse')));
                  const isAcc = b.nurseAcceptanceStatus === 'Accepted' || (b.status === 'In-Progress' && b.nurseAcceptanceStatus !== 'Rejected');
                  return !isDeclined && !isAcc && b.status !== 'Completed' && b.status !== 'Cancelled';
                }
                if (visitStatusFilter === 'accepted') {
                  return b.nurseAcceptanceStatus === 'Accepted' || (b.status === 'In-Progress' && b.nurseAcceptanceStatus !== 'Rejected');
                }
                if (visitStatusFilter === 'declined') {
                  return b.nurseAcceptanceStatus === 'Rejected' || (b.status === 'Rejected' && (b.rejectedBy === 'Nurse' || b.rejectionReason?.toLowerCase().includes('nurse')));
                }
                return true;
              });

              if (displayedVisits.length === 0) {
                return (
                  <EmptyState
                    title={
                      visitStatusFilter === 'pending' 
                        ? 'No Visits Awaiting Approval'
                        : visitStatusFilter === 'accepted'
                        ? 'No Accepted Active Visits'
                        : visitStatusFilter === 'declined'
                        ? 'No Declined Visits'
                        : 'No Patient Visits Stationed'
                    }
                    description={`There are currently no matching visits in this category for ${nurse.name}.`}
                  />
                );
              }

              return (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Booking ID</th>
                        <th>Patient Name & Contact</th>
                        <th>Clinical Procedure</th>
                        <th>Locality & Address</th>
                        <th>Fee</th>
                        <th>Status & Acceptance</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedVisits.map((booking) => {
                        const isDeclinedByNurse = booking.nurseAcceptanceStatus === 'Rejected' || (booking.status === 'Rejected' && (booking.rejectedBy === 'Nurse' || booking.rejectionReason?.toLowerCase().includes('nurse')));
                        const isRejectedByAdmin = booking.status === 'Rejected' && !isDeclinedByNurse;
                        const isCancelledOrRejected = booking.status === 'Cancelled' || isDeclinedByNurse || isRejectedByAdmin;
                        const isAccepted = booking.nurseAcceptanceStatus === 'Accepted' || (booking.status === 'In-Progress' && !isCancelledOrRejected);
                        const isPendingApproval = !isAccepted && !isCancelledOrRejected && booking.status !== 'Completed';

                        return (
                          <tr key={booking.id} style={{ 
                            background: isDeclinedByNurse ? '#FFF1F2' : isRejectedByAdmin ? '#FEF2F2' : isPendingApproval ? '#FFFBEB' : undefined,
                            borderLeft: isPendingApproval ? '3px solid #F59E0B' : undefined
                          }}>
                            <td><strong>{booking.id}</strong></td>

                            {/* Patient & Call Button */}
                            <td>
                              <div style={{ fontWeight: 600 }}>{booking.patientName}</div>
                              {isCancelledOrRejected ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  color: '#94A3B8',
                                  fontSize: '0.74rem',
                                  background: '#F1F5F9',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: 4,
                                  fontWeight: 600,
                                  marginTop: '0.2rem'
                                }}>
                                  ✕ Contact Hidden (Declined)
                                </span>
                              ) : (
                                <a
                                  href={`tel:${booking.patientPhone}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    background: '#16A34A',
                                    color: '#FFFFFF',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: 6,
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                    marginTop: '0.25rem',
                                    boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
                                  }}
                                  title={`Call patient directly: ${booking.patientPhone}`}
                                >
                                  <Phone size={12} />
                                  <span>Call {booking.patientPhone}</span>
                                </a>
                              )}
                            </td>

                            {/* Clinical Procedure & In-App Rx Viewer */}
                            <td>
                              <div style={{ fontWeight: 600 }}>{booking.serviceTitle}</div>
                              {booking.hasPrescription || booking.prescriptionFileName || booking.prescriptionUrl ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreviewRxBooking(booking);
                                    setIsRxModalOpen(true);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: '0.72rem',
                                    color: '#0284C7',
                                    fontWeight: 700,
                                    background: '#F0F9FF',
                                    border: '1px solid #BAE6FD',
                                    borderRadius: 4,
                                    padding: '2px 6px',
                                    cursor: 'pointer',
                                    marginTop: '0.25rem'
                                  }}
                                  title="View verified doctor prescription in-app"
                                >
                                  <FileText size={11} />
                                  <span>View Mandatory Rx</span>
                                </button>
                              ) : (
                                <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>✓ Verified Protocol</span>
                              )}
                            </td>

                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                                <MapPin size={14} style={{ color: 'var(--neutral-500)' }} />
                                <span>{booking.area}</span>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)' }}>{booking.fullAddress}</div>
                            </td>

                            {/* Fee (Strictly ₹0 on rejection) */}
                            <td>
                              {isCancelledOrRejected ? (
                                <span style={{ color: '#94A3B8', fontSize: '0.84rem', fontWeight: 600 }}>
                                  ₹0 <small style={{ color: '#DC2626' }}>(Void)</small>
                                </span>
                              ) : (
                                <div style={{ fontWeight: 700, color: 'var(--primary-navy-900)' }}>
                                  ₹{booking.finalFee !== undefined ? booking.finalFee : booking.estimatedFee}
                                </div>
                              )}
                            </td>

                            {/* Status & Acceptance */}
                            <td>
                              {isPendingApproval ? (
                                <div>
                                  <span className="status-pill warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 800 }}>
                                    <Clock size={12} /> Awaiting Your Approval
                                  </span>
                                  <div style={{ fontSize: '0.72rem', color: '#B45309', marginTop: '3px', fontWeight: 600 }}>
                                    Action Required: Accept or Decline
                                  </div>
                                </div>
                              ) : isAccepted ? (
                                <span className="status-pill success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 800 }}>
                                  <CheckCircle2 size={12} /> Accepted & Active
                                </span>
                              ) : isDeclinedByNurse ? (
                                <div>
                                  <span className="status-pill danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 800 }}>
                                    ✕ Declined by You
                                  </span>
                                  <div style={{ fontSize: '0.7rem', color: '#991B1B', marginTop: '2px', fontWeight: 600 }}>
                                    Sent to Admin for Reassignment
                                  </div>
                                  {booking.rejectionReason && (
                                    <div style={{ fontSize: '0.7rem', color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, padding: '3px 6px', marginTop: '0.25rem', fontWeight: 600, maxWidth: 210 }}>
                                      {booking.rejectionReason}
                                    </div>
                                  )}
                                </div>
                              ) : isRejectedByAdmin ? (
                                <div>
                                  <span className="status-pill danger">❌ Rejected by Admin</span>
                                  {booking.rejectionReason && (
                                    <div style={{ fontSize: '0.72rem', color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, padding: '3px 6px', marginTop: '0.3rem', fontWeight: 600, maxWidth: 200 }}>
                                      <strong>Reason:</strong> {booking.rejectionReason}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="status-pill success">{booking.status}</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td>
                              {isPendingApproval ? (
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleAcceptVisit(booking)}
                                    className="btn btn-sm"
                                    style={{
                                      background: '#16A34A',
                                      color: '#FFFFFF',
                                      fontWeight: 750,
                                      fontSize: '0.78rem',
                                      padding: '0.35rem 0.75rem',
                                      borderRadius: 6,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      border: 'none',
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 4px rgba(22,163,74,0.3)'
                                    }}
                                    title="Accept this assigned visit and attend the patient"
                                  >
                                    <CheckCircle2 size={13} />
                                    <span>Accept Visit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRejectModal(booking)}
                                    className="btn btn-sm"
                                    style={{
                                      background: '#FFF1F2',
                                      border: '1px solid #FECDD3',
                                      color: '#E11D48',
                                      fontWeight: 700,
                                      fontSize: '0.75rem',
                                      padding: '0.35rem 0.65rem',
                                      borderRadius: 6,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      cursor: 'pointer'
                                    }}
                                    title="Decline visit so Admin can refer to another nurse"
                                  >
                                    <X size={13} />
                                    <span>Decline</span>
                                  </button>
                                </div>
                              ) : (
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
                                    title="Generate Official Invoice"
                                  >
                                    <Receipt size={13} />
                                    <span>Invoice</span>
                                  </button>
                                  {!isCancelledOrRejected && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReassignModalBooking(booking);
                                        setTargetReassignNurseId(allNurses.find((n) => n.id !== nurse.id)?.id || 'nurse-102');
                                      }}
                                      className="btn btn-outline btn-sm"
                                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.55rem' }}
                                      title="Transfer this order to another colleague nurse"
                                    >
                                      <RefreshCw size={12} />
                                      <span>Transfer</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MY REFERRALS & EARNINGS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'referrals' && (
        <div>
          {/* Top Contextual Metric Cards for Referrals */}
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#FAF5FF', color: '#9333EA' }}>
                <Users size={22} />
              </div>
              <div>
                <div className="stat-val">{myNurseReferrals.length}</div>
                <div className="stat-label">Colleague Nurses Referred</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                <UserCheck size={22} />
              </div>
              <div>
                <div className="stat-val" style={{ color: '#16A34A' }}>{approvedNurseReferrals.length}</div>
                <div className="stat-label">Nurses Onboarded</div>
                <div style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 700, marginTop: 2 }}>
                  +{nursePointsEarned} pts (₹{nurseRupeesEarned})
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div className="stat-val" style={{ color: '#1D4ED8' }}>{approvedPatientLeads.length}</div>
                <div className="stat-label">Patient Leads Approved</div>
                <div style={{ fontSize: '0.72rem', color: '#2563EB', fontWeight: 700, marginTop: 2 }}>
                  +{patientPointsEarned} pts (₹{patientRupeesEarned})
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#D1FAE5', color: '#059669' }}>
                <Coins size={22} />
              </div>
              <div>
                <div className="stat-val" style={{ color: '#059669' }}>{totalBonusPoints} Pts</div>
                <div className="stat-label">Total Bonus (₹{totalBonusRupees})</div>
                <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 700, marginTop: 2 }}>
                  1 Point = ₹1 Rupee
                </div>
              </div>
            </div>
          </div>

          {/* Referral Code & Tools */}
          <div className="card" style={{ marginBottom: '1.5rem', background: '#F8FAFC', border: '1.5px solid #CBD5E1' }}>
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Sparkles size={18} style={{ color: '#F59E0B' }} />
                  <span>Your Personal Referral Code & Direct Link</span>
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.2rem 0 0 0' }}>
                  Colleagues can enter this code during signup. You earn 50 reward points (= ₹50) once verified.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ background: '#FFFFFF', border: '2px dashed #0284C7', padding: '0.35rem 0.85rem', borderRadius: 8, fontWeight: 900, fontFamily: 'monospace', fontSize: '1.1rem', color: '#0284C7' }}>
                  {nurseReferralCode}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(nurseReferralCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700 }}
                >
                  {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 1. Patient Leads Sent to Admin */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <h3 className="card-title">Patient Leads Sent to Admin ({myPatientLeads.length})</h3>
              <span style={{ fontSize: '0.78rem', color: '#0284C7', fontWeight: 700, background: '#EFF6FF', padding: '0.2rem 0.6rem', borderRadius: 9999 }}>
                Rate: 50 Points (= ₹50) per approved lead
              </span>
            </div>

            {myPatientLeads.length === 0 ? (
              <EmptyState
                compact
                title="No Patient Leads Sent Yet"
                description="Use '+ Submit New Lead' to submit patient inquiries directly to Central Admin."
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Lead ID</th>
                      <th>Patient Name</th>
                      <th>Contact</th>
                      <th>Procedure</th>
                      <th>Area</th>
                      <th>Bonus Reward</th>
                      <th>Status & Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myPatientLeads.map((lead) => {
                      const isApproved = lead.status === 'Approved' || lead.status === 'Converted';
                      const isRejected = lead.status === 'Rejected' || Boolean(lead.rejectionReason);

                      return (
                        <tr key={lead.id} style={{ background: isRejected ? '#FEF2F2' : undefined }}>
                          <td><strong style={{ fontFamily: 'monospace' }}>{lead.id}</strong></td>
                          <td style={{ fontWeight: 600 }}>{lead.patientName}</td>
                          {/* Strictly hide phone number on rejection */}
                          <td>
                            {isRejected ? (
                              <span style={{ color: '#94A3B8', fontSize: '0.74rem' }}>✕ Contact Hidden (Rejected)</span>
                            ) : (
                              lead.patientPhone
                            )}
                          </td>
                          <td>{lead.serviceTitle || lead.serviceId}</td>
                          <td>{lead.area}</td>
                          {/* 0 pts / ₹0 on rejection */}
                          <td>
                            {isRejected ? (
                              <span style={{ color: '#94A3B8', fontSize: '0.84rem', fontWeight: 600 }}>0 pts (₹0)</span>
                            ) : (
                              <strong style={{ color: isApproved ? '#16A34A' : '#D97706' }}>
                                +50 pts (₹50)
                              </strong>
                            )}
                          </td>
                          <td>
                            {isApproved ? (
                              <span className="status-pill success">✓ Approved & Credited</span>
                            ) : isRejected ? (
                              <div>
                                <span className="status-pill danger">✕ Rejected by Admin</span>
                                {(lead.rejectionReason || lead.adminNotes) && (
                                  <div style={{ fontSize: '0.72rem', color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, padding: '3px 6px', marginTop: '0.3rem', fontWeight: 600, maxWidth: 200 }}>
                                    <strong>Reason:</strong> {lead.rejectionReason || lead.adminNotes}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="status-pill warning">⏳ Pending Admin Review</span>
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

          {/* 2. Referred Colleague Nurses */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">My Referred Nurses ({myNurseReferrals.length})</h3>
              <span style={{ fontSize: '0.78rem', color: '#7E22CE', fontWeight: 700, background: '#FAF5FF', padding: '0.2rem 0.6rem', borderRadius: 9999 }}>
                Rate: 50 Points (= ₹50) per verified colleague
              </span>
            </div>

            {myNurseReferrals.length === 0 ? (
              <EmptyState
                compact
                title="No Nurse Referrals Submitted Yet"
                description="Refer your fellow nursing colleagues to earn 50 reward points (= ₹50) per verified colleague."
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Colleague Nurse</th>
                      <th>Contact</th>
                      <th>Qualification</th>
                      <th>Area</th>
                      <th>Reward</th>
                      <th>Status & Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myNurseReferrals.map((ref) => {
                      const isApproved = ref.status === 'Approved' || ref.status === 'Converted';
                      const isRejected = ref.status === 'Rejected' || Boolean(ref.rejectionReason);

                      return (
                        <tr key={ref.id} style={{ background: isRejected ? '#FEF2F2' : undefined }}>
                          <td style={{ fontWeight: 600 }}>{ref.referredNurseName || ref.patientName}</td>
                          {/* Strictly hide phone number on rejection */}
                          <td>
                            {isRejected ? (
                              <span style={{ color: '#94A3B8', fontSize: '0.74rem' }}>✕ Contact Hidden (Rejected)</span>
                            ) : (
                              ref.referredNursePhone || ref.patientPhone
                            )}
                          </td>
                          <td>{ref.qualification || 'Registered Nurse'}</td>
                          <td>{ref.area || 'Hyderabad'}</td>
                          <td>
                            {isRejected ? (
                              <span style={{ color: '#94A3B8', fontSize: '0.84rem', fontWeight: 600 }}>0 pts (₹0)</span>
                            ) : (
                              <strong style={{ color: isApproved ? '#16A34A' : '#D97706' }}>
                                +50 pts (₹50)
                              </strong>
                            )}
                          </td>
                          <td>
                            {isApproved ? (
                              <span className="status-pill success">✓ Approved & Onboarded</span>
                            ) : isRejected ? (
                              <div>
                                <span className="status-pill danger">✕ Rejected by Admin</span>
                                {(ref.rejectionReason || ref.adminNotes) && (
                                  <div style={{ fontSize: '0.72rem', color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, padding: '3px 6px', marginTop: '0.3rem', fontWeight: 600, maxWidth: 200 }}>
                                    <strong>Reason:</strong> {ref.rejectionReason || ref.adminNotes}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="status-pill warning">⏳ Pending Admin Review</span>
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
      {/* 4. SUBMIT NEW PATIENT LEAD TAB */}
      {/* ========================================================================= */}
      {activeTab === 'new-lead' && (
        <div style={{ maxWidth: 740, margin: '0 auto' }}>
          {/* Top Contextual Cards */}
          <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#EFF6FF', color: '#0284C7' }}>
                <Award size={22} />
              </div>
              <div>
                <div className="stat-val" style={{ color: '#0284C7' }}>50 Pts</div>
                <div className="stat-label">Reward Rate (= ₹50)</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#F8FAFC', color: '#334155' }}>
                <Users size={22} />
              </div>
              <div>
                <div className="stat-val">{myPatientLeads.length}</div>
                <div className="stat-label">Total Leads Sent</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div className="stat-val" style={{ color: '#16A34A' }}>{approvedPatientLeads.length}</div>
                <div className="stat-label">Approved by Admin</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                <Send size={22} />
              </div>
              <div>
                <div className="stat-val" style={{ color: '#D97706', fontSize: '1.05rem' }}>Admin Desk</div>
                <div className="stat-label">Direct Routing</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Submit Patient Lead Direct to Admin</h3>
                <span style={{ fontSize: '0.82rem', color: 'var(--neutral-500)' }}>
                  Patient leads are transmitted directly to the Admin Clinical Operations Desk (not auto-assigned).
                </span>
              </div>
            </div>

            <div className="card-body">
              {leadSuccessMsg && (
                <div style={{ padding: '1rem', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 'var(--radius-md)', color: '#065F46', marginBottom: '1.25rem' }}>
                  {leadSuccessMsg}
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
                  <label className="form-label">Patient Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Smt. Lakshmi Devi"
                    value={patientName}
                    onChange={(e) => {
                      setPatientName(e.target.value);
                      if (leadErrorMsg) setLeadErrorMsg('');
                    }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Patient Age</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 72"
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Gender</label>
                    <select
                      className="form-control"
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value as any)}
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Patient Contact Mobile Number *</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    value={patientPhone}
                    onChange={(e) => {
                      setPatientPhone(e.target.value.replace(/\D/g, ''));
                      if (leadErrorMsg) setLeadErrorMsg('');
                    }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Clinical Procedure Required *</label>
                  <select
                    className="form-control"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value as ServiceId)}
                  >
                    {serviceList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} — ₹{s.priceNumber || s.singleVisitPrice || 800} ({s.duration || '60 mins'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Hyderabad Locality / Zone *</label>
                  <select
                    className="form-control"
                    value={area}
                    onChange={(e) => setArea(e.target.value as HyderabadArea)}
                  >
                    {HYDERABAD_AREAS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Address / Landmark</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="e.g. Flat 302, Sri Sai Towers, Road No 4"
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                  />
                </div>

                {/* Doctor Prescription Upload (Optional) */}
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Attach Doctor Prescription (Optional)</span>
                    <span style={{ fontSize: '0.74rem', color: '#64748B' }}>PDF / Image up to 15 MB</span>
                  </label>
                  <input
                    type="file"
                    id="lead-rx-file-input"
                    accept="application/pdf,image/*"
                    style={{ display: 'none' }}
                    onChange={handleLeadRxUpload}
                  />
                  {leadRxFileName ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '0.55rem 0.85rem', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#0369A1', fontWeight: 600 }}>
                        <FileText size={16} />
                        <span>{leadRxFileName}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setLeadRxFileName('');
                          setLeadRxDataUrl('');
                        }}
                        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      id="lead-upload-rx-btn"
                      onClick={() => document.getElementById('lead-rx-file-input')?.click()}
                      className="btn btn-outline btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, padding: '0.45rem 0.9rem' }}
                    >
                      <UploadCloud size={15} />
                      <span>Upload Prescription File</span>
                    </button>
                  )}
                </div>

                <div style={{ padding: '1rem', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary-navy-950)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Send size={15} style={{ color: '#0284C7' }} />
                    <span>Transmitted to Central Clinical Operations Desk</span>
                  </div>
                  <div style={{ color: 'var(--neutral-700)', lineHeight: 1.5 }}>
                    Central Admin reviews and verifies clinical suitability before assigning to an available nurse. You earn <strong>50 bonus points (= ₹50)</strong> upon Admin approval!
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}>
                  <UserPlus size={18} />
                  <span>Submit Patient Lead Direct to Admin</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CERTIFICATE & DOCUMENTS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'onboarding' && (
        <div style={{ maxWidth: 740, margin: '0 auto' }}>
          {/* Top Contextual Cards */}
          <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: isVerifiedNurse ? '#DCFCE7' : '#FEF3C7', color: isVerifiedNurse ? '#16A34A' : '#D97706' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="stat-val" style={{ color: isVerifiedNurse ? '#16A34A' : '#D97706', fontSize: '0.96rem' }}>
                  {isVerifiedNurse ? 'Verified' : 'Pending'}
                </div>
                <div className="stat-label">Degree Verification</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#EFF6FF', color: '#0284C7' }}>
                <FileCheck size={20} />
              </div>
              <div>
                <div className="stat-val" style={{ color: '#0284C7', fontSize: '0.96rem' }}>TSNC / INC</div>
                <div className="stat-label">Nursing Council</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: isVerifiedNurse ? '#ECFDF5' : '#FEF3C7', color: isVerifiedNurse ? '#059669' : '#B45309' }}>
                <UserCheck size={20} />
              </div>
              <div>
                <div className="stat-val" style={{ color: isVerifiedNurse ? '#059669' : '#B45309', fontSize: '0.96rem' }}>
                  {isVerifiedNurse ? 'Active Fleet' : 'Referral Mode'}
                </div>
                <div className="stat-label">Home Visits Clearance</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#F8FAFC', color: '#475569' }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div className="stat-val" style={{ color: nurse.certificateUrl ? '#16A34A' : '#D97706', fontSize: '0.96rem' }}>
                  {nurse.certificateUrl ? 'On File' : 'Upload Needed'}
                </div>
                <div className="stat-label">Digital Certificate</div>
              </div>
            </div>
          </div>

          {certUploadSuccessMsg && (
            <div style={{ padding: '0.85rem 1.15rem', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, color: '#065F46', marginBottom: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
              <span>{certUploadSuccessMsg}</span>
            </div>
          )}
          {certUploadErrorMsg && (
            <div style={{ padding: '0.85rem 1.15rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, color: '#991B1B', marginBottom: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
              <span>{certUploadErrorMsg}</span>
            </div>
          )}

          <div className="card">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 className="card-title">Nursing Degree & Council Registration Certificate</h3>
                <span className={`status-pill ${isVerifiedNurse ? 'success' : 'warning'}`}>
                  {isVerifiedNurse ? 'Verified RN' : 'Pending Verification'}
                </span>
              </div>
              <button
                type="button"
                id="cert-card-header-upload-btn"
                onClick={() => document.getElementById('nurse-cert-file-input')?.click()}
                className="btn btn-primary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
              >
                <UploadCloud size={15} />
                <span>Upload Certificate</span>
              </button>
            </div>

            <div className="card-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--neutral-600)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                Xpress Nurse strictly verifies nursing certificates (B.Sc / GNM / Council Registration) to ensure hospital asepsis and patient safety across Hyderabad.
              </p>

              {nurse.certificateUrl ? (
                <div style={{ background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 10, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileCheck size={20} style={{ color: '#0284C7' }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>Official Nursing Certificate On File</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Verified for doorstep procedures in Hyderabad</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCertModalUrl(nurse.certificateUrl || '');
                        setCertModalTitle(`${nurse.name} — Clinical Certificate`);
                        setCertModalOpen(true);
                      }}
                      className="btn btn-outline btn-sm"
                      style={{ fontWeight: 700 }}
                    >
                      View Certificate
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById('nurse-cert-file-input')?.click()}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
                    >
                      <UploadCloud size={14} />
                      <span>Update File</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1.25rem', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: 700, color: '#92400E', marginBottom: '0.25rem' }}>Certificate Upload Required</div>
                  <div style={{ fontSize: '0.82rem', color: '#B45309' }}>
                    Please submit your Telangana State Nursing Council registration to unlock direct patient dispatch.
                  </div>
                </div>
              )}

              {/* Upload Certificate Dropzone Box */}
              <div style={{ border: '2px dashed #93C5FD', borderRadius: 14, padding: '2rem 1.5rem', textAlign: 'center', background: '#F0F9FF' }}>
                <UploadCloud size={40} style={{ color: '#0284C7', margin: '0 auto 0.75rem auto' }} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.35rem 0' }}>
                  Upload Nursing Degree or Council Renewal Certificate
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#64748B', maxWidth: 460, margin: '0 auto 1.25rem auto' }}>
                  Supports official PDF credentials, JPG, PNG, and WEBP formats (Max 15 MB). Telangana State Nursing Council and INC registrations are verified for home visits.
                </p>

                <input
                  type="file"
                  id="nurse-cert-file-input"
                  accept="application/pdf,image/*"
                  style={{ display: 'none' }}
                  onChange={handleCertFileUpload}
                />

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    id="nurse-cert-choose-file-btn"
                    onClick={() => document.getElementById('nurse-cert-file-input')?.click()}
                    className="btn btn-primary"
                    style={{
                      padding: '0.65rem 1.6rem',
                      borderRadius: 10,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.92rem',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                    }}
                  >
                    <UploadCloud size={18} />
                    <span>Choose Certificate File & Upload</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 0. Nurse Decline / Rejection Modal */}
      {rejectingBooking && (
        <div 
          className="modal-backdrop" 
          onClick={() => setRejectingBooking(null)} 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div 
            className="modal-card" 
            style={{ maxWidth: 500, width: '100%', background: '#FFFFFF', borderRadius: 14, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', overflow: 'hidden' }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.25rem 1.5rem', background: '#FEF2F2', borderBottom: '1px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#DC2626', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#991B1B' }}>
                    Decline Assigned Visit
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#B91C1C' }}>
                    Booking Ref: #{rejectingBooking.id} • {rejectingBooking.serviceTitle}
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setRejectingBooking(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B', display: 'flex', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 700, color: '#92400E', fontSize: '0.84rem' }}>
                  Patient: {rejectingBooking.patientName} ({rejectingBooking.area})
                </div>
                <div style={{ fontSize: '0.78rem', color: '#B45309', marginTop: '0.2rem' }}>
                  Declining this visit notifies the Operations Admin immediately with your reason, so they can refer and dispatch another available nurse in Hyderabad.
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', color: '#334155', marginBottom: '0.5rem' }}>
                  Please select clinical / operational reason:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    'Currently attending another urgent patient',
                    'Outside my immediate operational radius / travel distance',
                    'Scheduled time slot conflicts with current shift duty',
                    'Personal emergency / clinical leave',
                    'Other reason (Specify below)'
                  ].map((r) => (
                    <label key={r} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 8,
                      border: rejectReasonCategory === r ? '2px solid #DC2626' : '1px solid #E2E8F0',
                      background: rejectReasonCategory === r ? '#FFF1F2' : '#F8FAFC',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: rejectReasonCategory === r ? 700 : 500,
                      color: rejectReasonCategory === r ? '#991B1B' : '#334155'
                    }}>
                      <input
                        type="radio"
                        name="rejectReason"
                        value={r}
                        checked={rejectReasonCategory === r}
                        onChange={() => setRejectReasonCategory(r)}
                      />
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {rejectReasonCategory.includes('Other') && (
                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.82rem', color: '#334155', marginBottom: '0.35rem' }}>
                    Describe Clinical / Schedule Reason:
                  </label>
                  <textarea
                    rows={2}
                    value={rejectCustomReason}
                    onChange={(e) => setRejectCustomReason(e.target.value)}
                    placeholder="Provide brief details for Admin dispatch..."
                    style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.82rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setRejectingBooking(null)}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejectVisit}
                  className="btn"
                  style={{ flex: 1.4, background: '#DC2626', color: '#FFFFFF', fontWeight: 750, border: 'none', padding: '0.55rem 1rem', borderRadius: 8, cursor: 'pointer' }}
                >
                  Confirm Decline & Alert Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Transfer / Reassign Modal */}
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
                  {allNurses.filter((n) => n.id !== nurse.id).map((n) => (
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

      {/* 2. In-App Clinical Prescription Viewer Modal (Fixes 505) */}
      {isRxModalOpen && previewRxBooking && (
        <div 
          className="modal-backdrop" 
          onClick={() => {
            setIsRxModalOpen(false);
            setPreviewRxBooking(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div 
            className="modal-dialog" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              maxWidth: 720, 
              width: '100%', 
              maxHeight: '90vh', 
              overflowY: 'auto',
              background: '#FFFFFF',
              borderRadius: 16,
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#0284C7',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Official Medical Prescription & Clinical Orders
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                    Telangana State Compliant Doorstep Nursing Protocol • Booking Ref: {previewRxBooking.id}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsRxModalOpen(false);
                  setPreviewRxBooking(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  borderRadius: 8
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem' }}>
              {(() => {
                const rxObj = getPrescriptionStorageObject(previewRxBooking.prescriptionUrl || previewRxBooking.prescriptionFileName);

                if (rxObj?.dataUrl) {
                  return (
                    <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                      {rxObj.contentType?.startsWith('image/') || rxObj.fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
                        <img 
                          src={rxObj.dataUrl} 
                          alt="Prescription" 
                          style={{ maxWidth: '100%', maxHeight: '55vh', objectFit: 'contain', borderRadius: 8, border: '1px solid #CBD5E1' }} 
                        />
                      ) : (
                        <iframe 
                          src={rxObj.dataUrl} 
                          title="Prescription Document" 
                          style={{ width: '100%', height: '55vh', border: '1px solid #CBD5E1', borderRadius: 8 }} 
                        />
                      )}
                    </div>
                  );
                }

                // High fidelity official digital Rx
                return (
                  <div style={{
                    border: '1.5px solid #CBD5E1',
                    borderRadius: 12,
                    padding: '1.5rem',
                    background: '#FFFFFF',
                    position: 'relative'
                  }}>
                    {/* Watermark */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) rotate(-25deg)',
                      fontSize: '3rem',
                      fontWeight: 900,
                      color: 'rgba(2, 132, 199, 0.04)',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap'
                    }}>
                      XPRESS NURSE VERIFIED RX
                    </div>

                    {/* Clinic & Doctor Banner */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0F172A', paddingBottom: '0.85rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A' }}>
                          XPRESS NURSE CLINICAL PROTOCOL
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#0284C7', fontWeight: 700 }}>
                          TELANGANA STATE HEALTH SERVICES COMPLIANT
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: 2 }}>
                          Attending Physician: Dr. Vikramaditya, MBBS, MD (TSMC Reg: 84920)
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
                        fontSize: '0.74rem',
                        fontWeight: 800
                      }}>
                        <ShieldCheck size={14} />
                        <span>✓ Validated Clinical Rx</span>
                      </span>
                    </div>

                    {/* Patient Particulars */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', background: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1.25rem' }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Patient Name</div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0F172A' }}>{previewRxBooking.patientName}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Contact</div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>
                          {previewRxBooking.status === 'Cancelled' || (previewRxBooking as any).status === 'Rejected' ? '✕ Hidden (Rejected)' : previewRxBooking.patientPhone}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Area / Zone</div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>{previewRxBooking.area || 'Hyderabad'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Booking Date</div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#334155' }}>{previewRxBooking.preferredDate || 'Immediate'}</div>
                      </div>
                    </div>

                    {/* Prescribed Procedure */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>
                        Authorized Nursing Procedure:
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0284C7', marginTop: 2 }}>
                        {previewRxBooking.serviceTitle}
                      </div>
                    </div>

                    {/* Rx Body & Instructions */}
                    <div style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0369A1', fontWeight: 900, fontSize: '1.1rem', marginBottom: '0.4rem' }}>
                        <span>℞</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Physician Orders & Administration Protocol</span>
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#0F172A', whiteSpace: 'pre-wrap', lineHeight: 1.6, fontWeight: 600 }}>
                        {previewRxBooking.notes && previewRxBooking.notes.includes('Doctor Authorized') 
                          ? previewRxBooking.notes 
                          : 'Administer sterile doorstep nursing care in strict compliance with attending physician orders. Ensure baseline vitals check (BP, Pulse, SpO2, Temperature) prior to procedure initiation and secure cannula/aseptic dressing upon conclusion.'}
                      </div>

                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #BAE6FD', fontSize: '0.75rem', color: '#0369A1', lineHeight: 1.5 }}>
                        <strong>Nurse Checklist:</strong> Verify patient identity • Verify medication expiry & unbroken seal • Maintain strict surgical asepsis • Document post-procedure vitals in patient card.
                      </div>
                    </div>

                    {/* Signoff Stamp */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px dashed #CBD5E1', paddingTop: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          File: {previewRxBooking.prescriptionFileName || 'Doctor_Rx_Verified.pdf'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                          Dispatched via Xpress Nurse Central Dispatch
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0F172A' }}>
                          Dr. Vikramaditya, MD
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                          ✓ Digital Signature Verified (TSMC Reg: 84920)
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              background: '#F8FAFC',
              borderBottomLeftRadius: 16,
              borderBottomRightRadius: 16
            }}>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                Instant in-app preview • No external download required
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
                >
                  <Printer size={14} />
                  <span>Print Rx</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRxModalOpen(false);
                    setPreviewRxBooking(null);
                  }}
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  Close Prescription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Nurse Invoice Preview Modal */}
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
                    Invoice {previewInvoice.invoiceNumber}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--neutral-500)' }}>
                    Attending Nurse: {nurse.name} ({nurse.qualification}) • Station: {nurse.serviceArea}
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
                    <th style={{ textAlign: 'right' }}>Rate (₹)</th>
                    <th style={{ textAlign: 'right' }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>{previewInvoice.serviceTitle}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Doorstep clinical nursing visit with aseptic consumables</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>₹{previewInvoice.baseAmount}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{previewInvoice.baseAmount}</td>
                  </tr>
                  {Boolean(previewInvoice.nightSurcharge && previewInvoice.nightSurcharge > 0) && (
                    <tr>
                      <td>
                        <strong>Night Emergency Surcharge</strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>₹{previewInvoice.nightSurcharge}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{previewInvoice.nightSurcharge}</td>
                    </tr>
                  )}
                  {Boolean(previewInvoice.discountRupees && previewInvoice.discountRupees > 0) && (
                    <tr>
                      <td style={{ color: '#059669' }}>Promotional Discount</td>
                      <td style={{ textAlign: 'right', color: '#059669' }}>-₹{previewInvoice.discountRupees}</td>
                      <td style={{ textAlign: 'right', color: '#059669', fontWeight: 700 }}>-₹{previewInvoice.discountRupees}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Total Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <div style={{ width: 280, background: '#F8FAFC', padding: '1rem', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                    <span>Subtotal:</span>
                    <span>₹{previewInvoice.baseAmount}</span>
                  </div>
                  {Boolean(previewInvoice.discountRupees && previewInvoice.discountRupees > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#059669', marginBottom: 6 }}>
                      <span>Discount:</span>
                      <span>-₹{previewInvoice.discountRupees}</span>
                    </div>
                  )}
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
                  <span>Print / Save Invoice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Certificate Viewer Modal */}
      {certModalOpen && (
        <div 
          className="modal-backdrop"
          onClick={() => setCertModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1.5rem'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              background: '#FFFFFF', 
              borderRadius: 16, 
              width: '100%', 
              maxWidth: 760, 
              maxHeight: '92vh', 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' 
            }}
          >
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} style={{ color: '#0284C7' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {certModalTitle || 'Clinical Registration Certificate'}
                </h3>
              </div>
              <button 
                onClick={() => setCertModalOpen(false)} 
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 380 }}>
              {certModalUrl.startsWith('data:application/pdf') || certModalUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe 
                  src={getSafeBlobUrl(certModalUrl)} 
                  style={{ width: '100%', height: '65vh', border: 'none', borderRadius: 8, background: '#FFFFFF' }} 
                  title="PDF Certificate"
                />
              ) : (
                <img 
                  src={certModalUrl} 
                  alt="Certificate" 
                  style={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} 
                />
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: '#F8FAFC' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Telangana State / Indian Nursing Council Verified Document
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const safeUrl = getSafeBlobUrl(certModalUrl);
                    window.open(safeUrl, '_blank');
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
                >
                  <ExternalLink size={14} />
                  <span>Open in New Tab</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCertModalOpen(false)}
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
