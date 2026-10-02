import { NurseProfile, Booking, NurseLead, ServiceItem } from '../types';
import { generateNurseReferralCode } from './supabase';

export interface NurseFinancialMetrics {
  // Visits
  myVisits: Booking[];
  activeVisits: Booking[];
  completedVisits: Booking[];
  activeVisitsCount: number;
  completedVisitsCount: number;
  completedVisitsEarnings: number; // 70% service charge for completed visits

  // Referrals
  myLeads: NurseLead[];
  myConvertedLeads: NurseLead[];
  totalLeadsCount: number;
  convertedLeadsCount: number;
  referralEarnings: number; // 10% procedure fee from converted patient referrals (or admin adjusted cash)

  // Totals
  totalMoney: number; // completedVisitsEarnings (70%) + referralEarnings (10%)
  totalPoints: number; // live points
  referralCode: string;
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
  const nurseId = nurse.id;
  const nurseNameClean = (nurse.name || '').toLowerCase().trim();
  const nursePhoneClean = (nurse.phone || '').replace(/\D/g, '');
  const nurseLast10 = nursePhoneClean.length >= 10 ? nursePhoneClean.slice(-10) : nursePhoneClean;

  // 1. Filter Bookings assigned to THIS nurse
  const myVisits = bookings.filter((b) => {
    if (b.assignedNurseId && b.assignedNurseId === nurseId) return true;
    if (nursePhoneClean && (b as any).assignedNursePhone && (b as any).assignedNursePhone.replace(/\D/g, '').endsWith(nurseLast10)) return true;
    if (nurseNameClean && b.assignedNurseName && b.assignedNurseName.toLowerCase().includes(nurseNameClean)) return true;
    return false;
  });

  const activeVisits = myVisits.filter((b) => b.status === 'Assigned' || b.status === 'In-Progress');
  const completedVisits = myVisits.filter((b) => b.status === 'Completed');

  // Completed visit earnings (70% service charge for completed visits)
  let completedVisitsEarnings = 0;
  completedVisits.forEach((visit) => {
    const procedure = services.find((s) => s.id === visit.serviceId);
    const fee = Number(visit.finalFee !== undefined ? visit.finalFee : (visit.estimatedFee || (procedure ? procedure.priceNumber : 899)));
    completedVisitsEarnings += Math.round(fee * 0.70);
  });

  // 2. Filter Leads submitted by THIS nurse
  const myLeads = leads.filter((l) => {
    if (l.nurseId && l.nurseId === nurseId) return true;
    const lNurseClean = (l.referredNursePhone || '').replace(/\D/g, '');
    if (nurseLast10 && lNurseClean && lNurseClean.endsWith(nurseLast10)) return true;
    const lPatClean = (l.patientPhone || '').replace(/\D/g, '');
    if (nurseLast10 && lPatClean && lPatClean.endsWith(nurseLast10)) return true;
    if (nurseNameClean && l.nurseName && l.nurseName.toLowerCase().includes(nurseNameClean)) return true;
    return false;
  });

  const myConvertedLeads = myLeads.filter((l) =>
    l.status === 'Converted' ||
    (l.status === 'Approved' && (l.referralType === 'nurse' || Boolean(l.referredNursePhone)))
  );

  // 10% procedure fee from converted patient referrals
  let referralCommissionFromLeads = 0;
  myConvertedLeads.forEach((lead) => {
    if (lead.referralType !== 'nurse' && !lead.referredNursePhone) {
      const procedure = services.find((s) => s.id === lead.serviceId);
      const fee = Number(lead.leadValueRupees) || (procedure?.priceNumber ?? 800);
      referralCommissionFromLeads += Math.round(fee * 0.10);
    }
  });

  // Respect any admin manual adjustment to referral cash if higher
  const manualReferralCash = Number(nurse.referralEarningsRupees || 0);
  const referralEarnings = Math.max(referralCommissionFromLeads, manualReferralCash);

  // Total rupee earnings (70% visits + 10% referrals)
  const totalMoney = completedVisitsEarnings + referralEarnings;

  // Total points: strictly prioritize nurse.pointsEarned set by Admin/system
  const totalPoints = (nurse.pointsEarned !== undefined && nurse.pointsEarned !== null && !isNaN(Number(nurse.pointsEarned)))
    ? Number(nurse.pointsEarned)
    : (myConvertedLeads.length * 50);

  const totalLeadsCount = Math.max(Number(nurse.totalLeads || 0), myLeads.length);
  const convertedLeadsCount = Math.max(Number(nurse.convertedLeads || 0), myConvertedLeads.length);

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
    totalLeadsCount,
    convertedLeadsCount,
    referralEarnings,
    totalMoney,
    totalPoints,
    referralCode
  };
}
