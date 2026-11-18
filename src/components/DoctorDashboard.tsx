import React, { useState, useMemo, useEffect } from 'react';
import { AppUser, NurseLead, ServiceItem, DoctorConsultation, ServiceId } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  UserCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Plus, 
  Phone, 
  FileText, 
  DollarSign, 
  Percent, 
  LogOut, 
  Share2, 
  Building2, 
  Briefcase,
  ChevronRight,
  TrendingUp,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatDateTimeDDMMYY } from '../lib/dateUtils';

export interface DoctorDashboardProps {
  user?: AppUser | null;
  appUsers?: AppUser[];
  leads?: NurseLead[];
  onCreateLead?: (lead: NurseLead) => Promise<void> | void;
  consultations?: DoctorConsultation[];
  services?: ServiceItem[];
  onIssuePrescription?: (consultationId: string, prescriptionText: string, recommendedService: ServiceId, doctorName?: string) => void;
  onAddNewConsultation?: (consultation: DoctorConsultation) => void;
  onLogout?: () => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  user,
  appUsers = [],
  leads = [],
  onCreateLead,
  onLogout
}) => {
  // Retrieve active logged-in partner profile (from prop or session storage fallback)
  const activePartner: AppUser | null = user || (() => {
    try {
      const s = sessionStorage.getItem('xn_auth_user_doctor') || sessionStorage.getItem('xn_auth_user') || localStorage.getItem('xn_auth_user_doctor') || localStorage.getItem('xn_auth_user');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  })();

  // Resolve live partner record from appUsers list to ensure live sync of commissionPercent, profession, currentlyWorkingAt, status
  const currentPartner: AppUser | null = useMemo(() => {
    if (!activePartner) return null;
    const pId = activePartner.id;
    const pPhone = activePartner.phone ? activePartner.phone.replace(/\D/g, '') : '';
    const pEmail = (activePartner.email || activePartner.identifier || '').toLowerCase();
    const live = appUsers.find(
      (u) => (pId && u.id === pId) ||
             (pPhone && u.phone && u.phone.replace(/\D/g, '') === pPhone) ||
             (pEmail && ((u.email && u.email.toLowerCase() === pEmail) || (u.identifier && u.identifier.toLowerCase() === pEmail)))
    );
    return live || activePartner;
  }, [appUsers, activePartner]);

  const partnerId = currentPartner?.id || activePartner?.id || '';
  const partnerPhone = currentPartner?.phone ? currentPartner.phone.replace(/\D/g, '') : (activePartner?.phone ? activePartner.phone.replace(/\D/g, '') : '');

  // Direct live partner state fetched from Supabase
  const [liveDbPartner, setLiveDbPartner] = useState<AppUser | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPartnerProfile = async () => {
      const targetId = partnerId;
      const targetPhone = partnerPhone;
      if (!targetId && !targetPhone) return;

      try {
        let q = supabase.from('app_users').select('*');
        if (targetId) {
          q = q.eq('id', targetId);
        } else if (targetPhone) {
          q = q.eq('phone', targetPhone);
        }
        const { data, error } = await q.limit(1).maybeSingle();
        if (!error && data && isMounted) {
          const fresh: AppUser = {
            id: data.id,
            name: data.name || '',
            role: data.role || 'doctor',
            identifier: data.identifier || data.email || data.phone || '',
            pin: data.pin || '',
            phone: data.phone || '',
            email: data.email || '',
            designation: data.designation || '',
            serviceArea: data.service_area || 'Hyderabad',
            avatarUrl: data.avatar_url,
            status: data.status || 'Active',
            commissionPercent: data.commission_percent !== undefined && data.commission_percent !== null && !isNaN(Number(data.commission_percent)) ? Number(data.commission_percent) : 10,
            currentlyWorkingAt: data.currently_working_at || undefined,
            profession: data.profession || undefined
          };
          setLiveDbPartner(fresh);
        }
      } catch {}
    };

    fetchPartnerProfile();

    const handleFocus = () => fetchPartnerProfile();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [partnerId, partnerPhone]);

  // Reactive commission percentage with multi-source fallback
  const commissionPercent = useMemo(() => {
    if (liveDbPartner?.commissionPercent !== undefined && !isNaN(Number(liveDbPartner.commissionPercent))) {
      return Number(liveDbPartner.commissionPercent);
    }
    if (currentPartner?.commissionPercent !== undefined && !isNaN(Number(currentPartner.commissionPercent))) {
      return Number(currentPartner.commissionPercent);
    }
    if (activePartner?.commissionPercent !== undefined && !isNaN(Number(activePartner.commissionPercent))) {
      return Number(activePartner.commissionPercent);
    }
    return 10;
  }, [liveDbPartner?.commissionPercent, currentPartner?.commissionPercent, activePartner?.commissionPercent]);

  // Filter leads to ONLY show patients entered by this partner
  const myReferredPatients = useMemo(() => {
    if (!partnerId && !partnerPhone) return [];
    return leads.filter((l) => {
      // Must be patient referral
      if (l.referralType === 'nurse') return false;
      const leadNursePhone = (l.nursePhone || l.referredNursePhone || '').replace(/\D/g, '');
      const leadPartnerId = l.partnerId;
      if (leadPartnerId && partnerId && leadPartnerId === partnerId) return true;
      if (partnerPhone && leadNursePhone && leadNursePhone === partnerPhone) return true;
      if (l.nurseId && partnerId && l.nurseId === partnerId) return true;
      return false;
    });
  }, [leads, partnerId, partnerPhone]);

  // Modal State for Referring a Patient
  const [isReferModalOpen, setIsReferModalOpen] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientPhoneInput, setPatientPhoneInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Calculate Partner Financial Stats
  const { totalEarnings, totalBilledAmount, acceptedCount, rejectedCount, pendingCount } = useMemo(() => {
    let earningsSum = 0;
    let billedSum = 0;
    let accepted = 0;
    let rejected = 0;
    let pending = 0;

    myReferredPatients.forEach((p) => {
      const isAccepted = p.status === 'Approved' || p.status === 'Converted';
      const isRejected = p.status === 'Rejected';
      const billed = Number(p.billedAmount || 0);

      if (isAccepted) {
        accepted++;
        billedSum += billed;
        const patientCommission = billed > 0 
          ? Math.round((billed * commissionPercent) / 100) 
          : (Number(p.referralCommissionRupees) || 0);
        earningsSum += patientCommission;
      } else if (isRejected) {
        rejected++;
      } else {
        pending++;
      }
    });

    return {
      totalEarnings: earningsSum,
      totalBilledAmount: billedSum,
      acceptedCount: accepted,
      rejectedCount: rejected,
      pendingCount: pending
    };
  }, [myReferredPatients, commissionPercent]);

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = patientName.trim();
    const cleanPhone = patientPhoneInput.replace(/\D/g, '');

    if (!cleanName) {
      setErrorMsg('Please enter the patient full name.');
      return;
    }
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const partnerArea = currentPartner?.serviceArea || activePartner?.serviceArea || currentPartner?.city || 'Hyderabad';
      const cleanPartnerArea = (partnerArea && partnerArea !== 'Gachibowli') ? partnerArea : 'Hyderabad';
      const newLead: NurseLead = {
        id: `PT-${Date.now().toString().slice(-6)}`,
        partnerId: partnerId,
        nurseId: undefined, // CRITICAL: Partner is in app_users, NOT public.nurses! Must be undefined to avoid foreign key violation!
        nurseName: currentPartner?.name || activePartner?.name || 'Referral Partner',
        nursePhone: currentPartner?.phone || activePartner?.phone,
        patientName: cleanName,
        patientPhone: cleanPhone,
        notes: notes.trim(),
        status: 'Pending Approval',
        referralType: 'patient',
        area: cleanPartnerArea,
        billedAmount: 0,
        referralCommissionRupees: 0,
        submittedAt: new Date().toISOString()
      };

      if (onCreateLead) {
        await onCreateLead(newLead);
      }

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });

      setSuccessToast(`Patient ${cleanName} referred successfully! Care desk will contact them.`);
      setPatientName('');
      setPatientPhoneInput('');
      setNotes('');
      setIsReferModalOpen(false);

      setTimeout(() => {
        setSuccessToast('');
      }, 5000);
    } catch (err: any) {
      setErrorMsg('Failed to submit referral. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const partnerDisplayName = currentPartner?.name || activePartner?.name || 'Referral Partner';
  const partnerProfession = currentPartner?.profession || activePartner?.profession || 'Partner';
  const partnerWorkplace = currentPartner?.currentlyWorkingAt || activePartner?.currentlyWorkingAt || '';

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', paddingBottom: '3rem' }}>
      {/* Top Header Bar */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '1rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #0284C7, #0369A1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)'
            }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                  {partnerDisplayName}
                </h1>
                <span style={{
                  background: '#E0F2FE',
                  color: '#0369A1',
                  fontSize: '0.75rem',
                  fontWeight: 750,
                  padding: '0.15rem 0.55rem',
                  borderRadius: 999
                }}>
                  {activePartner?.profession?.toLowerCase().includes('doctor') ? 'Doctor / Partner' : 'Others / Partner'}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                <span>{partnerProfession}</span>
                {partnerWorkplace && (
                  <>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Building2 size={13} />
                      {partnerWorkplace}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setIsReferModalOpen(true)}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.15rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                borderRadius: 10
              }}
            >
              <Plus size={18} />
              <span>Refer Patient</span>
            </button>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="btn btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.55rem 0.85rem',
                  color: '#64748B',
                  borderRadius: 10,
                  fontSize: '0.84rem'
                }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main style={{ maxWidth: 1100, margin: '1.5rem auto 0 auto', padding: '0 1rem' }}>
        {/* Success Toast */}
        {successToast && (
          <div style={{
            background: '#ECFDF5',
            border: '1.5px solid #6EE7B7',
            color: '#065F46',
            padding: '0.9rem 1.25rem',
            borderRadius: 12,
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontWeight: 650,
            fontSize: '0.92rem',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)'
          }}>
            <CheckCircle2 size={20} style={{ color: '#10B981', flexShrink: 0 }} />
            <span>{successToast}</span>
          </div>
        )}

        {/* Financial & Performance Stats Grid */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem'
        }}>
          {/* Card 1: Total Earnings & Total Billed */}
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: 16,
            padding: '1.25rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Earnings
              </span>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TrendingUp size={18} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.85rem', fontWeight: 900, color: '#047857' }}>
                ₹{totalEarnings.toLocaleString('en-IN')}
              </span>
              {/* Total Billed Amount in small text beside earnings as requested */}
              <span style={{ fontSize: '0.82rem', fontWeight: 650, color: '#64748B' }}>
                (Total Billed: ₹{totalBilledAmount.toLocaleString('en-IN')})
              </span>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#059669', marginTop: '0.4rem', fontWeight: 600 }}>
              ✓ Paid out for accepted patient visits
            </div>
          </div>

          {/* Card 2: Commission Rate Configured */}
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: 16,
            padding: '1.25rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Commission Rate
              </span>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Percent size={18} />
              </div>
            </div>

            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--primary-navy-950)' }}>
              {commissionPercent}%
            </div>

            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.4rem' }}>
              Configured per your partner account
            </div>
          </div>

          {/* Card 3: Referred Patients Summary */}
          <div style={{
            background: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            borderRadius: 16,
            padding: '1.25rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Referred Patients
              </span>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: '#F8FAFC',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Users size={18} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--primary-navy-950)' }}>
                {myReferredPatients.length}
              </span>
              <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.76rem', fontWeight: 700 }}>
                <span style={{ background: '#ECFDF5', color: '#065F46', padding: '0.15rem 0.45rem', borderRadius: 6 }}>
                  {acceptedCount} Accepted
                </span>
                {rejectedCount > 0 && (
                  <span style={{ background: '#FEF2F2', color: '#991B1B', padding: '0.15rem 0.45rem', borderRadius: 6 }}>
                    {rejectedCount} Rejected
                  </span>
                )}
                {pendingCount > 0 && (
                  <span style={{ background: '#FFFBEB', color: '#92400E', padding: '0.15rem 0.45rem', borderRadius: 6 }}>
                    {pendingCount} Pending
                  </span>
                )}
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.4rem' }}>
              Patients referred by you
            </div>
          </div>
        </section>

        {/* Referred Patients List Section */}
        <section style={{
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                My Referred Patients
              </h2>
              <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.2rem' }}>
                Track acceptance status, billed amount, and your earnings per patient
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsReferModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
            >
              <Plus size={16} />
              <span>+ Refer Patient</span>
            </button>
          </div>

          {myReferredPatients.length === 0 ? (
            <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#F1F5F9',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94A3B8',
                marginBottom: '1rem'
              }}>
                <Users size={28} />
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 750, color: 'var(--primary-navy-900)', margin: '0 0 0.35rem 0' }}>
                No Referred Patients Yet
              </h3>
              <p style={{ fontSize: '0.86rem', color: '#64748B', maxWidth: 440, margin: '0 auto 1.25rem auto', lineHeight: 1.5 }}>
                When you refer patients for home nursing care, their details, billed amounts, and your commission will appear right here.
              </p>
              <button
                type="button"
                onClick={() => setIsReferModalOpen(true)}
                className="btn btn-primary"
                style={{ fontWeight: 700, padding: '0.6rem 1.25rem' }}
              >
                <Plus size={16} style={{ marginRight: '0.35rem' }} />
                Refer Your First Patient
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 650 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '0.85rem 1.25rem', fontWeight: 750 }}>Patient Details</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 750 }}>Date Referred</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 750 }}>Notes</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 750 }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 750 }}>Billed Amount</th>
                    <th style={{ padding: '0.85rem 1.25rem', fontWeight: 750, textAlign: 'right' }}>Your Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {myReferredPatients.map((patient) => {
                    const isAccepted = patient.status === 'Approved' || patient.status === 'Converted';
                    const isRejected = patient.status === 'Rejected';
                    const billed = Number(patient.billedAmount || 0);
                    const effectiveRate = Number(patient.partnerCommissionPercent) || commissionPercent;
                    const patientCommission = billed > 0
                      ? Math.round((billed * effectiveRate) / 100)
                      : (Number(patient.referralCommissionRupees) || 0);

                    return (
                      <tr 
                        key={patient.id} 
                        style={{ 
                          borderBottom: '1px solid #F1F5F9',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {/* Patient Name & Phone */}
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 750, color: 'var(--primary-navy-950)', fontSize: '0.92rem' }}>
                            {patient.patientName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                            <Phone size={12} />
                            <span>{patient.patientPhone}</span>
                          </div>
                        </td>

                        {/* Date Referred */}
                        <td style={{ padding: '1rem 1rem', fontSize: '0.82rem', color: '#475569', whiteSpace: 'nowrap' }}>
                          {patient.submittedAt ? formatDateTimeDDMMYY(patient.submittedAt) : 'Recent'}
                        </td>

                        {/* Notes */}
                        <td style={{ padding: '1rem 1rem', fontSize: '0.82rem', color: '#475569', maxWidth: 220 }}>
                          {patient.notes ? (
                            <div style={{ lineHeight: 1.4, wordBreak: 'break-word' }}>
                              {patient.notes}
                            </div>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>—</span>
                          )}
                        </td>

                        {/* Status (Accepted / Rejected / Pending) with reason */}
                        <td style={{ padding: '1rem 1rem' }}>
                          {isAccepted ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '0.25rem 0.65rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 750 }}>
                              <CheckCircle2 size={13} style={{ color: '#10B981' }} />
                              <span>Accepted</span>
                            </div>
                          ) : isRejected ? (
                            <div>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', padding: '0.25rem 0.65rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 750 }}>
                                <XCircle size={13} style={{ color: '#EF4444' }} />
                                <span>Rejected</span>
                              </div>
                              {/* Show rejection reason directly to the partner */}
                              {patient.rejectionReason && (
                                <div style={{ fontSize: '0.74rem', color: '#991B1B', marginTop: '0.3rem', background: '#FFF1F2', padding: '0.2rem 0.45rem', borderRadius: 6, lineHeight: 1.35 }}>
                                  <strong>Reason:</strong> {patient.rejectionReason}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', padding: '0.25rem 0.65rem', borderRadius: 999, fontSize: '0.78rem', fontWeight: 750 }}>
                              <Clock size={13} style={{ color: '#F59E0B' }} />
                              <span>Pending Review</span>
                            </div>
                          )}
                        </td>

                        {/* Total Billed Amount */}
                        <td style={{ padding: '1rem 1rem', fontSize: '0.86rem', fontWeight: 650, color: billed > 0 ? '#1E293B' : '#94A3B8' }}>
                          {billed > 0 ? `₹${billed.toLocaleString('en-IN')}` : 'Pending billing'}
                        </td>

                        {/* Partner Earnings per Patient */}
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          {isAccepted ? (
                            <div>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#047857' }}>
                                ₹{patientCommission.toLocaleString('en-IN')}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                {billed > 0 ? `(${effectiveRate}% of ₹${billed.toLocaleString('en-IN')})` : `(${effectiveRate}% configured)`}
                              </div>
                            </div>
                          ) : isRejected ? (
                            <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>₹0</span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#D97706', fontWeight: 600 }}>Awaiting acceptance</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Refer a Patient Modal (STRICTLY 3 FIELDS: Name, Contact, Notes - ZERO PLACEHOLDERS) */}
      {isReferModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 100,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            width: '100%',
            maxWidth: 480,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                  Refer a Patient
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.15rem 0 0 0' }}>
                  Our care desk will call the patient and assign a qualified nurse.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReferModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '0.35rem',
                  borderRadius: 8
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitReferral} style={{ padding: '1.25rem 1.5rem' }}>
              {errorMsg && (
                <div style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#B91C1C',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Field 1: Patient Name (NO placeholder) */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--primary-navy-900)', fontSize: '0.86rem' }}>
                  Patient Name *
                </label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="form-control"
                  style={{ fontWeight: 600 }}
                />
              </div>

              {/* Field 2: Contact Number (NO placeholder) */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--primary-navy-900)', fontSize: '0.86rem' }}>
                  Contact Number *
                </label>
                <input
                  type="tel"
                  required
                  value={patientPhoneInput}
                  onChange={(e) => setPatientPhoneInput(e.target.value)}
                  className="form-control"
                  style={{ fontWeight: 600 }}
                />
              </div>

              {/* Field 3: Notes (NO placeholder) */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 700, color: 'var(--primary-navy-900)', fontSize: '0.86rem' }}>
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-control"
                  style={{ fontWeight: 500, resize: 'vertical' }}
                />
              </div>

              {/* Commission note */}
              <div style={{
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: 8,
                padding: '0.65rem 0.85rem',
                fontSize: '0.78rem',
                color: '#0369A1',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}>
                <Percent size={15} style={{ flexShrink: 0 }} />
                <span>
                  Your partner commission ({commissionPercent}%) will be automatically calculated when this patient is accepted and billed.
                </span>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsReferModalOpen(false)}
                  className="btn btn-outline"
                  style={{ fontWeight: 600 }}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontWeight: 700, minWidth: 140, justifyContent: 'center' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Referral'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
