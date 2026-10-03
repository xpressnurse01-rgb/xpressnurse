import { NurseProfile, Booking, NurseLead, ServiceItem } from '../types';
import { generateNurseReferralCode } from './supabase';

export interface NurseFinancialMetrics {
  // Visits
  myVisits: Booking[];
  activeVisits: Booking[];
  completedVisits: Booking[];
  activeVisitsCount: number;
  completedVisitsCount: number;
  completedVisitsEarnings: number; // Strictly 70% service charge for visits completed by this nurse

  // Referrals
  myLeads: NurseLead[];
  myConvertedLeads: NurseLead[];
  completedReferredVisits: Booking[];
  completedReferredVisitsCount: number;
  totalLeadsCount: number;
  convertedLeadsCount: number;
  referralEarnings: number; // Strictly 10% on referred patient service completion

  // Totals
  totalMoney: number; // completedVisitsEarnings (70%) + referralEarnings (10% on completed referred patient visits)
  totalPoints: number; // live points
  referralCode: string;
}

/**
 * Normalizes phone numbers to their last 10 digits for accurate cross-system matching.
 */
export function normalizePhone10(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Normalizes service titles or IDs into canonical keys to detect identical procedures.
 */
export function normalizeServiceKey(serviceId?: string, serviceTitle?: string): string {
  const s = ((serviceId || '') + ' ' + (serviceTitle || '')).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (s.includes('ryles') || s.includes('nasogastric')) return 'ryles-tube';
  if (s.includes('wound') || s.includes('dressing')) return 'wound-dressing';
  if (s.includes('catheter') || s.includes('foley')) return 'foleys-catheter';
  if (s.includes('saline') || s.includes('infusion')) return 'saline-infusion';
  if (s.includes('suture') || s.includes('stitch')) return 'suture-removal';
  if (s.includes('injection') || s.includes('iv') || s.includes('im')) return 'injection-administration';
  if (s.includes('vital')) return 'vital-monitoring';
  if (s.includes('elderly')) return 'elderly-care';
  if (s.includes('lab') || s.includes('diagnostic')) return 'lab-diagnostics';
  if (s.includes('doctor') || s.includes('consult')) return 'doctor-consult';
  return (serviceId || serviceTitle || 'service').toLowerCase().trim();
}

/**
 * Determines whether two bookings represent the same patient visit.
 */
export function areBookingsDuplicate(a: Booking, b: Booking): boolean {
  if (!a || !b) return false;
  if (a.id === b.id) return true;

  const phoneA = normalizePhone10(a.patientPhone);
  const phoneB = normalizePhone10(b.patientPhone);
  const nameA = (a.patientName || '').toLowerCase().trim();
  const nameB = (b.patientName || '').toLowerCase().trim();
  const srvA = normalizeServiceKey(a.serviceId, a.serviceTitle);
  const srvB = normalizeServiceKey(b.serviceId, b.serviceTitle);

  const samePhone = phoneA.length >= 10 && phoneB.length >= 10 && phoneA === phoneB;
  const sameName = Boolean(nameA && nameB && nameA === nameB);
  const sameService = srvA === srvB;

  if (!sameService) return false;
  if (!samePhone && !sameName) return false;

  // Active / open visits for the same patient and procedure
  const activeStatuses = new Set(['Pending', 'Assigned', 'In-Progress']);
  if (activeStatuses.has(a.status) && activeStatuses.has(b.status)) {
    return true;
  }

  // Same referring nurse referral
  if (a.referringNurseId && b.referringNurseId && a.referringNurseId === b.referringNurseId) {
    return true;
  }

  // Referral notes match
  if (a.notes && b.notes && a.notes.includes('Patient Referral') && b.notes.includes('Patient Referral')) {
    return true;
  }

  // Created on the same day (within 24 hours)
  if (a.createdAt && b.createdAt) {
    const diffHours = Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) return true;
  }

  return false;
}

function getBookingScore(b: Booking): number {
  let score = 0;
  if (b.status === 'Completed') score += 50;
  else if (b.status === 'In-Progress') score += 40;
  else if (b.status === 'Assigned') score += 30;
  else if (b.status === 'Pending') score += 20;

  if (b.assignedNurseId) score += 10;
  if (b.nurseAcceptanceStatus === 'Accepted') score += 5;
  if (b.hasPrescription) score += 2;
  if (b.fullAddress && b.fullAddress.length > 5) score += 2;
  if (b.notes && b.notes.length > 5) score += 1;
  return score;
}

