import React, { useState, useEffect } from 'react';
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
  getPrescriptionStorageObject,
  uploadCertificateToCloudflareBucket
} from '../lib/cloudflareStorage';
import { generateNurseReferralCode } from '../lib/supabase';

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
  bookings,
  leads = [],
  services = [],
  onAddNewLead,
  onUpdateNurse,
  onReassignBooking,
  onUpdateBooking,
  onRefreshData
}) => {
  const serviceList: ServiceItem[] = services;
  const liveNurse = (allNurses && currentNurse)
    ? (allNurses.find((n) => n.id === currentNurse.id || (n.phone && currentNurse.phone && n.phone.replace(/\D/g, '') === currentNurse.phone.replace(/\D/g, ''))) || currentNurse)
    : (currentNurse || (allNurses && allNurses.length > 0 ? allNurses[0] : null));

  const nurse: NurseProfile = (liveNurse as NurseProfile) || {
    id: 'nurse-101',
    name: 'Nurse Priya Sharma',
    phone: '9849012345',
    email: 'priya.nursing@xpressnurse.in',
    experienceYears: 5,
    qualification: 'B.Sc Nursing (Registered RN)',
    serviceArea: 'Gachibowli',
    status: 'Active',
    totalLeads: 8,
    convertedLeads: 6,
    totalReferrals: 12,
    pointsEarned: 1200,
    referralEarningsRupees: 0,
    rating: 4.9,
    certificateVerified: true
  };

  // Ultra-simple 5 tabs with easy English words
  const [activeTab, setActiveTab] = useState<'home' | 'visits' | 'add-patient' | 'my-money' | 'profile'>('home');
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');

  // New Patient Form
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'Female' | 'Male' | 'Other'>('Female');
  const [serviceId, setServiceId] = useState<ServiceId>('saline-infusion');
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

  // Filter Bookings assigned to THIS nurse
  const nurseNameClean = (nurse.name || '').toLowerCase();
  const nursePhoneClean = (nurse.phone || '').replace(/\D/g, '');
  const myVisits = bookings.filter((b) =>
    b.assignedNurseId === nurse.id ||
    (nurseNameClean && b.assignedNurseName && b.assignedNurseName.toLowerCase().includes(nurseNameClean))
  );
  const activeVisits = myVisits.filter((b) => b.status === 'Assigned' || b.status === 'In-Progress');
  const completedVisits = myVisits.filter((b) => b.status === 'Completed');

  // Filter Leads submitted by THIS nurse
  const myLeads = leads.filter((l) =>
    l.nurseId === nurse.id ||
    (nursePhoneClean && l.referredNursePhone && l.referredNursePhone.replace(/\D/g, '') === nursePhoneClean) ||
    (nursePhoneClean && l.patientPhone && l.patientPhone.replace(/\D/g, '') === nursePhoneClean)
  );
  const myConvertedLeads = myLeads.filter((l) =>
    l.status === 'Converted' ||
    (l.status === 'Approved' && (l.referralType === 'nurse' || Boolean(l.referredNursePhone)))
  );

  // Calculate earnings — strictly prioritize live nurse profile points & rupees set by Admin/system
  const referralCode = nurse.referralCode || generateNurseReferralCode(nurse.name, nurse.id, nurse.phone || '');
  let calculatedMoney = 0;
  myConvertedLeads.forEach(lead => {
    if (lead.referralType !== 'nurse' && !lead.referredNursePhone) {
      const procedure = services.find(s => s.id === lead.serviceId);
      const fee = Number(lead.leadValueRupees) || (procedure?.priceNumber ?? 800);
      calculatedMoney += Math.round(fee * 0.10);
    }
  });

  // Calculate completed visit earnings (70% service charge for finished visits)
  let completedVisitsEarnings = 0;
  completedVisits.forEach(visit => {
    const procedure = services.find(s => s.id === visit.serviceId);
    const fee = Number(visit.finalFee !== undefined ? visit.finalFee : (visit.estimatedFee || (procedure ? procedure.priceNumber : 899)));
    completedVisitsEarnings += Math.round(fee * 0.70);
  });

  // Strictly calculate what the nurse earned through percentage:
  // 70% service charge from completed visits + 10% procedure fee from converted patient referrals
  // Never mix or show how much they earned from points in rupees
  const totalMoney = completedVisitsEarnings + calculatedMoney;
  const totalPoints = (nurse.pointsEarned !== undefined && nurse.pointsEarned !== null && !isNaN(Number(nurse.pointsEarned)))
    ? Number(nurse.pointsEarned)
    : (myConvertedLeads.length * 50);

  // Handlers
  const handleAcceptVisit = async (booking: Booking) => {
    if (onUpdateBooking) {
      await onUpdateBooking(booking.id, {
        status: 'In-Progress',
        nurseAcceptanceStatus: 'Accepted'
      });
      try {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      } catch { }
    }
  };

  const handleRejectVisit = async (booking: Booking) => {
    if (onUpdateBooking) {
      if (window.confirm("Are you sure you want to reject this assigned visit?")) {
        await onUpdateBooking(booking.id, {
          nurseAcceptanceStatus: 'Rejected',
          status: 'Rejected',
          rejectionReason: 'Rejected by Nurse via App'
        });
      }
    }
  };

  const handleFinishVisit = async (booking: Booking) => {
    if (onUpdateBooking) {
      const procedure = services.find(s => s.id === booking.serviceId);
      const fee = Number(booking.finalFee !== undefined ? booking.finalFee : (booking.estimatedFee || (procedure ? procedure.priceNumber : 899)));
      const payoutRupees = Math.round(fee * 0.70);

      await onUpdateBooking(booking.id, {
        status: 'Completed'
      });
      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.5 } });
      } catch { }
      alert(`Duty Completed! ₹${payoutRupees} (70% service charge) has been added to your earnings.`);
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

    const procedure = services.find(s => s.id === serviceId);
    const procFee = procedure?.priceNumber || 800;

    const newLead: NurseLead = {
      id: `LD-${Math.floor(1000 + Math.random() * 9000)}`,
      nurseId: nurse.id,
      patientName: patientName.trim(),
      patientPhone: cleanPhone,
      patientAge: patientAge ? parseInt(patientAge, 10) : undefined,
      patientGender,
      serviceId,
      leadValueRupees: procFee,
      area,
      fullAddress: fullAddress.trim(),
      notes: notes.trim() || `Added by ${nurse.name}`,
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

    try {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.5 } });
    } catch { }
  };

  const handleViewInvoice = (booking: Booking) => {
    const inv = generateInvoiceDetails(booking);
    openPrintableInvoiceWindow(inv);
  };

  return (
    <div style={{ background: '#F8FAFC', minHeight: '90vh', padding: '1rem 0 3rem' }}>
      <div className="container" style={{ maxWidth: 960 }}>

        {/* ================================================================= */}
        {/* 1. TOP NURSE PROFILE BAR (Clean, Friendly, Simple) */}
        {/* ================================================================= */}
        <div style={{
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
              <div style={{ fontSize: '0.84rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={13} style={{ color: '#0284C7' }} />
                  {nurse.serviceArea || 'Hyderabad'}
                </span>
                <span>•</span>
                <span>{nurse.qualification || 'Registered Nurse'}</span>
                <span>•</span>
                <span>{nurse.phone}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              padding: '0.45rem 0.9rem',
              borderRadius: 12,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#065F46', fontWeight: 600 }}>My Points</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#059669' }}>⭐ {totalPoints}</div>
            </div>
            <div style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              padding: '0.45rem 0.9rem',
              borderRadius: 12,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.7rem', color: '#1E40AF', fontWeight: 600 }}>Active Visits</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1D4ED8' }}>{activeVisits.length}</div>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (isRefreshingData) return;
                setIsRefreshingData(true);
                try {
                  if (onRefreshData) {
                    await onRefreshData();
                  } else {
                    await new Promise(r => setTimeout(r, 600));
                  }
                  setRefreshMsg('✓ Dashboard refreshed!');
                  setTimeout(() => setRefreshMsg(''), 3000);
                } catch {
                  setRefreshMsg('✓ Refreshed!');
                  setTimeout(() => setRefreshMsg(''), 3000);
                } finally {
                  setIsRefreshingData(false);
                }
              }}
              disabled={isRefreshingData}
              className="btn btn-outline"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.45rem 0.85rem',
                borderRadius: 12,
                border: '1px solid #CBD5E1',
                color: isRefreshingData ? '#0284C7' : '#0F172A',
                background: '#F8FAFC',
                gap: '0.1rem',
                cursor: 'pointer'
              }}
              title="Refresh Dashboard"
            >
              <RefreshCw size={17} style={{ animation: isRefreshingData ? 'spin 1s linear infinite' : 'none', color: '#0284C7' }} />
              <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>{isRefreshingData ? 'Syncing' : 'Refresh'}</span>
            </button>
            <a
              href="https://wa.me/917569657371"
              className="btn btn-outline"
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
          </div>
        </div>

        {refreshMsg && (
          <div style={{
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            borderRadius: 12,
            padding: '0.6rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            animation: 'fadeIn 0.2s ease-in'
          }}>
            <RefreshCw size={15} style={{ color: '#059669' }} />
            <span>{refreshMsg}</span>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. NAVIGATION BAR (Big, Easy Words - No Hard English) */}
        {/* ================================================================= */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          background: '#FFFFFF',
          padding: '0.4rem',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          marginBottom: '1.25rem',
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          {[
            { id: 'home', label: '🏠 Home', badge: null },
            { id: 'visits', label: '🚗 My Visits', badge: activeVisits.length > 0 ? activeVisits.length : null },
            { id: 'add-patient', label: '➕ Add Patient', badge: '+50 Pts' },
            { id: 'my-money', label: '💰 My Earnings', badge: null },
            { id: 'profile', label: '👤 My Profile', badge: null }
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: '1 1 auto',
                  minWidth: 110,
                  padding: '0.65rem 0.9rem',
                  borderRadius: 10,
                  border: 'none',
                  background: isSelected ? '#0284C7' : 'transparent',
                  color: isSelected ? '#FFFFFF' : '#475569',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                {tab.badge !== null && (
                  <span style={{
                    background: isSelected ? '#FFFFFF' : '#EF4444',
                    color: isSelected ? '#0284C7' : '#FFFFFF',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: 9999
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
                    : 'No pending visits right now. You can add a patient or share your code to earn cash!'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                  {myLeads.length}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>{myConvertedLeads.length} Approved & Converted</span>
                  <ChevronRight size={14} />
                </div>
              </div>

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
                <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span>70% Duty + 10% Referrals</span>
                  <ChevronRight size={14} />
                </div>
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
                  <span style={{ background: '#EFF6FF', color: '#0284C7', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 9999 }}>
                    {activeVisits[0].scheduledSlot || activeVisits[0].preferredTime || 'Today'}
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

            {/* Quick Share Code Banner */}
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
                  const isInProgress = visit.status === 'In-Progress';
                  const isAssigned = visit.status === 'Assigned' || visit.status === 'Pending';

                  return (
                    <div
                      key={visit.id}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: 16,
                        border: isInProgress ? '2px solid #0284C7' : isDone ? '1px solid #DCFCE7' : '1px solid #E2E8F0',
                        padding: '1.25rem',
                        boxShadow: isInProgress ? '0 4px 12px rgba(2, 132, 199, 0.08)' : 'none',
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
                          background: isInProgress ? '#EFF6FF' : isDone ? '#F0FDF4' : '#FFFBEB',
                          color: isInProgress ? '#0284C7' : isDone ? '#16A34A' : '#D97706',
                          border: `1px solid ${isInProgress ? '#BFDBFE' : isDone ? '#BBF7D0' : '#FDE68A'}`
                        }}>
                          {isInProgress ? '⚡ Duty in Progress' : isDone ? '✓ Visit Completed' : '🔔 New Assignment'}
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
                              background: '#ECFDF5',
                              color: '#059669',
                              border: '1px solid #A7F3D0',
                              padding: '2px 8px',
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}>
                              <span>💰 Your 70% Payout:</span>
                              <strong style={{ fontSize: '0.84rem' }}>
                                ₹{Math.round(Number(visit.finalFee !== undefined ? visit.finalFee : (visit.estimatedFee || 899)) * 0.70)}
                              </strong>
                              <span style={{ fontSize: '0.68rem', color: '#047857', fontWeight: 600 }}>({isDone ? 'Credited to earnings' : 'Credited on finishing job'})</span>
                            </span>
                          </div>
                          <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <MapPin size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
                            <span><strong>Address:</strong> {visit.fullAddress || visit.area || 'Hyderabad'}</span>
                          </div>
                          {(visit.scheduledSlot || visit.preferredTime) && (
                            <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Clock size={13} style={{ color: '#0284C7', flexShrink: 0 }} />
                              <span>Scheduled: {visit.preferredDate || 'Today'} | {visit.scheduledSlot || visit.preferredTime}</span>
                            </div>
                          )}
                          <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                            Received: {visit.createdAt ? new Date(visit.createdAt).toLocaleString() : 'Unknown'}
                          </div>
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
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              color: '#475569',
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
                            <Receipt size={12} />
                            <span>Doorstep Bill</span>
                          </button>
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

                          {isDone && (
                            <span style={{ fontSize: '0.82rem', color: '#16A34A', fontWeight: 800, background: '#DCFCE7', padding: '4px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <CheckCircle2 size={14} />
                              <span>✓ Finished & Billed (+₹{Math.round(Number(visit.finalFee !== undefined ? visit.finalFee : (visit.estimatedFee || 899)) * 0.70)} Earned)</span>
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
                </select>
              </div>

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
                    👥 ₹{calculatedMoney} from Patient Referrals (10%)
                  </span>
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
              onClick={() => setIsHistoryModalOpen(true)}
              className="btn"
              style={{
                width: '100%',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#1E293B',
                fontWeight: 700,
                padding: '0.85rem',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
            >
              <Clock size={16} style={{ color: '#059669' }} />
              View Transaction History
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
                  Patients You Referred ({myLeads.filter(l => l.referralType !== 'nurse' && !l.referredNursePhone).length})
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

              {myLeads.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748B' }}>
                  <p>You have not added any patients yet. Click "Add Patient" to start earning 50 points per patient!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {myLeads.filter(l => l.referralType !== 'nurse' && !l.referredNursePhone).map((lead) => {
                    const isFullyCompleted = lead.status === 'Converted';
                    const isApprovedAwaitingVisit = lead.status === 'Approved';
                    return (
                      <div
                        key={lead.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 1rem',
                          borderRadius: 10,
                          background: isFullyCompleted ? '#F0FDF4' : (isApprovedAwaitingVisit ? '#FFFDF5' : '#F8FAFC'),
                          border: `1px solid ${isFullyCompleted ? '#BBF7D0' : (isApprovedAwaitingVisit ? '#FDE68A' : '#E2E8F0')}`,
                          flexWrap: 'wrap',
                          gap: '0.5rem'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>
                            {lead.patientName}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
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
                            background: isFullyCompleted ? '#DCFCE7' : (isApprovedAwaitingVisit ? '#FEF3C7' : '#F1F5F9'),
                            color: isFullyCompleted ? '#15803D' : (isApprovedAwaitingVisit ? '#B45309' : '#475569')
                          }}>
                            {isFullyCompleted
                              ? `✓ Visit Done (+50 Pts, +₹${lead.referralCommissionRupees || 80})`
                              : (isApprovedAwaitingVisit ? '⏳ Allotted • Visit in Progress' : '⏳ Office Review')}
                          </span>
                          {isFullyCompleted ? (
                            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                              +50 Pts & 10% Fee Credited
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.72rem', color: '#B45309', fontWeight: 600, marginTop: '2px' }}>
                              50 pts + 10% fee credited after visit
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                    localStorage.removeItem('xn_auth_user');
                    window.location.href = '/login';
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
      {/* ================================================================= */}
      {isRxModalOpen && previewRxBooking && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            maxWidth: 520,
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                Doctor's Prescription & Orders
              </h4>
              <button
                type="button"
                onClick={() => setIsRxModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '1rem', marginBottom: '1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Patient: <strong>{previewRxBooking.patientName}</strong></div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>Procedure: <strong>{previewRxBooking.serviceTitle}</strong></div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#0F172A', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {previewRxBooking.notes || 'Administer normal saline infusion 500ml IV under aseptic precautions. Monitor vitals before and after.'}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setIsRxModalOpen(false)}
                className="btn btn-primary"
                style={{ borderRadius: 8, padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rx/Prescription Modal */}
      {isRxModalOpen && previewRxBooking && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            maxWidth: 480,
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                Patient Prescription
              </h4>
              <button
                type="button"
                onClick={() => setIsRxModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: '#F8FAFC', borderRadius: 10, border: '1.5px dashed #CBD5E1', marginBottom: '1rem' }}>
              <FileText size={36} style={{ color: '#0284C7', margin: '0 auto 0.5rem' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                {previewRxBooking.patientName}
              </div>
            </div>

            {previewRxBooking.prescriptionUrl ? (
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <img src={previewRxBooking.prescriptionUrl} alt="Prescription" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid #E2E8F0', objectFit: 'contain', maxHeight: '400px' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <div style={{ marginTop: '0.75rem' }}>
                  <a href={previewRxBooking.prescriptionUrl} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.8rem' }}>
                    <ExternalLink size={16} /> Open Full Size / PDF
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#64748B', textAlign: 'center', marginBottom: '1rem' }}>
                No prescription file attached, or it was manually verified.
                {previewRxBooking.prescriptionFileName && <div>File Name: {previewRxBooking.prescriptionFileName}</div>}
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setIsRxModalOpen(false)}
                className="btn btn-primary"
                style={{ borderRadius: 8, padding: '0.45rem 1.25rem', fontSize: '0.82rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {/* Transaction History Modal */}
      {isHistoryModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 24,
            width: '100%',
            maxWidth: 600,
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#FAFAFA', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={20} style={{ color: '#059669' }} />
                  Transaction History
                </h3>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {myConvertedLeads.filter(l => l.referralType !== 'nurse' && !l.referredNursePhone).map(lead => {
                const procedure = services.find(s => s.id === lead.serviceId);
                const fee = Number(lead.leadValueRupees) || (procedure?.priceNumber ?? 800);
                const fallbackEarnings = Math.round(fee * 0.10);
                return (
                  <div key={lead.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', border: '1px solid #E2E8F0', borderRadius: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1E293B' }}>Patient Referral: {lead.patientName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Status: {lead.status}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#059669' }}>+₹{fallbackEarnings} (10%)</div>
                      <div style={{ fontSize: '0.8rem', color: '#16A34A', fontWeight: 600 }}>+{lead.pointsAwarded || 50} pts</div>
                    </div>
                  </div>
                );
              })}

              {myConvertedLeads.filter(l => l.referralType === 'nurse' || l.referredNursePhone).map(lead => (
                <div key={lead.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', border: '1px solid #E2E8F0', borderRadius: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1E293B' }}>Nurse Referral: {lead.referredNurseName || lead.patientName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Status: {lead.status}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#16A34A', fontSize: '1.1rem' }}>+{lead.pointsAwarded || 50} pts</div>
                  </div>
                </div>
              ))}

              {completedVisits.map(visit => {
                const procedure = services.find(s => s.id === visit.serviceId);
                const fee = Number(visit.finalFee !== undefined ? visit.finalFee : (visit.estimatedFee || (procedure ? procedure.priceNumber : 899)));
                const earnings = Math.round(fee * 0.70);
                return (
                  <div key={visit.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', border: '1px solid #E2E8F0', borderRadius: 12, background: '#F8FAFC' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#1E293B' }}>Assigned Visit Finished: {visit.patientName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Service: {visit.serviceTitle || visit.serviceId} (Bill: ₹{fee})</div>
                      <div style={{ fontSize: '0.72rem', color: '#0284C7', marginTop: '0.15rem' }}>Booking ID: {visit.id}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#059669', fontSize: '1.05rem' }}>+₹{earnings}</div>
                      <span style={{ fontSize: '0.72rem', background: '#ECFDF5', color: '#059669', padding: '2px 6px', borderRadius: 4, fontWeight: 700, border: '1px solid #A7F3D0', display: 'inline-block', marginTop: '2px' }}>
                        70% Service Charge Earned
                      </span>
                    </div>
                  </div>
                );
              })}

              {myConvertedLeads.length === 0 && completedVisits.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                  No transactions yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isInvoiceModalOpen && previewInvoice && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            maxWidth: 500,
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                  Doorstep Bill: {previewInvoice.invoiceNumber}
                </h4>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Date: {previewInvoice.invoiceDate}</div>
              </div>
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '1rem', marginBottom: '1rem', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.85rem', color: '#0F172A', fontWeight: 700 }}>{previewInvoice.patientName}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{previewInvoice.fullAddress || previewInvoice.area}</div>
              <div style={{ borderTop: '1px dashed #CBD5E1', margin: '0.75rem 0', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#334155' }}>
                  <span>
                    {previewInvoice.serviceTitle}
                    {previewInvoice.serviceDate && <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748B' }}>Date: {previewInvoice.serviceDate}</span>}
                    {previewInvoice.timeSlot && <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748B' }}>Slot: {previewInvoice.timeSlot}</span>}
                  </span>
                  <strong>₹{previewInvoice.baseAmount * (previewInvoice.numberOfVisits || 1)}</strong>
                </div>
                {Boolean(previewInvoice.discountRupees && previewInvoice.discountRupees > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#059669', marginTop: '4px' }}>
                    <span>Coupon Discount</span>
                    <strong>-₹{previewInvoice.discountRupees}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 900, color: '#0F172A', marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid #E2E8F0' }}>
                  <span>Total Due:</span>
                  <span style={{ color: '#059669' }}>₹{previewInvoice.totalAmount}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => openPrintableInvoiceWindow(previewInvoice)}
                className="btn btn-outline"
                style={{ borderRadius: 8, padding: '0.45rem 1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Printer size={14} />
                <span>Print Bill</span>
              </button>
              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="btn btn-primary"
                style={{ borderRadius: 8, padding: '0.45rem 1.25rem', fontSize: '0.82rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {certModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            maxWidth: 480,
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
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

    </div>
  );
};
