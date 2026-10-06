import React, { useState, useEffect, useMemo } from 'react';
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
  Phone,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Share2,
  Copy,
  Check,
  User,
  Users,
  Award,
  FileText,
  Receipt,
  Printer,
  Navigation,
  MessageCircle,
  UploadCloud,
  Eye,
  X,
  ArrowRight,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Coins,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  PhoneCall
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { EmptyState } from './EmptyState';
import {
  generateInvoiceDetails,
  openPrintableInvoiceWindow,
  saveInvoiceToCloudflareBucket,
  cleanPatientFacingNotes,
  getPrescriptionStorageObject,
  uploadCertificateToCloudflareBucket
} from '../lib/cloudflareStorage';
import { generateNurseReferralCode } from '../lib/supabase';
import { calculateNurseMetrics, deduplicateBookings, deduplicateLeads } from '../lib/nurseCalculations';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

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
  'Gachibowli',
  'LB Nagar',
  'Madhapur',
  'Banjara Hills',
  'Jubilee Hills',
  'Kukatpally',
  'Kondapur',
  'Hitec City',
  'Secunderabad',
  'Ameerpet',
  'Begumpet',
  'Dilsukhnagar',
  'Miyapur',
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
  onRefreshData?: () => Promise<void> | void;
}

export const NurseDashboard: React.FC<NurseDashboardProps> = ({
  currentNurse,
  allNurses,
  onSelectNurse,
  bookings: rawBookings = [],
  leads: rawLeads = [],
  services = [],
  onAddNewLead,
  onUpdateNurse,
  onReassignBooking,
  onUpdateBooking,
  onRefreshData
}) => {
  const bookings = useMemo(() => deduplicateBookings(rawBookings), [rawBookings]);
  const leads = useMemo(() => deduplicateLeads(rawLeads), [rawLeads]);
  const serviceList: ServiceItem[] = services;
  const liveNurse = (allNurses && currentNurse)
    ? (allNurses.find((n) => n.id === currentNurse.id || (n.phone && currentNurse.phone && n.phone.replace(/\D/g, '') === currentNurse.phone.replace(/\D/g, ''))) || currentNurse)
    : (currentNurse || (allNurses && allNurses.length > 0 ? allNurses[0] : null));

  const nurse: NurseProfile = (liveNurse as NurseProfile) || {
    id: 'nurse-primary',
    name: 'Staff Nurse',
    phone: '9849012345',
    email: 'nurse@xpressnurse.in',
    experienceYears: 5,
    qualification: 'B.Sc Nursing (Registered RN)',
    serviceArea: 'Gachibowli',
    status: 'Active',
    totalLeads: 0,
    convertedLeads: 0,
    totalReferrals: 0,
    pointsEarned: 0,
    referralEarningsRupees: 0,
    rating: 5.0,
    certificateVerified: true
  };

  // Ultra-simple 5 tabs with easy English words
  const [activeTab, setActiveTab] = useState<'home' | 'visits' | 'add-patient' | 'my-money' | 'profile'>('home');

  // New Patient Form
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'Female' | 'Male' | 'Other'>('Female');
  const [serviceId, setServiceId] = useState<ServiceId>('saline-infusion');
  const [otherServiceName, setOtherServiceName] = useState('');
  const [area, setArea] = useState<HyderabadArea>(nurse.serviceArea || 'Gachibowli');
  const [fullAddress, setFullAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [leadSuccessMsg, setLeadSuccessMsg] = useState('');
  const [leadErrorMsg, setLeadErrorMsg] = useState('');
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);

  // Modals
  const [previewRxBooking, setPreviewRxBooking] = useState<Booking | null>(null);
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceDetails | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certUploadSuccess, setCertUploadSuccess] = useState('');
  const [certUploading, setCertUploading] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'duty' | 'referral' | 'pending' | 'points'>('all');

  // Lock body scroll and pause Lenis momentum scroll while any modal is open
  useBodyScrollLock(isHistoryModalOpen || isRxModalOpen || isInvoiceModalOpen || certModalOpen);

  // Profile Name & Experience Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedName, setEditedName] = useState(nurse.name);
  const [editedExp, setEditedExp] = useState(String(nurse.experienceYears || 4));
  const [editedServiceArea, setEditedServiceArea] = useState(nurse.serviceArea || 'Gachibowli');
  const [profileUpdateMsg, setProfileUpdateMsg] = useState('');

  // Keep editedName and editedExp in sync with external nurse updates when not in edit mode
  useEffect(() => {
    if (!isEditingProfile) {
      setEditedName(nurse.name);
      setEditedExp(String(nurse.experienceYears || 4));
      setEditedServiceArea(nurse.serviceArea || 'Gachibowli');
    }
  }, [nurse.name, nurse.experienceYears, isEditingProfile]);

  // Referral Link Copy
  const [copiedCode, setCopiedCode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Centralized calculations engine ensuring 100% sync with Admin Dashboard
  const metrics = calculateNurseMetrics(nurse, bookings, leads, services);
  const {
    myVisits,
    activeVisits,
    completedVisits,
    pendingApprovalVisits,
    pendingApprovalVisitsCount,
    pendingApprovalVisitsEarnings,
    completedVisitsEarnings,
    myLeads,
    myConvertedLeads,
    myPatientLeads,
    myConvertedPatientLeads,
    patientLeadsCount,
    patientConvertedCount,
    myNurseLeads,
    myConvertedNurseLeads,
    nurseLeadsCount,
    nurseConvertedCount,
    completedReferredVisits,
    referralEarnings: calculatedMoney,
    totalMoney,
    totalPoints,
    referralCode
  } = metrics;

  interface TransactionLedgerItem {
    id: string;
    category: 'duty' | 'pending' | 'referral' | 'points';
    title: string;
    description: string;
    date: string;
    amount?: number;
    points?: number;
    status: 'Settled' | 'Pending Approval' | 'Credited';
    bookingId?: string;
  }

  const transactions: TransactionLedgerItem[] = useMemo(() => {
    const list: TransactionLedgerItem[] = [];

    // 1. Completed Duty Visits (70%)
    completedVisits.forEach((v) => {
      const fee = Number(v.finalFee !== undefined ? v.finalFee : (v.estimatedFee || 899));
      const payout = v.nursePayoutRupees || Math.round(fee * 0.70);
      list.push({
        id: `TX-DUTY-${v.id}`,
        category: 'duty',
        title: `Clinical Care: ${v.serviceTitle}`,
        description: `Patient: ${v.patientName} (${v.area || 'Hyderabad'}) • Doorstep Care Completed`,
        date: v.preferredDate || (v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-IN') : 'Recent'),
        amount: payout,
        status: 'Settled',
        bookingId: v.id
      });
    });

    // 2. Pending Approval Duty Visits (70%)
    pendingApprovalVisits.forEach((v) => {
      const fee = Number(v.finalFee !== undefined ? v.finalFee : (v.estimatedFee || 899));
      const payout = Math.round(fee * 0.70);
      list.push({
        id: `TX-PEND-${v.id}`,
        category: 'pending',
        title: `Duty Finished: ${v.serviceTitle}`,
        description: `Patient: ${v.patientName} • Service Done, Awaiting Admin Verification`,
        date: v.preferredDate || (v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-IN') : 'Today'),
        amount: payout,
        status: 'Pending Approval',
        bookingId: v.id
      });
    });

    // 3. Completed Patient Referrals (10% Cash)
    completedReferredVisits.forEach((v) => {
      const fee = Number(v.finalFee !== undefined ? v.finalFee : (v.estimatedFee || 899));
      const commission = Math.round(fee * 0.10);
      list.push({
        id: `TX-REF-${v.id}`,
        category: 'referral',
        title: `10% Referral Commission: ${v.serviceTitle}`,
        description: `Referred Patient: ${v.patientName} • Care Completed & Billed`,
        date: v.preferredDate || (v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-IN') : 'Recent'),
        amount: commission,
        status: 'Settled',
        bookingId: v.id
      });
    });

    // 4. Converted Leads (50 Reward Points each)
    myConvertedLeads.forEach((lead) => {
      const isNurse = lead.referralType === 'nurse' || Boolean(lead.referredNurseName) || Boolean(lead.qualification);
      list.push({
        id: `TX-PTS-${lead.id}`,
        category: 'points',
        title: isNurse ? `Colleague Nurse Referral: ${lead.referredNurseName || lead.patientName || 'Nurse'}` : `Patient Referral Converted: ${lead.patientName || 'Patient'}`,
        description: isNurse ? `Verified & Active on Staff Roster (+50 Points)` : `Appointment Booked & Converted (+50 Points)`,
        date: lead.submittedAt ? new Date(lead.submittedAt).toLocaleDateString('en-IN') : 'Recent',
        points: lead.pointsAwarded || 50,
        status: 'Credited'
      });
    });

    return list;
  }, [completedVisits, pendingApprovalVisits, completedReferredVisits, myConvertedLeads]);

  const filteredTransactions = useMemo(() => {
    if (historyFilter === 'all') return transactions;
    return transactions.filter((tx) => tx.category === historyFilter);
  }, [transactions, historyFilter]);

  const handleSync = async () => {
    if (onRefreshData) {
      setIsRefreshing(true);
      try {
        await onRefreshData();
      } finally {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  // Handlers
  const handleAcceptVisit = async (booking: Booking) => {
    if (onUpdateBooking) {
      await onUpdateBooking(booking.id, {
        status: 'In-Progress',
        nurseAcceptanceStatus: 'Accepted'
      });
      if (onRefreshData) {
        try {
          await onRefreshData();
        } catch { }
      }
      try {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      } catch { }
    }
  };

  const handleRejectVisit = async (booking: Booking) => {
    if (onUpdateBooking) {
      const inputReason = window.prompt(
        "Please state reason for declining this visit (e.g. Distance too far, Already on duty, Emergency, Schedule conflict):",
        "Nurse unavailable / Distance issue"
      );
      if (inputReason !== null) {
        const finalReason = inputReason.trim() ? inputReason.trim() : "Rejected by Nurse via App";
        await onUpdateBooking(booking.id, {
          nurseAcceptanceStatus: 'Rejected',
          status: 'Rejected',
          rejectedBy: 'Nurse',
          rejectionReason: finalReason
        });
        if (onRefreshData) {
          try {
            await onRefreshData();
          } catch { }
        }
      }
    }
  };

  const handleFinishVisit = async (booking: Booking) => {
    if (onUpdateBooking) {
      const procedure = services.find(s => s.id === booking.serviceId);
      const fee = Number(booking.finalFee !== undefined ? booking.finalFee : (booking.estimatedFee || (procedure ? procedure.priceNumber : 899)));
      const payoutRupees = Math.round(fee * 0.70);

      const notesPrefix = booking.notes ? `${booking.notes} | ` : '';
      await onUpdateBooking(booking.id, {
        status: 'In-Progress',
        nurseAcceptanceStatus: 'Service Done',
        nursePayoutRupees: payoutRupees,
        notes: `${notesPrefix}[Service Done by Nurse - Waiting for Admin Approval]`
      });
      if (onRefreshData) {
        try {
          await onRefreshData();
        } catch { }
      }
      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 } });
      } catch { }
      alert(`Duty Finished! Service marked as done and sent for Admin Approval. Your ₹${payoutRupees} duty earnings will be credited once verified by office.`);
    }
  };

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Namaste! I am ${nurse.name} from Xpress Nurse Hyderabad. Book certified home nursing services (IV saline, wound dressing, injection, doctor consult) at home. Use my code *${referralCode}* for special care: https://xpressnurse.in/?ref=${referralCode} or Call/WhatsApp: +917569657371`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleSavePatient = (e: React.FormEvent) => {
    e.preventDefault();
    setLeadErrorMsg('');
    setLeadSuccessMsg('');

    if (!patientName.trim()) {
      setLeadErrorMsg('Please write patient name.');
      return;
    }
    const cleanPhone = patientPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setLeadErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (serviceId === 'other' && !otherServiceName.trim()) {
      setLeadErrorMsg('Please specify the nursing service needed.');
      return;
    }

    const procedure = services.find(s => s.id === serviceId);
    const procFee = serviceId === 'other' ? 800 : (procedure?.priceNumber || 800);
    const finalServiceTitle = serviceId === 'other'
      ? (otherServiceName.trim() || 'Other Nursing Service')
      : (procedure?.title || 'Nursing Service');

    const formattedNotes = [
      serviceId === 'other' ? `Service Needed: ${otherServiceName.trim()}` : '',
      notes.trim()
    ].filter(Boolean).join(' • ') || `Added by ${nurse.name}`;

    const newLead: NurseLead = {
      id: `LD-${Math.floor(1000 + Math.random() * 9000)}`,
      nurseId: nurse.id,
      patientName: patientName.trim(),
      patientPhone: cleanPhone,
      patientAge: patientAge ? parseInt(patientAge, 10) : undefined,
      patientGender,
      serviceId,
      serviceTitle: finalServiceTitle,
      leadValueRupees: procFee,
      area,
      fullAddress: fullAddress.trim(),
      notes: formattedNotes,
      status: 'Pending Approval',
      submittedAt: new Date().toISOString()
    };

    onAddNewLead(newLead);
    setIsSubmittingLead(false);
    setLeadSuccessMsg(`✓ Patient ${patientName} added! You will receive 50 Reward Points + 10% commission (₹${Math.round(procFee * 0.10)}) after Admin approval.`);
    setPatientName('');
    setPatientPhone('');
    setPatientAge('');
    setFullAddress('');
    setNotes('');
    setOtherServiceName('');

    try {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 } });
    } catch { }
  };

  const handleViewInvoice = (booking: Booking) => {
    const inv = generateInvoiceDetails(booking);
    setPreviewInvoice(inv);
    setIsInvoiceModalOpen(true);
  };

  return (
    <div style={{ background: '#F8FAFC', minHeight: '90vh', padding: '1rem 0 3rem' }}>
      <div className="container" style={{ maxWidth: 960 }}>

        {/* ================================================================= */}
        {/* 1. TOP NURSE PROFILE BAR (Clean, Friendly, Simple) */}
        {/* ================================================================= */}
        <div className="nurse-profile-header-card" style={{
          background: '#FFFFFF',
          borderRadius: 16,
          padding: '1.25rem 1.5rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284C7, #0369A1)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.3rem',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)'
            }}>
              {nurse.name ? nurse.name.replace('Nurse ', '').charAt(0) : 'N'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                  {nurse.name}
                </h2>
                {nurse.certificateVerified ? (
                  <span style={{
                    background: '#DCFCE7',
                    color: '#15803D',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <CheckCircle2 size={12} /> Verified RN
                  </span>
                ) : (
                  <span style={{
                    background: '#FEF3C7',
                    color: '#B45309',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 9999
                  }}>
                    Pending Approval
                  </span>
                )}
              </div>
              <div style={{
                fontSize: '0.82rem',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                columnGap: '0.45rem',
                rowGap: '0.2rem',
                marginTop: '0.25rem'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', whiteSpace: 'nowrap' }}>
                  <MapPin size={13} style={{ color: '#0284C7' }} />
                  {nurse.serviceArea || 'Hyderabad'}
                </span>
                <span style={{ color: '#CBD5E1' }}>•</span>
                <span style={{ whiteSpace: 'nowrap' }}>{nurse.qualification || 'Registered Nurse'}</span>
                <span style={{ color: '#CBD5E1' }}>•</span>
                <span style={{ whiteSpace: 'nowrap' }}>{nurse.phone}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="nurse-top-stats">
            <div className="nurse-top-stat-box" style={{
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              padding: '0.45rem 0.9rem',
              borderRadius: 12,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#065F46', fontWeight: 600 }}>My Points</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#059669' }}>⭐ {totalPoints}</div>
            </div>
            <div className="nurse-top-stat-box" style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              padding: '0.45rem 0.9rem',
              borderRadius: 12,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#1E40AF', fontWeight: 600 }}>Active Visits</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1D4ED8' }}>{activeVisits.length}</div>
            </div>
            <a
              href="https://wa.me/917569657371"
              className="btn btn-outline nurse-top-stat-box"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.45rem 0.9rem',
                borderRadius: 12,
                border: '1px solid #CBD5E1',
                color: '#0F172A',
                textDecoration: 'none',
                background: '#F8FAFC',
                gap: '0.1rem'
              }}
              title="Call XpressNurse Helpline"
            >
              <PhoneCall size={18} style={{ color: '#E11D48' }} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>Helpline</span>
            </a>
            {onRefreshData && (
              <button
                type="button"
                onClick={handleSync}
                disabled={isRefreshing}
                className="btn btn-outline nurse-top-stat-box"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0.45rem 0.9rem',
                  borderRadius: 12,
                  border: '1px solid #CBD5E1',
                  color: '#0284C7',
                  background: '#F0F9FF',
                  cursor: isRefreshing ? 'wait' : 'pointer',
                  gap: '0.1rem'
                }}
                title="Sync with live database"
              >
                <RefreshCw size={18} className={isRefreshing ? 'spin' : ''} style={{ color: '#0284C7' }} />
                <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
              </button>
            )}
          </div>

        </div>

        {/* ================================================================= */}
        {/* 2. NAVIGATION BAR (Big, Easy Words - No Hard English) */}
        {/* ================================================================= */}
        <div className="nurse-nav-tabs-bar">
          {[
            { id: 'home', icon: '🏠', label: 'Home', badge: null },
            { id: 'visits', icon: '🚗', label: 'Visits', badge: activeVisits.length > 0 ? activeVisits.length : null },
            { id: 'add-patient', icon: '➕', label: 'Add Patient', badge: '+50' },
            { id: 'my-money', icon: '💰', label: 'Earnings', badge: null },
            { id: 'profile', icon: '👤', label: 'Profile', badge: null }
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className="nurse-nav-tab-btn"
                style={{
                  background: isSelected ? '#0284C7' : 'transparent',
                  color: isSelected ? '#FFFFFF' : '#475569',
                  fontWeight: isSelected ? 800 : 600
                }}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-title">{tab.label}</span>
                {tab.badge !== null && (
                  <span style={{
                    background: isSelected ? '#FFFFFF' : '#EF4444',
                    color: isSelected ? '#0284C7' : '#FFFFFF',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: 9999,
                    lineHeight: 1
                  }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* TAB 1: 🏠 HOME (Easiest Summary & Big Buttons) */}
        {/* ================================================================= */}
        {activeTab === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Friendly Greeting Card */}
            <div style={{
              background: 'linear-gradient(135deg, #0A192F 0%, #1E3A5F 100%)',
              color: '#FFFFFF',
              borderRadius: 18,
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF' }}>
                  Namaste, {nurse.name.replace('Nurse ', '')}! 👋
                </h3>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', color: '#CBD5E1' }}>
                  {activeVisits.length > 0
                    ? `You have ${activeVisits.length} patient visit waiting. Please check your visits.`
                    : pendingApprovalVisitsCount > 0
                      ? `You have ${pendingApprovalVisitsCount} visit completed — awaiting admin approval for earnings.`
                      : 'No pending visits right now. You can add a patient or share your code to earn cash!'}
                </p>
              </div>

              <div className="nurse-hero-btns" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('add-patient')}
                  className="btn"
                  style={{
                    background: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '0.6rem 1rem',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={16} />
                  <span>Add Patient (+50 Pts)</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="btn"
                  style={{
                    background: '#25D366',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '0.6rem 1rem',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer'
                  }}
                >
                  <MessageCircle size={16} />
                  <span>Share on WhatsApp</span>
                </button>
              </div>
            </div>

            {/* 3 Big Action Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>

              {/* Card 1: Visits */}
              <div
                onClick={() => setActiveTab('visits')}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  padding: '1.25rem',
                  border: '1.5px solid #E2E8F0',
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Active Duties</span>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0F172A', margin: '0.4rem 0' }}>
                  {activeVisits.length}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#0284C7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>Open My Visits</span>
                  <ChevronRight size={14} />
                </div>
              </div>

              {/* Card 2: Patients Referred */}
              <div
                onClick={() => setActiveTab('my-money')}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  padding: '1.25rem',
                  border: '1.5px solid #E2E8F0',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>My Patients</span>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0F172A', margin: '0.4rem 0' }}>
                  {patientLeadsCount}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>{patientConvertedCount} Approved & Converted</span>
                  <ChevronRight size={14} />
                </div>
              </div>

              {/* Card 2b: Colleague Nurses Referred (Shown if nurse has referred any colleague nurses) */}
              {nurseLeadsCount > 0 && (
                <div
                  onClick={() => setActiveTab('my-money')}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: 16,
                    padding: '1.25rem',
                    border: '1.5px solid #E2E8F0',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Colleague Nurses</span>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FAF5FF', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={18} />
                    </div>
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0F172A', margin: '0.4rem 0' }}>
                    {nurseLeadsCount}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#9333EA', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>{nurseConvertedCount} Approved (+50 Pts)</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              )}

              {/* Card 3: Money */}
              <div
                onClick={() => setActiveTab('my-money')}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  padding: '1.25rem',
                  border: '1.5px solid #E2E8F0',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>Total Earnings</span>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Coins size={18} />
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#059669', margin: '0.4rem 0' }}>
                  ₹{totalMoney}
                </div>
                {pendingApprovalVisitsEarnings > 0 ? (
                  <div style={{ fontSize: '0.78rem', color: '#D97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>+₹{pendingApprovalVisitsEarnings} waiting admin approval</span>
                    <ChevronRight size={14} />
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>70% Duty + 10% Referrals</span>
                    <ChevronRight size={14} />
                  </div>
                )}
              </div>
            </div>

            {/* If there are active visits, show the next visit right away */}
            {activeVisits.length > 0 && (
              <div style={{
                background: '#FFFFFF',
                borderRadius: 16,
                padding: '1.25rem',
                border: '1.5px solid #0284C7',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    🔔 Next Patient Visit
                  </span>
                  <span style={{ background: '#EFF6FF', color: '#0284C7', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 9999, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>📅 {activeVisits[0].preferredDate || (activeVisits[0].createdAt ? new Date(activeVisits[0].createdAt).toLocaleDateString('en-IN') : 'Today')}</span>
                    <span>•</span>
                    <span>⏰ {activeVisits[0].scheduledSlot || activeVisits[0].preferredTime || 'Immediate'}</span>
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                      {activeVisits[0].patientName} ({activeVisits[0].patientAge || 45} yrs, {activeVisits[0].patientGender || 'Patient'})
                    </h4>
                    <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 600, marginTop: '0.2rem' }}>
                      Service: <strong style={{ color: '#0284C7' }}>{activeVisits[0].serviceTitle}</strong>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
                      <MapPin size={14} style={{ color: '#EF4444' }} />
                      <span>{activeVisits[0].fullAddress || activeVisits[0].area}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <a
                      href={`tel:${activeVisits[0].patientPhone}`}
                      className="btn"
                      style={{
                        background: '#EFF6FF',
                        color: '#0284C7',
                        border: '1px solid #BFDBFE',
                        borderRadius: 8,
                        padding: '0.45rem 0.8rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        textDecoration: 'none'
                      }}
                    >
                      <Phone size={13} /> Call
                    </a>
                    <a
                      href={`https://wa.me/91${activeVisits[0].patientPhone.replace(/\D/g, '').slice(-10)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn"
                      style={{
                        background: '#F0FDF4',
                        color: '#16A34A',
                        border: '1px solid #BBF7D0',
                        borderRadius: 8,
                        padding: '0.45rem 0.8rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        textDecoration: 'none'
                      }}
                    >
                      <MessageCircle size={13} /> WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() => handleViewInvoice(activeVisits[0])}
                      style={{
                        background: activeVisits[0].invoiceUrl ? '#F0F9FF' : '#F8FAFC',
                        border: activeVisits[0].invoiceUrl ? '1px solid #BAE6FD' : '1px solid #CBD5E1',
                        color: activeVisits[0].invoiceUrl ? '#0284C7' : '#0F172A',
                        borderRadius: 8,
                        padding: '0.45rem 0.8rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <Receipt size={13} style={{ color: activeVisits[0].invoiceUrl ? '#0284C7' : undefined }} />
                      <span>Doorstep Bill {activeVisits[0].invoiceNumber ? `(#${activeVisits[0].invoiceNumber.replace('XN-INV-2026-', '')})` : ''}</span>
                    </button>
                    {activeVisits[0].invoiceUrl && (
                      <a
                        href={activeVisits[0].invoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn"
                        style={{
                          background: '#ECFDF5',
                          border: '1px solid #A7F3D0',
                          color: '#059669',
                          borderRadius: 8,
                          padding: '0.45rem 0.7rem',
                          fontSize: '0.8rem',
                          fontWeight: 750,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <ExternalLink size={13} />
                        <span>Live Bill</span>
                      </a>
                    )}
                    {activeVisits[0].status === 'Assigned' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleAcceptVisit(activeVisits[0])}
                          style={{
                            background: '#16A34A',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 8,
                            padding: '0.45rem 0.9rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          ✓ Accept Job
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectVisit(activeVisits[0])}
                          style={{
                            background: 'transparent',
                            color: '#EF4444',
                            border: '1px solid #EF4444',
                            borderRadius: 8,
                            padding: '0.45rem 0.9rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          ✕ Reject
                        </button>
                      </>
                    )}
                    {activeVisits[0].status === 'In-Progress' && (
                      <button
                        type="button"
                        onClick={() => handleFinishVisit(activeVisits[0])}
                        style={{
                          background: '#059669',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 8,
                          padding: '0.45rem 0.9rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Finish & Bill
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* If there are visits waiting admin approval and no active visits */}
            {activeVisits.length === 0 && pendingApprovalVisitsCount > 0 && (
              <div style={{
                background: '#FFFBEB',
                borderRadius: 16,
                padding: '1.25rem',
                border: '1.5px solid #F59E0B',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={16} style={{ color: '#D97706' }} /> Service Done — Waiting for Admin Approval
                  </span>
                  <span style={{ background: '#FEF3C7', color: '#B45309', fontSize: '0.78rem', fontWeight: 800, padding: '3px 10px', borderRadius: 9999, border: '1px solid #FDE68A' }}>
                    ₹{pendingApprovalVisitsEarnings} Pending Verification ({pendingApprovalVisitsCount} visit{pendingApprovalVisitsCount > 1 ? 's' : ''})
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.86rem', color: '#78350F' }}>
                  You have finished <strong>{pendingApprovalVisitsCount} visit(s)</strong>. The office admin will verify and accept the service, after which your 70% earnings will be directly added to your balance.
                </p>
                <div style={{ marginTop: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab('visits')}
                    style={{
                      background: '#D97706',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '0.45rem 1rem',
                      borderRadius: 8,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    View Finished Visits
                  </button>
                </div>
              </div>
            )}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: '1.25rem',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Your Personal Code</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A', letterSpacing: 1 }}>
                  {referralCode}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#16A34A', marginTop: '0.2rem' }}>
                  Get 50 Reward Points every time a patient books with this code!
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: 10,
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  {copiedCode ? <Check size={14} style={{ color: '#16A34A' }} /> : <Copy size={14} />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  style={{
                    background: '#25D366',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 10,
                    padding: '0.5rem 0.95rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <MessageCircle size={14} />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: 🚗 MY VISITS (Dead Simple List with Call, Map & Finish) */}
        {/* ================================================================= */}
        {activeTab === 'visits' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                  My Patient Visits ({myVisits.length})
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.84rem', color: '#64748B' }}>
                  Jobs assigned to you by the office. Accept, start, and complete duty.
                </p>
              </div>
            </div>

            {myVisits.length === 0 ? (
              <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '3rem 1.5rem', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <EmptyState
                  title="No visits assigned yet"
                  description="When patients near your area book care, the office will assign them here. You will see their address and phone."
                  actionText="Add a Patient Referral"
                  onAction={() => setActiveTab('add-patient')}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {myVisits.map((visit) => {
                  const isDone = visit.status === 'Completed';
                  const isWaitingApproval = !isDone && (visit.nurseAcceptanceStatus === 'Service Done' || Boolean(visit.notes && visit.notes.includes('Waiting for Admin Approval')));
                  const isInProgress = visit.status === 'In-Progress' && !isWaitingApproval;
                  const isRejected = visit.status === 'Rejected' || visit.status === 'Cancelled' || Boolean(visit.rejectionReason);
                  const isAssigned = !isRejected && !isWaitingApproval && (visit.status === 'Assigned' || visit.status === 'Pending');

                  return (
                    <div
                      key={visit.id}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: 16,
                        border: isRejected ? '1.5px solid #FECDD3' : (isWaitingApproval ? '1.5px solid #F59E0B' : isInProgress ? '2px solid #0284C7' : isDone ? '1px solid #DCFCE7' : '1px solid #E2E8F0'),
                        padding: '1.25rem',
                        boxShadow: isInProgress ? '0 4px 12px rgba(2, 132, 199, 0.08)' : (isWaitingApproval ? '0 4px 12px rgba(245, 158, 11, 0.08)' : 'none'),
                        position: 'relative'
                      }}
                    >
                      {/* Status Tag */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: 9999,
                          background: isRejected ? '#FEE2E2' : (isWaitingApproval ? '#FEF3C7' : isInProgress ? '#EFF6FF' : isDone ? '#F0FDF4' : '#FFFBEB'),
                          color: isRejected ? '#DC2626' : (isWaitingApproval ? '#92400E' : isInProgress ? '#0284C7' : isDone ? '#16A34A' : '#D97706'),
                          border: `1px solid ${isRejected ? '#FCA5A5' : (isWaitingApproval ? '#FDE68A' : isInProgress ? '#BFDBFE' : isDone ? '#BBF7D0' : '#FDE68A')}`
                        }}>
                          {isRejected
                            ? `✕ ${visit.status === 'Cancelled' ? 'Duty Cancelled' : 'Duty / Patient Rejected'}`
                            : (isWaitingApproval ? '⏳ Service Done — Waiting for Admin Approval' : isInProgress ? '⚡ Duty in Progress' : isDone ? '✓ Visit Completed' : '🔔 New Assignment')}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                          ID: {visit.id}
                        </span>
                      </div>

                      {/* Patient & Service details */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                            {visit.patientName} {visit.patientAge ? `(${visit.patientAge} yrs, ${visit.patientGender})` : ''}
                          </h4>
                          <div style={{ fontSize: '0.92rem', color: '#0F172A', fontWeight: 700, marginTop: '0.25rem' }}>
                            Service: <span style={{ color: '#0284C7' }}>{visit.serviceTitle}</span> (₹{visit.finalFee !== undefined ? visit.finalFee : (visit.estimatedFee || 899)})
                            {visit.promoCode && (
                              <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700, marginLeft: '0.5rem', background: '#ECFDF5', padding: '2px 6px', borderRadius: 4, display: 'inline-block', border: '1px solid #A7F3D0' }}>
                                🎉 {visit.promoCode} (-₹{visit.discountRupees})
                              </span>
                            )}
                          </div>
                          <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '0.76rem',
                              fontWeight: 800,
                              background: isRejected ? '#F1F5F9' : '#ECFDF5',
                              color: isRejected ? '#64748B' : '#059669',
                              border: `1px solid ${isRejected ? '#CBD5E1' : '#A7F3D0'}`,
                              padding: '2px 8px',
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}>
                              <span>💰 Your 70% Payout:</span>
                              <strong style={{ fontSize: '0.84rem' }}>
                                {isRejected ? '₹0' : `₹${Math.round(Number(visit.finalFee !== undefined ? visit.finalFee : (visit.estimatedFee || 899)) * 0.70)}`}
                              </strong>
                              <span style={{ fontSize: '0.68rem', color: isRejected ? '#64748B' : (isWaitingApproval ? '#B45309' : '#047857'), fontWeight: 600 }}>
                                {isRejected ? '(Cancelled/Rejected)' : (isWaitingApproval ? '(⏳ Waiting Admin Approval)' : (isDone ? 'Credited to earnings' : 'Credited after admin approval'))}
                              </span>
                            </span>
                          </div>
                          <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <MapPin size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
                            <span><strong>Address:</strong> {visit.fullAddress || visit.area || 'Hyderabad'}</span>
                          </div>
                          {(visit.scheduledSlot || visit.preferredTime) && (
                            <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Clock size={13} style={{ color: '#0284C7', flexShrink: 0 }} />
                              <span>Scheduled: 📅 {visit.preferredDate || (visit.createdAt ? new Date(visit.createdAt).toLocaleDateString('en-IN') : 'Today')} | ⏰ {visit.scheduledSlot || visit.preferredTime || 'Immediate'}</span>
                            </div>
                          )}
                          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                            Received: {visit.createdAt ? new Date(visit.createdAt).toLocaleString() : 'Unknown'}
                          </div>

                          {/* Rejection Reason Alert if rejected/cancelled */}
                          {isRejected && (
                            <div style={{
                              marginTop: '0.5rem',
                              background: '#FEF2F2',
                              border: '1px solid #FECDD3',
                              borderRadius: 8,
                              padding: '0.45rem 0.8rem',
                              fontSize: '0.8rem',
                              color: '#991B1B',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem'
                            }}>
                              <AlertCircle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
                              <span><strong>Reason:</strong> {visit.rejectionReason || (visit.notes && visit.notes.includes('Rejection:') ? visit.notes.split('Rejection:')[1]?.trim() : (visit.notes && visit.notes.includes('[Referral rejected') ? visit.notes : 'Patient cancelled or visit rejected by office'))}</span>
                            </div>
                          )}
                        </div>

                        {/* Direct Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <a
                            href={`tel:${visit.patientPhone}`}
                            style={{
                              background: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              color: '#0F172A',
                              padding: '0.45rem 0.75rem',
                              borderRadius: 8,
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <Phone size={13} style={{ color: '#0284C7' }} />
                            <span>Call</span>
                          </a>

                          <a
                            href={`https://wa.me/91${visit.patientPhone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Namaste ${visit.patientName}, I am ${nurse.name} from Xpress Nurse for your scheduled ${visit.serviceTitle} visit.`)}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              background: '#F0FDF4',
                              border: '1px solid #BBF7D0',
                              color: '#16A34A',
                              padding: '0.45rem 0.75rem',
                              borderRadius: 8,
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <MessageCircle size={13} />
                            <span>WhatsApp</span>
                          </a>

                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((visit.fullAddress || visit.area || 'Hyderabad') + ', Hyderabad')}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              background: '#FFFBEB',
                              border: '1px solid #FDE68A',
                              color: '#B45309',
                              padding: '0.45rem 0.75rem',
                              borderRadius: 8,
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <Navigation size={13} />
                            <span>Map</span>
                          </a>
                        </div>
                      </div>

                      {/* Bottom Duty Action Bar */}
                      <div style={{
                        marginTop: '0.9rem',
                        paddingTop: '0.75rem',
                        borderTop: '1px solid #F1F5F9',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {visit.hasPrescription && (
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewRxBooking(visit);
                                setIsRxModalOpen(true);
                              }}
                              style={{
                                background: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                color: '#0284C7',
                                padding: '0.35rem 0.7rem',
                                borderRadius: 6,
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <FileText size={12} />
                              <span>View Doctor Note / Rx</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleViewInvoice(visit)}
                            title={visit.invoiceUrl ? `View Synced Doorstep Bill (${visit.invoiceNumber || 'Official'})` : 'View Doorstep Bill'}
                            style={{
                              background: visit.invoiceUrl ? '#F0F9FF' : '#F8FAFC',
                              border: visit.invoiceUrl ? '1px solid #BAE6FD' : '1px solid #E2E8F0',
                              color: visit.invoiceUrl ? '#0284C7' : '#475569',
                              padding: '0.35rem 0.7rem',
                              borderRadius: 6,
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Receipt size={12} style={{ color: visit.invoiceUrl ? '#0284C7' : undefined }} />
                            <span>Doorstep Bill {visit.invoiceNumber ? `(#${visit.invoiceNumber.replace('XN-INV-2026-', '')})` : ''}</span>
                          </button>
                          {visit.invoiceUrl && (
                            <a
                              href={visit.invoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Open Official Synced Bill on Cloudflare R2"
                              style={{
                                background: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                color: '#059669',
                                padding: '0.35rem 0.6rem',
                                borderRadius: 6,
                                fontSize: '0.74rem',
                                fontWeight: 750,
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem'
                              }}
                            >
                              <ExternalLink size={12} />
                              <span>Live Bill</span>
                            </a>
                          )}
                        </div>

                        {/* State Change Buttons */}
                        <div>
                          {isAssigned && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAcceptVisit(visit)}
                                style={{
                                  background: '#16A34A',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  padding: '0.5rem 1.1rem',
                                  borderRadius: 8,
                                  fontSize: '0.84rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem'
                                }}
                              >
                                <CheckCircle2 size={15} />
                                <span>Accept Job</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectVisit(visit)}
                                style={{
                                  background: 'transparent',
                                  color: '#EF4444',
                                  border: '1px solid #EF4444',
                                  padding: '0.5rem 1.1rem',
                                  borderRadius: 8,
                                  fontSize: '0.84rem',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  marginLeft: '0.5rem'
                                }}
                              >
                                ✕ Reject
                              </button>
                            </>
                          )}

                          {isInProgress && (
                            <button
                              type="button"
                              onClick={() => handleFinishVisit(visit)}
                              style={{
                                background: '#059669',
                                color: '#FFFFFF',
                                border: 'none',
                                padding: '0.5rem 1.25rem',
                                borderRadius: 8,
                                fontSize: '0.84rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                boxShadow: '0 4px 10px rgba(5, 150, 105, 0.25)'
                              }}
                            >
                              <CheckCircle2 size={15} />
                              <span>Finish Duty (Care Done)</span>
                            </button>
                          )}

                          {isWaitingApproval && (
                            <span style={{
                              fontSize: '0.82rem',
                              color: '#92400E',
                              fontWeight: 800,
                              background: '#FEF3C7',
                              border: '1px solid #FDE68A',
                              padding: '5px 12px',
                              borderRadius: 8,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}>
                              <Clock size={15} style={{ color: '#D97706' }} />
                              <span>⏳ Service Done — Waiting for Admin Approval (+₹{Math.round(Number(visit.finalFee !== undefined ? visit.finalFee : (visit.estimatedFee || 899)) * 0.70)} pending)</span>
                            </span>
                          )}

                          {isDone && (
                            <span style={{ fontSize: '0.82rem', color: '#16A34A', fontWeight: 800, background: '#DCFCE7', padding: '4px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle2 size={14} />
                              <span>✓ Finished & Billed (+₹{Math.round(Number(visit.finalFee !== undefined ? visit.finalFee : (visit.estimatedFee || 899)) * 0.70)} Earned)</span>
                            </span>
                          )}

                          {isRejected && (
                            <span style={{ fontSize: '0.82rem', color: '#DC2626', fontWeight: 800, background: '#FEE2E2', padding: '4px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span>✕ Duty Cancelled / Closed</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: ➕ ADD PATIENT (Easiest Patient Referral Form) */}
        {/* ================================================================= */}
        {activeTab === 'add-patient' && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '1.75rem',
            border: '1px solid #E2E8F0',
            maxWidth: 640,
            margin: '0 auto',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#ECFDF5',
                color: '#059669',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.5rem'
              }}>
                <Plus size={24} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                Refer a Patient & Get 50 Points
              </h3>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.88rem', color: '#64748B' }}>
                Enter your patient's details below. Our care desk will call them, assign care, and credit 50 points to you.
              </p>
            </div>

            {leadSuccessMsg && (
              <div style={{
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                padding: '0.85rem 1rem',
                borderRadius: 10,
                fontSize: '0.88rem',
                fontWeight: 600,
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
                <span>{leadSuccessMsg}</span>
              </div>
            )}

            {leadErrorMsg && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECDD3',
                color: '#991B1B',
                padding: '0.85rem 1rem',
                borderRadius: 10,
                fontSize: '0.88rem',
                fontWeight: 600,
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
                <span>{leadErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePatient} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Patient Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Smt. Lakshmi Devi"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', height: 42, borderRadius: 8, fontSize: '0.9rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Patient Mobile Number *
                </label>
                <input
                  type="tel"
                  placeholder="10-digit mobile number e.g. 9848012345"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', height: 42, borderRadius: 8, fontSize: '0.9rem' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Age (Years)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 55"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="form-control"
                    style={{ width: '100%', height: 42, borderRadius: 8, fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Gender
                  </label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value as any)}
                    className="form-control"
                    style={{ width: '100%', height: 42, borderRadius: 8, fontSize: '0.9rem' }}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Which Nursing Service Needed? *
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value as ServiceId)}
                  className="form-control"
                  style={{ width: '100%', height: 42, borderRadius: 8, fontSize: '0.9rem', fontWeight: 600 }}
                >
                  <option value="saline-infusion">IV Saline / Antibiotic Infusion (₹899)</option>
                  <option value="wound-dressing">Wound Dressing (₹799)</option>
                  <option value="foleys-catheter">Foley's Catheter Replacement (₹1299)</option>
                  <option value="ryles-tube">Ryles / Food Tube Change (₹1299)</option>
                  <option value="suture-removal">Suture / Staple Removal (₹999)</option>
                  <option value="injection-administration">Injection & Vitals (₹699)</option>
                  <option value="doctor-consult">Doctor Video Consultation (₹299)</option>
                  <option value="vitals-monitoring">General Health Check (₹699)</option>
                  <option value="other">Other Nursing Service / Custom Care</option>
                </select>
              </div>

              {serviceId === 'other' && (
                <div style={{ animation: 'fadeIn 0.2s ease-in-out' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#0369A1', marginBottom: '0.3rem' }}>
                    Specify Nursing Service Needed *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nebulization, Bed bath, Tracheostomy dressing, Chemo port flush..."
                    value={otherServiceName}
                    onChange={(e) => setOtherServiceName(e.target.value)}
                    className="form-control"
                    style={{ width: '100%', height: 42, borderRadius: 8, fontSize: '0.9rem', borderColor: '#38BDF8', backgroundColor: '#F0F9FF' }}
                    required={serviceId === 'other'}
                  />
                  <span style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.25rem', display: 'block' }}>
                    Please enter the specific nursing procedure needed so Admin can evaluate and assign the right nurse.
                  </span>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Patient Locality / Area in Hyderabad *
                </label>
                <input list="hyderabad-areas" placeholder="Select or enter area"
                  value={area}
                  onChange={(e) => setArea(e.target.value as HyderabadArea)}
                  className="form-control"
                  style={{ width: '100%', height: 42, borderRadius: 8, fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Full House Address / Landmark (Optional)
                </label>
                <textarea
                  placeholder="e.g. Flat 302, Sai Residency, Near Metro Pillar 110"
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  className="form-control"
                  rows={2}
                  style={{ width: '100%', borderRadius: 8, fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Nurse Notes (What is patient's problem?)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Post surgery, fever, catheter blocked"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', height: 42, borderRadius: 8, fontSize: '0.85rem' }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingLead}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: 46,
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  background: '#16A34A',
                  borderColor: '#16A34A',
                  marginTop: '0.5rem'
                }}
              >
                <Plus size={18} />
                <span>Save Patient & Get 50 Points</span>
              </button>
            </form>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: 💰 MY MONEY & REFERRALS (Clean, Motivating, Transparent) */}
        {/* ================================================================= */}
        {activeTab === 'my-money' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Big Money Card */}
            <div style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#FFFFFF',
              borderRadius: 18,
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#D1FAE5', fontWeight: 600 }}>Total Rupee Earnings (Percentage)</div>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FFFFFF', margin: '0.2rem 0' }}>
                  ₹{totalMoney}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                  <span style={{ fontSize: '0.76rem', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 6, color: '#FFFFFF', fontWeight: 700 }}>
                    💰 ₹{completedVisitsEarnings} from {completedVisits.length} Finished Visits (70%)
                  </span>
                  <span style={{ fontSize: '0.76rem', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 6, color: '#FFFFFF', fontWeight: 700 }}>
                    👥 ₹{calculatedMoney} from {completedReferredVisits.length} Finished Patient Referrals (10%)
                  </span>
                  {pendingApprovalVisitsEarnings > 0 && (
                    <span style={{ fontSize: '0.76rem', background: '#FEF3C7', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: 6, color: '#92400E', fontWeight: 800 }}>
                      ⏳ ₹{pendingApprovalVisitsEarnings} from {pendingApprovalVisitsCount} Visits (Pending Admin Approval)
                    </span>
                  )}
                </div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                borderRadius: 14,
                padding: '1rem 1.25rem',
                border: '1px solid rgba(255,255,255,0.25)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#D1FAE5', textTransform: 'uppercase', letterSpacing: 0.5 }}>Your Code</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#FFFFFF', margin: '0.2rem 0', letterSpacing: 1 }}>
                  {referralCode}
                </div>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  style={{
                    background: '#25D366',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '0.35rem 0.8rem',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    marginTop: '0.3rem'
                  }}
                >
                  <MessageCircle size={13} />
                  <span>Share on WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Separate Points Card */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: '1.25rem 1.5rem',
              border: '1.5px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Reward Points
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#059669', margin: '0.2rem 0' }}>
                  ⭐ {totalPoints} Points
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Earned through referrals (+50 pts each)
                </div>
              </div>
              <div style={{
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: 12,
                padding: '0.6rem 1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.72rem', color: '#065F46', fontWeight: 700 }}>Total Converted Leads</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#059669' }}>{myConvertedLeads.length}</div>
              </div>
            </div>


            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="btn"
              style={{
                width: '100%',
                background: '#FFFFFF',
                border: '1.5px solid #CBD5E1',
                color: '#0F172A',
                fontWeight: 750,
                padding: '0.85rem 1.1rem',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <div style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: '#ECFDF5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Clock size={16} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>
                    View Transaction History & Ledger
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                    Detailed statement of 70% duties, 10% referrals & points
                  </div>
                </div>
              </div>
              <span style={{
                background: '#F1F5F9',
                color: '#0284C7',
                border: '1px solid #CBD5E1',
                fontSize: '0.76rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: 9999,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span>{transactions.length} records</span>
                <ChevronRight size={14} />
              </span>
            </button>

            {/* List of Referred Patients */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: '1.25rem',
              border: '1px solid #E2E8F0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                  Patients You Referred ({patientLeadsCount})
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveTab('add-patient')}
                  style={{
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    color: '#059669',
                    padding: '0.35rem 0.8rem',
                    borderRadius: 8,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  + Add More
                </button>
              </div>

              {(() => {
                const patientLeads = myPatientLeads;
                const nurseLeads = myNurseLeads;

                return (
                  <>
                    {/* Patient Referrals */}
                    {patientLeads.length === 0 ? (
                      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748B' }}>
                        <p>You have not added any patients yet. Click "Add Patient" to start earning 50 points per patient!</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {patientLeads.map((lead) => {
                          const lPhone = (lead.patientPhone || '').replace(/\D/g, '').slice(-10);
                          const lName = (lead.patientName || '').toLowerCase().trim();
                          const cleanLeadDigits = lead.id.replace(/\D/g, '') || lead.id.slice(-6);

                          const matchingCompleted = completedReferredVisits.find((b) => {
                            if (b.id === `BK-${cleanLeadDigits.slice(-6)}` || b.id === `BK-${cleanLeadDigits.slice(-4)}`) return true;
                            const bPhone = (b.patientPhone || '').replace(/\D/g, '').slice(-10);
                            if (lPhone && bPhone && lPhone === bPhone && lPhone.length >= 10) return true;
                            const bName = (b.patientName || '').toLowerCase().trim();
                            if (lName && bName && lName === bName) return true;
                            return false;
                          });

                          const matchingBooking = bookings.find((b) => {
                            if (b.id === `BK-${cleanLeadDigits.slice(-6)}` || b.id === `BK-${cleanLeadDigits.slice(-4)}`) return true;
                            const bPhone = (b.patientPhone || '').replace(/\D/g, '').slice(-10);
                            if (lPhone && bPhone && lPhone === bPhone && lPhone.length >= 10) return true;
                            const bName = (b.patientName || '').toLowerCase().trim();
                            if (lName && bName && lName === bName) return true;
                            return false;
                          });

                          const isRejected = lead.status === 'Rejected' || matchingBooking?.status === 'Rejected' || matchingBooking?.status === 'Cancelled' || Boolean(lead.rejectionReason);
                          const isFullyCompleted = !isRejected && Boolean(matchingCompleted);
                          const isApprovedAwaitingVisit = !isRejected && !isFullyCompleted && (matchingBooking?.status === 'Assigned' || matchingBooking?.status === 'In-Progress');

                          const procedure = services.find(s => s.id === (matchingCompleted?.serviceId || matchingBooking?.serviceId || lead.serviceId));
                          const baseFee = Number(matchingCompleted?.finalFee !== undefined && matchingCompleted?.finalFee !== null
                            ? matchingCompleted.finalFee
                            : (matchingCompleted?.estimatedFee || matchingBooking?.finalFee || matchingBooking?.estimatedFee || (procedure ? procedure.priceNumber : 800)));
                          const earned10 = Math.round(baseFee * 0.10);

                          return (
                            <div
                              key={lead.id}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '0.85rem 1rem',
                                borderRadius: 10,
                                background: isRejected ? '#FEF2F2' : (isFullyCompleted ? '#F0FDF4' : (isApprovedAwaitingVisit ? '#FFFDF5' : '#F8FAFC')),
                                border: `1px solid ${isRejected ? '#FECDD3' : (isFullyCompleted ? '#BBF7D0' : (isApprovedAwaitingVisit ? '#FDE68A' : '#E2E8F0'))}`,
                                gap: '0.4rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isRejected ? '#991B1B' : '#0F172A' }}>
                                    {lead.patientName}
                                  </div>
                                  <div style={{ fontSize: '0.78rem', color: isRejected ? '#7F1D1D' : '#64748B', marginTop: '2px' }}>
                                    {lead.patientPhone} • {lead.area} • {lead.serviceId || 'Nursing Care'}
                                  </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '3px 8px',
                                    borderRadius: 9999,
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    background: isRejected ? '#FEE2E2' : (isFullyCompleted ? '#DCFCE7' : (isApprovedAwaitingVisit ? '#FEF3C7' : '#F1F5F9')),
                                    color: isRejected ? '#DC2626' : (isFullyCompleted ? '#15803D' : (isApprovedAwaitingVisit ? '#B45309' : '#475569'))
                                  }}>
                                    {isRejected
                                      ? '✕ Referral Rejected'
                                      : (isFullyCompleted
                                        ? `✓ Visit Done (+50 Pts, +₹${earned10})`
                                        : (isApprovedAwaitingVisit ? '⏳ Allotted • Visit in Progress' : '⏳ Office Review • Pending Visit'))}
                                  </span>
                                  {isRejected ? (
                                    <div style={{ fontSize: '0.72rem', color: '#DC2626', fontWeight: 700, marginTop: '2px' }}>
                                      0 Pts • No Commission
                                    </div>
                                  ) : isFullyCompleted ? (
                                    <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                                      +50 Pts & ₹{earned10} (10% Fee) Credited
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: 600, marginTop: '2px' }}>
                                      50 pts + ₹{earned10} (10%) credited after visit
                                    </div>
                                  )}
                                </div>
                              </div>

                              {isRejected && (
                                <div style={{
                                  background: '#FFF1F2',
                                  border: '1px dashed #FDA4AF',
                                  borderRadius: 8,
                                  padding: '0.5rem 0.75rem',
                                  fontSize: '0.78rem',
                                  color: '#9F1239',
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '0.45rem',
                                  marginTop: '0.2rem'
                                }}>
                                  <AlertCircle size={15} style={{ marginTop: '1px', flexShrink: 0, color: '#E11D48' }} />
                                  <div>
                                    <span style={{ fontWeight: 800 }}>Rejection Reason: </span>
                                    <span>{lead.rejectionReason || lead.adminNotes || 'Patient cancelled, unserviceable location, or rejected during office review'}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Colleague Nurses You Referred */}
                    {nurseLeads.length > 0 && (
                      <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px dashed #CBD5E1' }}>
                        <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#334155' }}>
                          Colleague Nurses You Referred ({nurseLeads.length})
                        </h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {nurseLeads.map((nurseLead) => {
                            const isNurseRejected = nurseLead.status === 'Rejected' || Boolean(nurseLead.rejectionReason);
                            const isNurseActive = !isNurseRejected && (nurseLead.status === 'Approved' || nurseLead.status === 'Converted');

                            return (
                              <div
                                key={nurseLead.id}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  padding: '0.8rem 1rem',
                                  borderRadius: 10,
                                  background: isNurseRejected ? '#FEF2F2' : (isNurseActive ? '#F0FDF4' : '#F8FAFC'),
                                  border: `1px solid ${isNurseRejected ? '#FECDD3' : (isNurseActive ? '#BBF7D0' : '#E2E8F0')}`,
                                  gap: '0.35rem'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                                  <div>
                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isNurseRejected ? '#991B1B' : '#0F172A' }}>
                                      {nurseLead.referredNurseName || nurseLead.nurseName || 'Colleague Nurse'}
                                    </div>
                                    <div style={{ fontSize: '0.76rem', color: isNurseRejected ? '#7F1D1D' : '#64748B', marginTop: '1px' }}>
                                      {nurseLead.referredNursePhone || nurseLead.patientPhone || 'No Phone'} • {nurseLead.area || 'Hyderabad'}
                                    </div>
                                  </div>

                                  <div style={{ textAlign: 'right' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '3px 8px',
                                      borderRadius: 9999,
                                      fontSize: '0.72rem',
                                      fontWeight: 800,
                                      background: isNurseRejected ? '#FEE2E2' : (isNurseActive ? '#DCFCE7' : '#FEF3C7'),
                                      color: isNurseRejected ? '#DC2626' : (isNurseActive ? '#15803D' : '#B45309')
                                    }}>
                                      {isNurseRejected
                                        ? '✕ Verification Rejected'
                                        : (isNurseActive ? '✓ Verified & Onboarded' : '⏳ Verification Pending')}
                                    </span>
                                  </div>
                                </div>

                                {isNurseRejected && (
                                  <div style={{
                                    background: '#FFF1F2',
                                    border: '1px dashed #FDA4AF',
                                    borderRadius: 8,
                                    padding: '0.45rem 0.7rem',
                                    fontSize: '0.76rem',
                                    color: '#9F1239',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.4rem',
                                    marginTop: '0.2rem'
                                  }}>
                                    <AlertCircle size={14} style={{ marginTop: '1px', flexShrink: 0, color: '#E11D48' }} />
                                    <div>
                                      <span style={{ fontWeight: 800 }}>Rejection Reason: </span>
                                      <span>{nurseLead.rejectionReason || nurseLead.adminNotes || 'Credentials or registration review not accepted'}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 5: 👤 MY PROFILE (Name, Certificate, Experience) */}
        {/* ================================================================= */}
        {activeTab === 'profile' && (
          <div style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '1.75rem',
            border: '1px solid #E2E8F0',
            maxWidth: 640,
            margin: '0 auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>
                My Nurse Profile
              </h3>
              {!isEditingProfile && (
                <button
                  type="button"
                  onClick={() => {
                    setEditedName(nurse.name);
                    setEditedExp(String(nurse.experienceYears || 4));
                    setEditedServiceArea(nurse.serviceArea || 'Gachibowli');
                    setIsEditingProfile(true);
                  }}
                  className="btn btn-outline"
                  style={{
                    borderRadius: 8,
                    padding: '0.35rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderColor: '#0284C7',
                    color: '#0284C7',
                    background: '#F0F9FF',
                    cursor: 'pointer'
                  }}
                >
                  Edit Name & Experience
                </button>
              )}
            </div>

            {profileUpdateMsg && (
              <div style={{
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                padding: '0.65rem 1rem',
                borderRadius: 8,
                fontSize: '0.85rem',
                fontWeight: 700,
                marginBottom: '1rem'
              }}>
                {profileUpdateMsg}
              </div>
            )}

            {isEditingProfile ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!editedName.trim()) return;
                  onUpdateNurse({
                    ...nurse,
                    name: editedName.trim(),
                    experienceYears: Number(editedExp) || 4,
                    serviceArea: editedServiceArea.trim() || nurse.serviceArea
                  });
                  setIsEditingProfile(false);
                  setProfileUpdateMsg('✓ Profile name and experience updated successfully!');
                  setTimeout(() => setProfileUpdateMsg(''), 4000);
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
              >
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.92rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                    Service Area in Hyderabad *
                  </label>
                  <input
                    list="hyderabad-areas"
                    required
                    placeholder="e.g. Madhapur"
                    value={editedServiceArea}
                    onChange={(e) => setEditedServiceArea(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.92rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                    Clinical Experience (Years) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    required
                    value={editedExp}
                    onChange={(e) => setEditedExp(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.85rem',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.92rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ borderRadius: 8, padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700 }}
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="btn btn-outline"
                    style={{ borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: 10 }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>Full Name</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>{nurse.name}</span>
                </div>

                <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: 10 }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>Mobile Number (Login ID)</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>{nurse.phone}</span>
                </div>

                <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: 10 }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>Service Area in Hyderabad</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>{nurse.serviceArea || 'Gachibowli'}</span>
                </div>

                <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: 10 }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>Qualification</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>{nurse.qualification || 'B.Sc Nursing (Registered RN)'}</span>
                </div>

                <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: 10 }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>Experience</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>{nurse.experienceYears || 4} Years in Clinical Care</span>
                </div>

                <div style={{ padding: '0.75rem', background: '#F8FAFC', borderRadius: 10 }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>Government Nursing Certificate</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: nurse.certificateVerified ? '#15803D' : '#B45309'
                    }}>
                      {nurse.certificateVerified ? '✓ Verified by Admin' : '⏳ Pending Admin Verification'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCertModalOpen(true)}
                      style={{
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        color: '#0284C7',
                        padding: '0.3rem 0.75rem',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      View / Upload
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  try {
                    sessionStorage.removeItem('xn_auth_user');
                    sessionStorage.removeItem('xn_auth_user_nurse');
                    localStorage.removeItem('xn_auth_user_nurse');
                    localStorage.removeItem('xn_active_nurse_id');
                    const legacy = localStorage.getItem('xn_auth_user');
                    if (legacy && legacy.includes('"role":"nurse"')) {
                      localStorage.removeItem('xn_auth_user');
                    }
                    window.location.href = '/login?portal=nurse';
                  } catch { }
                }}
                className="btn btn-outline"
                style={{ color: '#EF4444', borderColor: '#FECDD3', borderRadius: 8, fontSize: '0.85rem' }}
              >
                Sign Out of Nurse Dashboard
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ================================================================= */}
      {/* 3. SIMPLE MODALS (Prescription, Invoice & Certificate) */}
      {/* 1. UNIFIED DOCTOR PRESCRIPTION & CLINICAL ORDERS MODAL */}
      {isRxModalOpen && previewRxBooking && (
        <div
          className="modal-overlay"
          data-lenis-prevent="true"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
            backdropFilter: 'blur(4px)',
            overscrollBehavior: 'contain'
          }}
          onClick={() => setIsRxModalOpen(false)}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className="modal-box"
            data-lenis-prevent="true"
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 540,
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              overscrollBehavior: 'contain'
            }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Header - Always Fixed at Top */}
            <div style={{
              padding: '1.2rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              background: '#FAFAFA',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: '#EFF6FF',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                    Doctor's Prescription & Clinical Orders
                  </h4>
                  <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 2 }}>
                    Booking Ref: <strong style={{ color: '#0284C7', fontFamily: 'monospace' }}>{previewRxBooking.id}</strong> • Patient: <strong>{previewRxBooking.patientName}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRxModalOpen(false)}
                title="Close"
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body - Scrollable */}
            <div
              data-lenis-prevent="true"
              style={{
                padding: '1.25rem 1.5rem',
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
                overscrollBehavior: 'contain'
              }}
              onWheel={(e) => e.stopPropagation()}
            >
              {/* Patient & Procedure Summary Box */}
              <div style={{
                background: '#F8FAFC',
                borderRadius: 12,
                padding: '0.9rem 1.1rem',
                border: '1px solid #E2E8F0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Patient Info</div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                      {previewRxBooking.patientName} {previewRxBooking.patientAge ? `(${previewRxBooking.patientAge} yrs, ${previewRxBooking.patientGender || 'Patient'})` : ''}
                    </div>
                    {previewRxBooking.patientPhone && (
                      <div style={{ fontSize: '0.78rem', color: '#0284C7', fontWeight: 600, marginTop: 2 }}>
                        📞 {previewRxBooking.patientPhone}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Prescribed Procedure</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#059669' }}>
                      {previewRxBooking.serviceTitle}
                    </div>
                  </div>
                </div>
              </div>

              {/* Doctor Clinical Orders Box */}
              <div style={{
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: 12,
                padding: '0.9rem 1.1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#D97706', fontFamily: 'serif', lineHeight: 1 }}>℞</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Attending Physician Clinical Orders
                  </span>
                </div>
                <div style={{
                  fontSize: '0.86rem',
                  color: '#78350F',
                  lineHeight: 1.55,
                  background: '#FFFFFF',
                  padding: '0.75rem 0.9rem',
                  borderRadius: 8,
                  border: '1px solid #FDE68A',
                  whiteSpace: 'pre-wrap'
                }}>
                  {previewRxBooking.notes || 'Administer prescribed home nursing care in strict compliance with attending physician orders. Ensure vitals evaluation (BP, Pulse, SpO2, Temperature) prior to procedure initiation and secure cannula/aseptic dressing upon conclusion.'}
                </div>
              </div>

              {/* Attached Prescription Document Preview */}
              {previewRxBooking.prescriptionUrl ? (
                <div style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: '0.85rem',
                  background: '#F8FAFC'
                }}>
                  <div style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>Official Prescription Document</span>
                    {previewRxBooking.prescriptionFileName && (
                      <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500, fontFamily: 'monospace' }}>
                        {previewRxBooking.prescriptionFileName}
                      </span>
                    )}
                  </div>
                  <div style={{
                    textAlign: 'center',
                    background: '#FFFFFF',
                    borderRadius: 8,
                    padding: '0.5rem',
                    border: '1px solid #CBD5E1',
                    maxHeight: 240,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    <img
                      src={previewRxBooking.prescriptionUrl}
                      alt="Prescription"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 220,
                        objectFit: 'contain',
                        borderRadius: 6,
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(previewRxBooking.prescriptionUrl, '_blank')}
                      title="Click to view full size"
                      onError={(e) => {
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div style="padding:1.5rem;color:#64748B;font-size:0.85rem;">Prescription PDF/Document attached. Click button below to open.</div>';
                        }
                      }}
                    />
                  </div>
                  <div style={{ marginTop: '0.65rem', textAlign: 'center' }}>
                    <a
                      href={previewRxBooking.prescriptionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        padding: '0.4rem 0.9rem',
                        borderRadius: 8
                      }}
                    >
                      <ExternalLink size={14} /> Open Full Size / PDF
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '1rem',
                  background: '#F1F5F9',
                  borderRadius: 12,
                  textAlign: 'center',
                  fontSize: '0.82rem',
                  color: '#64748B',
                  border: '1px dashed #CBD5E1'
                }}>
                  <div style={{ color: '#059669', fontWeight: 800, fontSize: '0.88rem', marginBottom: 2 }}>
                    ✓ Prescription Verified & Approved
                  </div>
                  <div style={{ fontSize: '0.78rem' }}>
                    Authorized teleconsultation order by attending physician.
                    {previewRxBooking.prescriptionFileName && ` File Ref: ${previewRxBooking.prescriptionFileName}`}
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Always Fixed at Bottom */}
            <div style={{
              padding: '0.9rem 1.5rem',
              borderTop: '1px solid #E2E8F0',
              background: '#FAFAFA',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                Xpress Nurse Clinical Care Protocol
              </span>
              <button
                type="button"
                onClick={() => setIsRxModalOpen(false)}
                className="btn btn-primary"
                style={{
                  borderRadius: 8,
                  padding: '0.45rem 1.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. DOORSTEP BILL INVOICE MODAL (Always Visible, Fits All Screens) */}
      {isInvoiceModalOpen && previewInvoice && (
        <div
          className="modal-overlay"
          data-lenis-prevent="true"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
            backdropFilter: 'blur(4px)',
            overscrollBehavior: 'contain'
          }}
          onClick={() => setIsInvoiceModalOpen(false)}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className="modal-box"
            data-lenis-prevent="true"
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 540,
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              overscrollBehavior: 'contain'
            }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed at Top */}
            <div style={{
              padding: '1.2rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              background: '#FAFAFA',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                    Doorstep Bill: {previewInvoice.invoiceNumber}
                  </h4>
                  {previewInvoice.r2PublicUrl && (
                    <span style={{
                      fontSize: '0.7rem',
                      background: '#DCFCE7',
                      color: '#15803D',
                      padding: '2px 7px',
                      borderRadius: 6,
                      fontWeight: 750,
                      border: '1px solid #86EFAC',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3
                    }}>
                      ✓ Live Synced
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 2 }}>
                  Date: {previewInvoice.invoiceDate} • Staff RN: <strong>{previewInvoice.assignedNurseName || nurse.name}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                title="Close"
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body - Scrollable */}
            <div
              data-lenis-prevent="true"
              style={{
                padding: '1.25rem 1.5rem',
                overflowY: 'auto',
                flex: 1,
                overscrollBehavior: 'contain'
              }}
              onWheel={(e) => e.stopPropagation()}
            >
              <div style={{
                background: '#F8FAFC',
                borderRadius: 12,
                padding: '1rem',
                border: '1px solid #E2E8F0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: '#0F172A', fontWeight: 800 }}>
                    {previewInvoice.patientName} {previewInvoice.patientAge ? `(${previewInvoice.patientAge} yrs)` : ''}
                  </span>
                  {previewInvoice.patientPhone && (
                    <span style={{ fontSize: '0.8rem', color: '#0284C7', fontWeight: 700 }}>
                      📞 {previewInvoice.patientPhone}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 3 }}>
                  📍 {previewInvoice.fullAddress || previewInvoice.area}
                </div>

                <div style={{ borderTop: '1px dashed #CBD5E1', margin: '0.75rem 0', paddingTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: '#334155' }}>
                    <span>
                      <strong>{previewInvoice.serviceTitle}</strong>
                      {previewInvoice.serviceDate && (
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748B' }}>
                          Date: {previewInvoice.serviceDate}
                        </span>
                      )}
                      {previewInvoice.timeSlot && (
                        <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748B' }}>
                          Slot: {previewInvoice.timeSlot}
                        </span>
                      )}
                    </span>
                    <strong>₹{previewInvoice.baseAmount * (previewInvoice.numberOfVisits || 1)}</strong>
                  </div>

                  {Boolean(previewInvoice.discountRupees && previewInvoice.discountRupees > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#059669', marginTop: '4px' }}>
                      <span>Coupon / Concession Discount</span>
                      <strong>-₹{previewInvoice.discountRupees}</strong>
                    </div>
                  )}

                  {Boolean(previewInvoice.nightSurcharge && previewInvoice.nightSurcharge > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', color: '#B45309', marginTop: '4px' }}>
                      <span>Night Emergency Surcharge</span>
                      <strong>+₹{previewInvoice.nightSurcharge}</strong>
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1.15rem',
                    fontWeight: 900,
                    color: '#0F172A',
                    marginTop: '0.65rem',
                    paddingTop: '0.65rem',
                    borderTop: '1px solid #E2E8F0'
                  }}>
                    <span>Total Amount Due:</span>
                    <span style={{ color: '#059669' }}>₹{previewInvoice.totalAmount}</span>
                  </div>

                  <div style={{
                    marginTop: '0.45rem',
                    fontSize: '0.78rem',
                    color: '#64748B',
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.35rem'
                  }}>
                    <span>
                      Payment Status:{' '}
                      <strong style={{ color: previewInvoice.paymentStatus === 'Paid' ? '#059669' : '#D97706' }}>
                        {previewInvoice.paymentStatus || 'Pending'}
                      </strong>
                    </span>
                    <span>
                      Nurse 70% Share:{' '}
                      <strong style={{ color: '#0284C7' }}>
                        ₹{Math.round(previewInvoice.totalAmount * 0.70)}
                      </strong>
                    </span>
                  </div>
                </div>

                {previewInvoice.notes && (
                  <div style={{
                    marginTop: '0.65rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px dotted #CBD5E1',
                    fontSize: '0.75rem',
                    color: '#64748B'
                  }}>
                    <strong>Notes:</strong> {previewInvoice.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Fixed at Bottom with Print, Share & Close */}
            <div style={{
              padding: '0.9rem 1.5rem',
              borderTop: '1px solid #E2E8F0',
              background: '#FAFAFA',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => openPrintableInvoiceWindow(previewInvoice)}
                  className="btn btn-outline"
                  title="View formatted bill or print/save as PDF"
                  style={{
                    borderRadius: 8,
                    padding: '0.45rem 0.9rem',
                    fontSize: '0.82rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontWeight: 700,
                    background: '#FFFFFF'
                  }}
                >
                  <Printer size={14} />
                  <span>Print / PDF Bill</span>
                </button>

                {previewInvoice.patientPhone && (
                  <a
                    href={`https://wa.me/91${previewInvoice.patientPhone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Namaste ${previewInvoice.patientName}, here is your official Xpress Nurse Doorstep Bill #${previewInvoice.invoiceNumber} for ${previewInvoice.serviceTitle}: Amount ₹${previewInvoice.totalAmount} (Status: ${previewInvoice.paymentStatus}). Thank you for choosing Xpress Nurse Hyderabad!`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn"
                    title="Send Bill details directly to patient on WhatsApp"
                    style={{
                      borderRadius: 8,
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.82rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#F0FDF4',
                      color: '#16A34A',
                      border: '1px solid #BBF7D0',
                      textDecoration: 'none',
                      fontWeight: 700
                    }}
                  >
                    <MessageCircle size={14} />
                    <span>WhatsApp Bill</span>
                  </a>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="btn btn-primary"
                style={{
                  borderRadius: 8,
                  padding: '0.45rem 1.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {certModalOpen && (
        <div
          className="modal-overlay"
          data-lenis-prevent="true"
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
            overscrollBehavior: 'contain'
          }}
          onClick={() => setCertModalOpen(false)}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className="modal-box"
            data-lenis-prevent="true"
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overscrollBehavior: 'contain'
            }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                Nursing Council Certificate
              </h4>
              <button
                type="button"
                onClick={() => setCertModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: '#F8FAFC', borderRadius: 10, border: '1.5px dashed #CBD5E1', marginBottom: '1rem' }}>
              <Award size={36} style={{ color: '#0284C7', margin: '0 auto 0.5rem' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                {nurse.name}'s Nursing License
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                Status: {nurse.certificateVerified ? '✓ Verified by Admin' : 'Pending Verification'}
              </div>
            </div>
            {nurse.certificateUrl ? (
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <img src={nurse.certificateUrl} alt="Certificate" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #E2E8F0', objectFit: 'contain', maxHeight: '400px' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <div style={{ marginTop: '0.75rem' }}>
                  <a href={nurse.certificateUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.8rem' }}>
                    <ExternalLink size={16} /> Open Full Size / PDF
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#F1F5F9', borderRadius: 10, textAlign: 'center' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem' }}>Upload Certificate (PDF/JPG/PNG)</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  style={{ display: 'block', width: '100%', marginBottom: '0.5rem', fontSize: '0.85rem' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setCertUploading(true);
                    setCertUploadSuccess('');
                    try {
                      const uploaded = await uploadCertificateToCloudflareBucket({ file, nurseId: nurse.id, nurseName: nurse.name });
                      if (onUpdateNurse) {
                        await onUpdateNurse({ ...nurse, certificateUrl: uploaded.publicUrl });
                      }
                      setCertUploadSuccess('Certificate uploaded successfully! Awaiting Admin verification.');
                    } catch (err: any) {
                      alert('Failed to upload: ' + err.message);
                    } finally {
                      setCertUploading(false);
                    }
                  }}
                />
                {certUploading && <div style={{ fontSize: '0.8rem', color: '#0284C7', fontWeight: 600 }}>Uploading...</div>}
                {certUploadSuccess && <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>{certUploadSuccess}</div>}
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setCertModalOpen(false)}
                className="btn btn-primary"
                style={{ borderRadius: 8, padding: '0.45rem 1.25rem', fontSize: '0.82rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. TRANSACTION HISTORY & EARNINGS LEDGER MODAL */}
      {/* ================================================================= */}
      {isHistoryModalOpen && (
        <div
          className="modal-overlay"
          data-lenis-prevent="true"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
            backdropFilter: 'blur(5px)',
            overflowY: 'auto',
            overscrollBehavior: 'contain'
          }}
          onClick={() => setIsHistoryModalOpen(false)}
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            className="modal-box"
            data-lenis-prevent="true"
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 740,
              width: '100%',
              height: '86vh',
              maxHeight: 780,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)',
              overflow: 'hidden',
              margin: 'auto',
              overscrollBehavior: 'contain'
            }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed at Top */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #0A192F 0%, #1E3A5F 100%)',
              color: '#FFFFFF',
              flexShrink: 0
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Coins size={22} style={{ color: '#34D399' }} />
                  <span>Earnings & Transaction Ledger</span>
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#CBD5E1' }}>
                  Official provider ledger for {nurse.name} • 70% Duty Share & 10% Referrals
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content Viewport (Whole Interior Scrolls Smoothly) */}
            <div
              data-lenis-prevent="true"
              style={{
                flex: '1 1 auto',
                minHeight: 0,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                display: 'flex',
                flexDirection: 'column',
                overscrollBehavior: 'contain'
              }}
              onWheel={(e) => e.stopPropagation()}
            >
              {/* Financial Summary Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                padding: '1rem 1.5rem',
                background: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                flexShrink: 0
              }}>
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  padding: '0.75rem 1rem',
                  border: '1.5px solid #A7F3D0',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.06)'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#065F46', fontWeight: 700, textTransform: 'uppercase' }}>
                    Finalized Earnings
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#059669', margin: '0.15rem 0' }}>
                    ₹{totalMoney}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    {completedVisits.length} Duties + {completedReferredVisits.length} Referrals
                  </div>
                </div>

                <div style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  padding: '0.75rem 1rem',
                  border: '1.5px solid #FDE68A',
                  boxShadow: '0 2px 4px rgba(245, 158, 11, 0.06)'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#92400E', fontWeight: 700, textTransform: 'uppercase' }}>
                    Pending Admin Approval
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#D97706', margin: '0.15rem 0' }}>
                    ₹{pendingApprovalVisitsEarnings}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    {pendingApprovalVisitsCount} Visit{pendingApprovalVisitsCount !== 1 ? 's' : ''} Finished by Nurse
                  </div>
                </div>

                <div style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  padding: '0.75rem 1rem',
                  border: '1.5px solid #DDD6FE',
                  boxShadow: '0 2px 4px rgba(147, 51, 234, 0.06)'
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#6B21A8', fontWeight: 700, textTransform: 'uppercase' }}>
                    Reward Points Ledger
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#7C3AED', margin: '0.15rem 0' }}>
                    ⭐ {totalPoints} Pts
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    {myConvertedLeads.length} Converted Leads (+50 each)
                  </div>
                </div>
              </div>

              {/* Sticky Filter Pills */}
              <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 20,
                display: 'flex',
                gap: '0.4rem',
                padding: '0.75rem 1.5rem',
                borderBottom: '1px solid #E2E8F0',
                overflowX: 'auto',
                background: '#FFFFFF',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                flexShrink: 0
              }}>
                {[
                  { id: 'all', label: `All (${transactions.length})` },
                  { id: 'duty', label: `70% Duties (${transactions.filter(t => t.category === 'duty').length})` },
                  { id: 'referral', label: `10% Referrals (${transactions.filter(t => t.category === 'referral').length})` },
                  { id: 'pending', label: `Pending Approval (${transactions.filter(t => t.category === 'pending').length})` },
                  { id: 'points', label: `Points (${transactions.filter(t => t.category === 'points').length})` }
                ].map((tab) => {
                  const isActive = historyFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setHistoryFilter(tab.id as any)}
                      style={{
                        background: isActive ? '#0284C7' : '#F1F5F9',
                        color: isActive ? '#FFFFFF' : '#475569',
                        border: 'none',
                        borderRadius: 9999,
                        padding: '0.35rem 0.85rem',
                        fontSize: '0.78rem',
                        fontWeight: 750,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Transaction List Items */}
              <div style={{
                padding: '1rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem'
              }}>
                {filteredTransactions.length === 0 ? (
                  <div style={{
                    padding: '3rem 1rem',
                    textAlign: 'center',
                    color: '#64748B',
                    background: '#F8FAFC',
                    borderRadius: 14,
                    border: '1.5px dashed #CBD5E1'
                  }}>
                    <Coins size={36} style={{ color: '#94A3B8', margin: '0 auto 0.5rem' }} />
                    <div style={{ fontWeight: 800, color: '#334155', fontSize: '0.95rem' }}>No Transactions In This Category</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>
                      Transactions will appear automatically as you complete patient visits and convert referrals.
                    </div>
                  </div>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isPending = tx.category === 'pending';
                    const isPoints = tx.category === 'points';
                    const isDuty = tx.category === 'duty';
                    const isReferral = tx.category === 'referral';

                    return (
                      <div
                        key={tx.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          padding: '0.85rem 1rem',
                          borderRadius: 12,
                          background: isPending ? '#FFFBEB' : '#FFFFFF',
                          border: isPending ? '1.5px solid #FDE68A' : '1px solid #E2E8F0',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: isPending ? '#FEF3C7' : (isPoints ? '#FAF5FF' : (isReferral ? '#EFF6FF' : '#ECFDF5')),
                            color: isPending ? '#D97706' : (isPoints ? '#9333EA' : (isReferral ? '#0284C7' : '#059669')),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isPending && <Clock size={20} />}
                            {isPoints && <Sparkles size={20} />}
                            {isReferral && <TrendingUp size={20} />}
                            {isDuty && <CheckCircle2 size={20} />}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                              {tx.title}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
                              {tx.description}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>📅 {tx.date}</span>
                              {tx.bookingId && <span>• ID: #{tx.bookingId}</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                          {tx.amount !== undefined && (
                            <div style={{
                              fontSize: '1.05rem',
                              fontWeight: 900,
                              color: isPending ? '#D97706' : '#059669'
                            }}>
                              +{isPending ? `₹${tx.amount}` : `₹${tx.amount}`}
                            </div>
                          )}
                          {tx.points !== undefined && (
                            <div style={{
                              fontSize: '1.05rem',
                              fontWeight: 900,
                              color: '#7C3AED'
                            }}>
                              +{tx.points} Pts
                            </div>
                          )}
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 9999,
                            background: isPending ? '#FEF3C7' : (isPoints ? '#FAF5FF' : '#ECFDF5'),
                            color: isPending ? '#92400E' : (isPoints ? '#6B21A8' : '#047857'),
                            border: `1px solid ${isPending ? '#FDE68A' : (isPoints ? '#E9D5FF' : '#A7F3D0')}`
                          }}>
                            {tx.status === 'Pending Approval' ? '⏳ Pending Approval' : (isPoints ? '⭐ 50 Pts Credited' : '✓ Credited')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer - Fixed at Bottom */}
            <div style={{
              padding: '0.9rem 1.5rem',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC',
              flexWrap: 'wrap',
              gap: '0.5rem',
              flexShrink: 0
            }}>
              <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                All duty earnings are calculated at 70% and referrals at 10% under provider policy.
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="btn btn-primary"
                style={{
                  borderRadius: 8,
                  padding: '0.45rem 1.25rem',
                  fontSize: '0.82rem',
                  fontWeight: 700
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