function mergeDuplicateBookings(preferred: Booking, secondary: Booking): Booking {
  return {
    ...secondary,
    ...preferred,
    patientPhone: preferred.patientPhone || secondary.patientPhone,
    patientName: preferred.patientName || secondary.patientName,
    fullAddress: preferred.fullAddress || secondary.fullAddress,
    area: preferred.area || secondary.area,
    serviceId: preferred.serviceId || secondary.serviceId,
    serviceTitle: preferred.serviceTitle || secondary.serviceTitle,
    assignedNurseId: preferred.assignedNurseId || secondary.assignedNurseId,
    assignedNurseName: preferred.assignedNurseName || secondary.assignedNurseName,
    referringNurseId: preferred.referringNurseId || secondary.referringNurseId,
    referringNurseName: preferred.referringNurseName || secondary.referringNurseName,
    referralBonusRupees: preferred.referralBonusRupees || secondary.referralBonusRupees,
    hasPrescription: preferred.hasPrescription || secondary.hasPrescription,
    prescriptionUrl: preferred.prescriptionUrl || secondary.prescriptionUrl,
    prescriptionFileName: preferred.prescriptionFileName || secondary.prescriptionFileName,
    notes: preferred.notes || secondary.notes
  };
}

/**
 * Universal deduplication engine for Bookings.
 * Merges duplicate entries into single high-fidelity bookings.
 */
export function deduplicateBookings(bookingList: Booking[] = []): Booking[] {
  if (!Array.isArray(bookingList) || bookingList.length === 0) return [];

  const result: Booking[] = [];
  const seenIds = new Set<string>();

  for (const b of bookingList) {
    if (!b || !b.id) continue;

    const existingIndex = result.findIndex((existing) => areBookingsDuplicate(existing, b));

    if (existingIndex === -1) {
      if (!seenIds.has(b.id)) {
        seenIds.add(b.id);
        result.push(b);
      }
    } else {
      const existing = result[existingIndex];
      const existingScore = getBookingScore(existing);
      const newScore = getBookingScore(b);

      if (newScore > existingScore) {
        seenIds.delete(existing.id);
        seenIds.add(b.id);
        result[existingIndex] = mergeDuplicateBookings(b, existing);
      } else {
        result[existingIndex] = mergeDuplicateBookings(existing, b);
      }
    }
  }

  return result;
}

/**
 * Universal deduplication engine for Nurse Leads.
 */
export function deduplicateLeads(leadsList: NurseLead[] = []): NurseLead[] {
  if (!Array.isArray(leadsList) || leadsList.length === 0) return [];

  const result: NurseLead[] = [];
  const seenIds = new Set<string>();

  for (const l of leadsList) {
    if (!l || !l.id) continue;

    const phone10 = normalizePhone10(l.patientPhone || l.referredNursePhone);
    const name = (l.patientName || l.referredNurseName || '').toLowerCase().trim();
    const srv = normalizeServiceKey(l.serviceId);

    const existingIndex = result.findIndex((ex) => {
      if (ex.id === l.id) return true;
      const exPhone = normalizePhone10(ex.patientPhone || ex.referredNursePhone);
      const exName = (ex.patientName || ex.referredNurseName || '').toLowerCase().trim();
      const exSrv = normalizeServiceKey(ex.serviceId);

      if (phone10 && exPhone && phone10 === exPhone && (srv === exSrv || !srv || !exSrv)) return true;
      if (name && exName && name === exName && l.nurseId === ex.nurseId) return true;
      return false;
    });

    if (existingIndex === -1) {
      if (!seenIds.has(l.id)) {
        seenIds.add(l.id);
        result.push(l);
      }
    } else {
      const existing = result[existingIndex];
      // If either record is Rejected or has rejectionReason, preserve the rejection
      if (l.status === 'Rejected' || Boolean(l.rejectionReason)) {
        result[existingIndex] = {
          ...existing,
          ...l,
          status: 'Rejected',
          rejectionReason: l.rejectionReason || existing.rejectionReason || 'Rejected by Admin review',
          adminNotes: l.adminNotes || existing.adminNotes
        };
      } else if (existing.status === 'Rejected' && l.status !== 'Converted') {
        result[existingIndex] = {
          ...l,
          ...existing,
          status: 'Rejected',
          rejectionReason: existing.rejectionReason || l.rejectionReason || 'Rejected by Admin review'
        };
      } else {
        const statusRank: Record<string, number> = { 'Converted': 4, 'Approved': 3, 'Pending Approval': 2, 'Pending': 2, 'Submitted': 2, 'Contacted': 2 };
        const exRank = statusRank[existing.status] || 0;
        const newRank = statusRank[l.status] || 0;

        if (newRank >= exRank) {
          result[existingIndex] = { ...existing, ...l };
        }
      }
    }
  }

  return result;
}

/**
 * Universal calculation engine that guarantees 100% synchronization of nurse amounts,
 * visits, leads, and points between NurseDashboard, AdminDashboard, and anywhere in the app.
 */
export function calculateNurseMetrics(
  nurse: NurseProfile,
  bookings: Booking[] = [],
  leads: NurseLead[] = [],
  services: ServiceItem[] = []
): NurseFinancialMetrics {
  const cleanBookings = deduplicateBookings(bookings);
  const cleanLeads = deduplicateLeads(leads);

  const nurseId = nurse.id;
  const nurseNameClean = (nurse.name || '').toLowerCase().trim();
  const nursePhoneClean = (nurse.phone || '').replace(/\D/g, '');
  const nurseLast10 = nursePhoneClean.length >= 10 ? nursePhoneClean.slice(-10) : nursePhoneClean;

  // 1. Filter Bookings assigned to THIS nurse
  const myVisits = cleanBookings.filter((b) => {
    if (b.assignedNurseId && b.assignedNurseId === nurseId) return true;
    if (nursePhoneClean && (b as any).assignedNursePhone && (b as any).assignedNursePhone.replace(/\D/g, '').endsWith(nurseLast10)) return true;
    if (nurseNameClean && b.assignedNurseName && b.assignedNurseName.toLowerCase().includes(nurseNameClean)) return true;
    return false;
  });

  const activeVisits = myVisits.filter((b) => b.status === 'Assigned' || b.status === 'In-Progress');
  const completedVisits = myVisits.filter((b) => b.status === 'Completed');

  // 1. Completed visit earnings: strictly 70% of service charge for completed visits assigned to this nurse
  let completedVisitsEarnings = 0;
  completedVisits.forEach((visit) => {
    const procedure = services.find((s) => s.id === visit.serviceId);
    const fee = Number(visit.finalFee !== undefined && visit.finalFee !== null ? visit.finalFee : (visit.estimatedFee || (procedure ? procedure.priceNumber : 800)));
    completedVisitsEarnings += Math.round(fee * 0.70);
  });

  // 2. Filter Leads submitted by THIS nurse
  const myLeads = cleanLeads.filter((l) => {
    if (l.nurseId && l.nurseId === nurseId) return true;
    const lNurseClean = (l.referredNursePhone || '').replace(/\D/g, '');
    if (nurseLast10 && lNurseClean && lNurseClean.endsWith(nurseLast10)) return true;
    const lPatClean = (l.patientPhone || '').replace(/\D/g, '');
    if (nurseLast10 && lPatClean && lPatClean.endsWith(nurseLast10)) return true;
    if (nurseNameClean && l.nurseName && l.nurseName.toLowerCase().includes(nurseNameClean)) return true;
    return false;
  });

  const myPatientLeads = myLeads.filter((l) => l.referralType !== 'nurse' && !l.referredNursePhone);

  // 3. Strictly find all COMPLETED bookings for patients referred by THIS nurse
  // Referral earnings are strictly 10% and ONLY awarded on referred patient service completion
  const completedReferredVisits: Booking[] = [];
  const seenReferredBookingIds = new Set<string>();

  cleanBookings.forEach((b) => {
    // Must be completed service
    if (b.status !== 'Completed') return;
    if (seenReferredBookingIds.has(b.id)) return;

    // Check direct nurse referral on the booking
    const isDirectRef = Boolean(
      (b.referringNurseId && b.referringNurseId === nurseId) ||
      (nursePhoneClean && (b as any).referringNursePhone && (b as any).referringNursePhone.replace(/\D/g, '').endsWith(nurseLast10)) ||
      (nurseNameClean && b.referringNurseName && b.referringNurseName.toLowerCase().includes(nurseNameClean))
    );

    // Check matching patient lead submitted by this nurse
    const isMatchedLeadRef = !isDirectRef && myPatientLeads.some((l) => {
      const lPhone = normalizePhone10(l.patientPhone);
      const bPhone = normalizePhone10(b.patientPhone);
      const lName = (l.patientName || '').toLowerCase().trim();
      const bName = (b.patientName || '').toLowerCase().trim();
      const cleanLeadDigits = l.id.replace(/\D/g, '') || l.id.slice(-6);

      if (b.id === `BK-${cleanLeadDigits.slice(-6)}` || b.id === `BK-${cleanLeadDigits.slice(-4)}`) return true;
      if (lPhone && bPhone && lPhone === bPhone && lPhone.length >= 10) return true;
      if (lName && bName && lName === bName) return true;
      return false;
    });

    if (isDirectRef || isMatchedLeadRef) {
      seenReferredBookingIds.add(b.id);
      completedReferredVisits.push(b);
    }
  });

  // Strictly 10% on referred patient service completion
  let referralEarnings = 0;
  completedReferredVisits.forEach((visit) => {
    const procedure = services.find((s) => s.id === visit.serviceId);
    const fee = Number(visit.finalFee !== undefined && visit.finalFee !== null ? visit.finalFee : (visit.estimatedFee || (procedure ? procedure.priceNumber : 800)));
    referralEarnings += Math.round(fee * 0.10);
  });

  // Total rupee earnings strictly: 70% service earnings + 10% on referred patient service completion
  const totalMoney = completedVisitsEarnings + referralEarnings;

  // Converted leads: colleague nurse referrals that are approved/converted + patient referrals with completed service
  const myConvertedLeads = myLeads.filter((l) => {
    if (l.status === 'Rejected' || Boolean(l.rejectionReason)) return false;
    if (l.referralType === 'nurse' || Boolean(l.referredNursePhone)) {
      return l.status === 'Converted' || l.status === 'Approved';
    }
    const lPhone = normalizePhone10(l.patientPhone);
    const lName = (l.patientName || '').toLowerCase().trim();
    const cleanLeadDigits = l.id.replace(/\D/g, '') || l.id.slice(-6);

    const hasCompletedVisit = completedReferredVisits.some((b) => {
      if (b.id === `BK-${cleanLeadDigits.slice(-6)}` || b.id === `BK-${cleanLeadDigits.slice(-4)}`) return true;
      const bPhone = normalizePhone10(b.patientPhone);
      if (lPhone && bPhone && lPhone === bPhone && lPhone.length >= 10) return true;
      const bName = (b.patientName || '').toLowerCase().trim();
      if (lName && bName && lName === bName) return true;
      return false;
    });

    return hasCompletedVisit || l.status === 'Converted';
  });

  // Total points: live points earned from completed patient referrals and approved colleague nurses (+50 pts each)
  const basePointsFromLeads = myConvertedLeads.reduce((acc, l) => acc + (Number(l.pointsAwarded) || 50), 0);
  const totalPoints = (nurse.pointsEarned !== undefined && nurse.pointsEarned !== null && !isNaN(Number(nurse.pointsEarned)))
    ? Math.max(Number(nurse.pointsEarned), basePointsFromLeads)
    : basePointsFromLeads;

  const totalLeadsCount = Math.max(Number(nurse.totalLeads || 0), myLeads.length);
  const convertedLeadsCount = Math.max(Number(nurse.convertedLeads || 0), myConvertedLeads.length, completedReferredVisits.length);

  const referralCode = nurse.referralCode || generateNurseReferralCode(nurse.name, nurse.id, nurse.phone || '');

  return {
    myVisits,
    activeVisits,
    completedVisits,
    activeVisitsCount: activeVisits.length,
    completedVisitsCount: completedVisits.length,
    completedVisitsEarnings,
    myLeads,
    myConvertedLeads,
    completedReferredVisits,
    completedReferredVisitsCount: completedReferredVisits.length,
    totalLeadsCount,
    convertedLeadsCount,
    referralEarnings,
    totalMoney,
    totalPoints,
    referralCode
  };
}
