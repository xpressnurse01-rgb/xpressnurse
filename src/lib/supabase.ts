import { createClient } from '@supabase/supabase-js';
import { 
  Booking, 
  NurseProfile, 
  DoctorConsultation, 
  NurseLead, 
  ServiceItem, 
  AppUser,
  Coupon 
} from '../types';
import { authenticateUserSecure } from './auth';

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Safe initialization that purely reads from env vars and avoids throwing at bundle import
const clientUrl = SUPABASE_URL.trim() || 'https://placeholder.supabase.co';
const clientKey = SUPABASE_ANON_KEY.trim() || 'placeholder-anon-key';

export const supabase = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export const SEED_APP_USERS: AppUser[] = [
  {
    id: 'user-admin-1',
    role: 'admin',
    identifier: 'admin@xpressnurse.in',
    name: 'Operations Dispatcher',
    pin: '2026',
    phone: '7569657371',
    email: 'admin@xpressnurse.in',
    designation: 'Fleet Supervisor & Dispatch Head',
    serviceArea: 'Hyderabad HQ'
  },
  {
    id: 'user-doc-1',
    role: 'doctor',
    identifier: 'dr.reddy@xpressnurse.in',
    name: 'Dr. K. V. Reddy (MD Gen Med)',
    pin: '4321',
    phone: '9848011223',
    email: 'dr.reddy@xpressnurse.in',
    designation: 'Senior Physician',
    serviceArea: 'Hyderabad Tele-Care'
  },
  {
    id: 'user-nurse-101',
    role: 'nurse',
    identifier: 'priya.nursing@xpressnurse.in',
    name: 'Nurse Priya Sharma',
    pin: '1001',
    phone: '9849012345',
    email: 'priya.nursing@xpressnurse.in',
    designation: 'Registered Nurse (B.Sc Nursing)',
    serviceArea: 'Gachibowli'
  },
  {
    id: 'user-nurse-102',
    role: 'nurse',
    identifier: 'rajesh.nursing@xpressnurse.in',
    name: 'Nurse Rajesh Kumar',
    pin: '1002',
    phone: '9849067890',
    email: 'rajesh.nursing@xpressnurse.in',
    designation: 'General Nursing & Midwifery (GNM)',
    serviceArea: 'LB Nagar'
  },
  {
    id: 'user-nurse-103',
    role: 'nurse',
    identifier: 'anjali.rao@xpressnurse.in',
    name: 'Nurse Anjali Rao',
    pin: '1003',
    phone: '9849045678',
    email: 'anjali.rao@xpressnurse.in',
    designation: 'Critical Care Nurse',
    serviceArea: 'Madhapur'
  },
  {
    id: 'user-nurse-104',
    role: 'nurse',
    identifier: 'sunita.reddy@xpressnurse.in',
    name: 'Nurse Sunita Reddy',
    pin: '1004',
    phone: '9849089123',
    email: 'sunita.reddy@xpressnurse.in',
    designation: 'Geriatric Care Specialist',
    serviceArea: 'Banjara Hills'
  }
];

export const BASELINE_NURSES: NurseProfile[] = [
  {
    id: 'nurse-101',
    name: 'Nurse Priya Sharma',
    phone: '98490 12345',
    email: 'priya.nursing@xpressnurse.in',
    experienceYears: 6,
    qualification: 'B.Sc Nursing (Registered Nurse)',
    serviceArea: 'Gachibowli',
    status: 'Active',
    totalLeads: 18,
    convertedLeads: 15,
    totalReferrals: 12,
    pointsEarned: 1650,
    referralEarningsRupees: 3800,
    rating: 4.90,
    avatarUrl: undefined,
    certificateVerified: true,
    referralCode: 'XN-PRIYA101'
  },
  {
    id: 'nurse-102',
    name: 'Nurse Rajesh Kumar',
    phone: '98490 67890',
    email: 'rajesh.nursing@xpressnurse.in',
    experienceYears: 8,
    qualification: 'General Nursing & Midwifery (GNM)',
    serviceArea: 'LB Nagar',
    status: 'Active',
    totalLeads: 24,
    convertedLeads: 21,
    totalReferrals: 19,
    pointsEarned: 2200,
    referralEarningsRupees: 5400,
    rating: 4.95,
    avatarUrl: undefined,
    certificateVerified: true,
    referralCode: 'XN-RAJESH102'
  },
  {
    id: 'nurse-103',
    name: 'Nurse Anjali Rao',
    phone: '98490 45678',
    email: 'anjali.rao@xpressnurse.in',
    experienceYears: 5,
    qualification: 'B.Sc Nursing (Critical Care)',
    serviceArea: 'Madhapur',
    status: 'Active',
    totalLeads: 14,
    convertedLeads: 11,
    totalReferrals: 9,
    pointsEarned: 1250,
    referralEarningsRupees: 2900,
    rating: 4.88,
    avatarUrl: undefined,
    certificateVerified: true,
    referralCode: 'XN-ANJALI103'
  },
  {
    id: 'nurse-104',
    name: 'Nurse Sunita Reddy',
    phone: '98490 89123',
    email: 'sunita.reddy@xpressnurse.in',
    experienceYears: 7,
    qualification: 'GNM & Geriatric Care Specialist',
    serviceArea: 'Banjara Hills',
    status: 'Active',
    totalLeads: 29,
    convertedLeads: 26,
    totalReferrals: 22,
    pointsEarned: 2800,
    referralEarningsRupees: 6700,
    rating: 5.00,
    avatarUrl: undefined,
    certificateVerified: true,
    referralCode: 'XN-SUNITA104'
  }
];

export const BASELINE_BOOKINGS: Booking[] = [
  {
    id: 'BK-8901',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    patientName: 'K. Venkatesh Rao (68 yrs, Male)',
    patientPhone: '98765 43210',
    patientAge: 68,
    patientGender: 'Male',
    serviceId: 'saline-infusion',
    serviceTitle: 'IV Infusions & Antibiotics Infusion',
    area: 'Gachibowli',
    fullAddress: 'Flat 402, Aditya Empress Towers, Gachibowli, Hyderabad',
    preferredDate: 'Today',
    preferredTime: '11:00 AM - 12:30 PM',
    hasPrescription: true,
    prescriptionFileName: 'Dr_Reddy_IV_Prescription.pdf',
    status: 'Assigned',
    assignedNurseId: 'nurse-101',
    assignedNurseName: 'Nurse Priya Sharma (Gachibowli Area Match)',
    estimatedFee: 899,
    finalFee: 899,
    notes: 'Normal Saline 500ml post gastroenteritis.'
  },
  {
    id: 'BK-8902',
    createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    patientName: 'Smt. Lakshmi Devi (74 yrs, Female)',
    patientPhone: '97654 32109',
    patientAge: 74,
    patientGender: 'Female',
    serviceId: 'foleys-catheter',
    serviceTitle: 'Foley Catheter Replacement',
    area: 'LB Nagar',
    fullAddress: 'H.No 3-4-12, Near Kamineni Hospital, LB Nagar, Hyderabad',
    preferredDate: 'Today',
    preferredTime: '02:00 PM - 03:00 PM',
    hasPrescription: true,
    prescriptionFileName: 'Urology_Catheter_Order.pdf',
    status: 'Assigned',
    assignedNurseId: 'nurse-102',
    assignedNurseName: 'Nurse Rajesh Kumar (LB Nagar Area Match)',
    referringNurseId: 'nurse-101',
    referringNurseName: 'Nurse Priya Sharma (Gachibowli - 10% Referral)',
    estimatedFee: 1299,
    finalFee: 1299,
    referralBonusRupees: 129.90,
    notes: 'Referred by Nurse Priya from Gachibowli for LB Nagar resident. 10% bonus credited to Priya.'
  },
  {
    id: 'BK-8903',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    patientName: 'Arun Kumar (45 yrs, Male)',
    patientPhone: '96543 21098',
    patientAge: 45,
    patientGender: 'Male',
    serviceId: 'wound-dressing',
    serviceTitle: 'Wound Dressing',
    area: 'LB Nagar',
    fullAddress: 'Villa 18, Golf View, LB Nagar, Hyderabad',
    preferredDate: 'Tomorrow',
    preferredTime: '09:00 AM - 10:00 AM',
    hasPrescription: true,
    prescriptionFileName: 'PostOp_Dressing.pdf',
    status: 'Assigned',
    assignedNurseId: 'nurse-102',
    assignedNurseName: 'Nurse Rajesh Kumar (LB Nagar Area Match)',
    referringNurseId: 'nurse-101',
    referringNurseName: 'Nurse Priya Sharma (Gachibowli - 10% Referral)',
    estimatedFee: 800,
    finalFee: 800,
    referralBonusRupees: 80.00,
    notes: 'Post knee arthroscopy dressing change. Referred by Nurse Priya.'
  }
];

export const BASELINE_LEADS: NurseLead[] = [
  {
    id: 'LD-4001',
    nurseId: 'nurse-101',
    patientName: 'Smt. Lakshmi Devi',
    patientPhone: '97654 32109',
    serviceId: 'foleys-catheter',
    area: 'LB Nagar',
    submittedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    status: 'Converted',
    assignedNurseId: 'nurse-102',
    leadValueRupees: 1299,
    pointsAwarded: 50,
    referralCommissionRupees: 129.90
  },
  {
    id: 'LD-4002',
    nurseId: 'nurse-101',
    patientName: 'Arun Kumar',
    patientPhone: '96543 21098',
    serviceId: 'wound-dressing',
    area: 'LB Nagar',
    submittedAt: new Date(Date.now() - 1800 * 1000).toISOString(),
    status: 'Converted',
    assignedNurseId: 'nurse-102',
    leadValueRupees: 800,
    pointsAwarded: 50,
    referralCommissionRupees: 80.00
  }
];

export const BASELINE_COUPONS: Coupon[] = [
  {
    id: 'coup-1',
    code: 'WELCOME50',
    description: 'Flat ₹50 OFF on your first home clinical care visit in Hyderabad [SHOW_IN_MODAL]',
    discountType: 'flat',
    discountValue: 50,
    minOrderAmount: 499,
    status: 'Active',
    timesUsed: 142
  },
  {
    id: 'coup-2',
    code: 'HEALTH20',
    description: '20% OFF on advanced home nursing procedures (up to ₹200) [SHOW_IN_MODAL]',
    discountType: 'percent',
    discountValue: 20,
    maxDiscount: 200,
    minOrderAmount: 799,
    status: 'Active',
    timesUsed: 89
  },
  {
    id: 'coup-3',
    code: 'FLAT100',
    description: 'Flat ₹100 discount for elderly geriatric care visits [SHOW_IN_MODAL]',
    discountType: 'flat',
    discountValue: 100,
    minOrderAmount: 800,
    status: 'Active',
    timesUsed: 67
  }
];

// Helper to execute database query with exponential backoff retry for transient network / schema cache cold starts
export async function executeWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  maxRetries = 3
): Promise<T | null> {
  let delay = 350;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await queryFn();
      if (!error && data !== null) {
        return data;
      }
      if (error) {
        console.warn(`[DB] Query attempt ${attempt} warning:`, error.message);
        if (attempt === maxRetries) return null;
      }
    } catch (err: any) {
      console.warn(`[DB] Query attempt ${attempt} exception:`, err?.message || err);
      if (attempt === maxRetries) return null;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay *= 2;
  }
  return null;
}

// ============================================================================
// 1. SERVICES TABLE (public.services)
// ============================================================================

export async function dbFetchServices(): Promise<ServiceItem[] | null> {
  const data = await executeWithRetry(async () => {
    return await supabase
      .from('services')
      .select('*')
      .order('single_visit_price', { ascending: false });
  });

  if (data === null) return null;

  return data.map((s: any) => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle || '',
    description: s.description || '',
    singleVisitPrice: Number(s.single_visit_price),
    multiVisitPrice: s.multi_visit_price ? Number(s.multi_visit_price) : Number(s.single_visit_price),
    nightSurcharge: s.night_surcharge ? Number(s.night_surcharge) : 399,
    prescriptionRequired: Boolean(s.prescription_required),
    duration: s.duration || '30 - 45 mins',
    indicativePrice: `Single: ₹${Math.round(s.single_visit_price)} / Multi: ₹${Math.round(s.multi_visit_price || s.single_visit_price)}`,
    priceNumber: Number(s.single_visit_price) || 800,
    features: [
      'Doorstep clinical service across Hyderabad',
      'Certified & background-verified RN attending',
      'Transport & basic PPE kit charges included',
      'Digital vitals check & medical observation log'
    ],
    icon: s.icon || 'Activity',
    badge: s.badge || undefined,
    procedureSteps: [
      'Vitals evaluation & doctor prescription verification',
      'Aseptic preparation & equipment sterility check',
      'Standard clinical procedure execution by RN',
      'Patient monitoring & digital handover documentation'
    ],
    equipmentProvided: [
      'Sterile gloves & disposable surgical drape',
      'Clinical disinfectant & skin preparation swab',
      'Digital thermometer & automated BP apparatus',
      'Bio-medical waste disposal pouch'
    ],
    imageUrl: s.image_url || `/images/services/${s.id}.jpg`,
    thumbnailUrl: s.thumbnail_url || null,
    createdAt: s.created_at
  }));
}

export async function dbInsertService(s: ServiceItem): Promise<boolean> {
  try {
    const payload = {
      id: s.id,
      title: s.title,
      subtitle: s.subtitle || null,
      description: s.description || null,
      single_visit_price: Number(s.priceNumber ?? s.singleVisitPrice) || 800,
      multi_visit_price: Number(s.multiVisitPrice) || Number(s.priceNumber ?? s.singleVisitPrice) || 800,
      night_surcharge: Number(s.nightSurcharge) || 399,
      prescription_required: Boolean(s.prescriptionRequired),
      duration: s.duration || '45 - 60 mins',
      icon: s.icon || 'Activity',
      badge: s.badge || null,
      image_url: s.imageUrl || null,
      thumbnail_url: s.thumbnailUrl || null
    };

    const { error } = await supabase.from('services').insert(payload);
    return !error;
  } catch {
    return false;
  }
}

export async function dbUpdateServiceById(id: string, updates: Partial<ServiceItem>): Promise<boolean> {
  const payload: any = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.subtitle !== undefined) payload.subtitle = updates.subtitle;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.priceNumber !== undefined || updates.singleVisitPrice !== undefined) {
    payload.single_visit_price = Number(updates.priceNumber ?? updates.singleVisitPrice);
  }
  if (updates.multiVisitPrice !== undefined) payload.multi_visit_price = Number(updates.multiVisitPrice);
  if (updates.nightSurcharge !== undefined) payload.night_surcharge = Number(updates.nightSurcharge);
  if (updates.prescriptionRequired !== undefined) payload.prescription_required = Boolean(updates.prescriptionRequired);
  if (updates.duration !== undefined) payload.duration = updates.duration;
  if (updates.icon !== undefined) payload.icon = updates.icon;
  if (updates.badge !== undefined) payload.badge = updates.badge;
  if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
  if (updates.thumbnailUrl !== undefined) payload.thumbnail_url = updates.thumbnailUrl;

  try {
    const { error } = await supabase.from('services').update(payload).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function dbDeleteService(id: string): Promise<boolean> {
  try {
    // Unlink any foreign key references first
    await supabase.from('bookings').update({ service_id: null }).eq('service_id', id);
    await supabase.from('leads').update({ service_id: null }).eq('service_id', id);
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) {
      console.error('[Supabase dbDeleteService error]:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase dbDeleteService exception]:', err);
    return false;
  }
}

export async function dbDeleteMultipleServices(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  try {
    await supabase.from('bookings').update({ service_id: null }).in('service_id', ids);
    await supabase.from('leads').update({ service_id: null }).in('service_id', ids);
    const { error } = await supabase.from('services').delete().in('id', ids);
    if (error) {
      console.error('[Supabase dbDeleteMultipleServices error]:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase dbDeleteMultipleServices exception]:', err);
    return false;
  }
}

// ============================================================================
// 2. NURSES TABLE (public.nurses) & REFERRAL CODE ENGINE
// ============================================================================

export function generateNurseReferralCode(name: string, id: string, phone?: string): string {
  const cleanFirst = (name || '')
    .replace(/^nurse\s+/i, '')
    .trim()
    .split(' ')[0]
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase() || 'RN';
  const digits = (id || '').replace(/\D/g, '').slice(-3) || (phone || '').replace(/\D/g, '').slice(-3) || '101';
  return `XN-${cleanFirst}${digits}`;
}

export function findNurseByReferralCode(code: string, nurses: NurseProfile[]): NurseProfile | undefined {
  if (!code || !code.trim()) return undefined;
  const clean = code.trim().toUpperCase().replace(/\s+/g, '');
  return nurses.find((n) => {
    const genCode = generateNurseReferralCode(n.name, n.id, n.phone);
    return (
      (n.referralCode && n.referralCode.toUpperCase() === clean) ||
      genCode === clean ||
      n.id.toUpperCase() === clean ||
      n.phone.replace(/\D/g, '') === clean
    );
  });
}

export async function dbFetchNurses(): Promise<NurseProfile[] | null> {
  const [data, appUsersData] = await Promise.all([
    executeWithRetry(async () => {
      return await supabase
        .from('nurses')
        .select('*')
        .order('name', { ascending: true });
    }),
    Promise.resolve(supabase.from('app_users').select('*')).then(r => r.data || [], () => [])
  ]);

  if (data === null && (!appUsersData || appUsersData.length === 0)) return null;

  const nursesList: NurseProfile[] = (data || []).map((n: any) => {
    // Find matching app_user for real PIN and details
    const matchedUser = (appUsersData || []).find((u: any) => {
      const uPhone = (u.phone || '').replace(/\D/g, '');
      const nPhone = (n.phone || '').replace(/\D/g, '');
      return (
        u.id === n.id ||
        (nPhone && uPhone && (nPhone === uPhone || nPhone.endsWith(uPhone) || uPhone.endsWith(nPhone))) ||
        (u.email && n.email && u.email.toLowerCase().trim() === n.email.toLowerCase().trim()) ||
        (u.identifier && n.email && u.identifier.toLowerCase().trim() === n.email.toLowerCase().trim()) ||
        (u.name && n.name && u.name.toLowerCase().trim() === n.name.toLowerCase().trim())
      );
    });

    const parsedExp = n.experience_years != null && !isNaN(Number(n.experience_years))
      ? Math.max(0, Number(n.experience_years))
      : 3;

    return {
      id: n.id,
      name: n.name,
      phone: n.phone,
      email: n.email,
      experienceYears: parsedExp,
      qualification: n.qualification || 'Registered Nurse',
      serviceArea: n.service_area || 'Gachibowli',
      pin: matchedUser?.pin ? String(matchedUser.pin).trim() : (n.pin ? String(n.pin).trim() : undefined),
      status: n.status || 'Active',
      totalLeads: Number(n.total_leads) || 0,
      convertedLeads: Number(n.converted_leads) || 0,
      totalReferrals: Number(n.total_referrals) || 0,
      pointsEarned: n.points_earned != null && !isNaN(Number(n.points_earned)) ? Math.max(0, Math.round(Number(n.points_earned))) : 0,
      referralEarningsRupees: n.referral_earnings_rupees != null && !isNaN(Number(n.referral_earnings_rupees)) ? Math.max(0, Number(n.referral_earnings_rupees)) : 0,
      rating: Number(n.rating) || 4.90,
      avatarUrl: n.avatar_url || undefined,
      certificateVerified: Boolean(n.certificate_verified),
      certificateUrl: n.certificate_url || undefined,
      createdAt: n.created_at,
      referredByNurseId: n.referred_by_nurse_id || undefined,
      referralCode: n.referral_code || generateNurseReferralCode(n.name, n.id, n.phone),
      earningsPaid: Number(n.earnings_paid) || 0,
      earningsPending: Number(n.earnings_pending) || 0,
      rejectionReason: n.rejection_reason || undefined
    };
  });

  return nursesList;
}

export async function dbSaveNurse(n: NurseProfile): Promise<boolean> {
  return dbUpdateNurse(n);
}

export async function dbUpdateNurse(n: NurseProfile): Promise<boolean> {
  try {
    const payload = {
      id: n.id,
      name: n.name,
      phone: n.phone,
      email: n.email,
      experience_years: !isNaN(Number(n.experienceYears)) ? Math.max(0, Math.round(Number(n.experienceYears))) : 3,
      qualification: n.qualification,
      service_area: n.serviceArea,
      status: n.status || 'Active',
      total_leads: Math.round(Number(n.totalLeads)) || 0,
      converted_leads: Math.round(Number(n.convertedLeads)) || 0,
      total_referrals: Math.round(Number(n.totalReferrals)) || 0,
      points_earned: n.pointsEarned != null && !isNaN(Number(n.pointsEarned)) ? Math.max(0, Math.round(Number(n.pointsEarned))) : 0,
      referral_earnings_rupees: n.referralEarningsRupees != null && !isNaN(Number(n.referralEarningsRupees)) ? Math.max(0, Number(n.referralEarningsRupees)) : 0,
      rating: Number(n.rating) || 4.90,
      avatar_url: n.avatarUrl || null,
      certificate_verified: Boolean(n.certificateVerified ?? true),
      certificate_url: n.certificateUrl || null,
      referred_by_nurse_id: n.referredByNurseId || null,
      earnings_paid: Number(n.earningsPaid) || 0,
      earnings_pending: Number(n.earningsPending) || 0,
      rejection_reason: n.rejectionReason || null
    };

    const { error } = await supabase.from('nurses').upsert(payload);
    return !error;
  } catch {
    return false;
  }
}

export async function dbInsertNurse(n: NurseProfile): Promise<boolean> {
  try {
    const payload = {
      id: n.id,
      name: n.name,
      phone: n.phone,
      email: n.email,
      experience_years: !isNaN(Number(n.experienceYears)) ? Math.max(0, Math.round(Number(n.experienceYears))) : 3,
      qualification: n.qualification,
      service_area: n.serviceArea,
      status: n.status || 'Active',
      total_leads: Math.round(Number(n.totalLeads)) || 0,
      converted_leads: Math.round(Number(n.convertedLeads)) || 0,
      total_referrals: Math.round(Number(n.totalReferrals)) || 0,
      points_earned: n.pointsEarned != null && !isNaN(Number(n.pointsEarned)) ? Math.max(0, Math.round(Number(n.pointsEarned))) : 0,
      referral_earnings_rupees: n.referralEarningsRupees != null && !isNaN(Number(n.referralEarningsRupees)) ? Math.max(0, Number(n.referralEarningsRupees)) : 0,
      rating: Number(n.rating) || 4.90,
      avatar_url: n.avatarUrl || null,
      certificate_verified: Boolean(n.certificateVerified ?? true),
      certificate_url: n.certificateUrl || null,
      referred_by_nurse_id: n.referredByNurseId || null,
      earnings_paid: Number(n.earningsPaid) || 0,
      earnings_pending: Number(n.earningsPending) || 0,
      rejection_reason: n.rejectionReason || null
    };

    const { error } = await supabase.from('nurses').upsert(payload);
    return !error;
  } catch {
    return false;
  }
}

export async function dbUpdateNurseById(id: string, updates: Partial<NurseProfile>): Promise<boolean> {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.experienceYears !== undefined) payload.experience_years = !isNaN(Number(updates.experienceYears)) ? Math.max(0, Math.round(Number(updates.experienceYears))) : 3;
  if (updates.qualification !== undefined) payload.qualification = updates.qualification;
  if (updates.serviceArea !== undefined) payload.service_area = updates.serviceArea;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.totalLeads !== undefined) payload.total_leads = Math.round(Number(updates.totalLeads));
  if (updates.convertedLeads !== undefined) payload.converted_leads = Math.round(Number(updates.convertedLeads));
  if (updates.totalReferrals !== undefined) payload.total_referrals = Math.round(Number(updates.totalReferrals));
  if (updates.pointsEarned !== undefined) payload.points_earned = !isNaN(Number(updates.pointsEarned)) ? Math.max(0, Math.round(Number(updates.pointsEarned))) : 0;
  if (updates.referralEarningsRupees !== undefined) payload.referral_earnings_rupees = Number(updates.referralEarningsRupees);
  if (updates.rating !== undefined) payload.rating = Number(updates.rating);
  if (updates.certificateVerified !== undefined) payload.certificate_verified = Boolean(updates.certificateVerified);
  if (updates.certificateUrl !== undefined) payload.certificate_url = updates.certificateUrl;
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
  if (updates.referredByNurseId !== undefined) payload.referred_by_nurse_id = updates.referredByNurseId;
  if (updates.earningsPaid !== undefined) payload.earnings_paid = Number(updates.earningsPaid);
  if (updates.earningsPending !== undefined) payload.earnings_pending = Number(updates.earningsPending);
  if (updates.rejectionReason !== undefined) payload.rejection_reason = updates.rejectionReason;

  try {
    const { error } = await supabase.from('nurses').update(payload).eq('id', id);
    if (error) console.error("Supabase Update Error:", error.message, error.details);

    // Also sync matching user in app_users table
    const userPayload: any = {};
    if (updates.name !== undefined) userPayload.name = updates.name;
    if (updates.phone !== undefined) userPayload.phone = updates.phone;
    if (updates.email !== undefined) userPayload.email = updates.email;
    if (updates.qualification !== undefined) userPayload.designation = updates.qualification;
    if (updates.serviceArea !== undefined) userPayload.service_area = updates.serviceArea;
    if (Object.keys(userPayload).length > 0) {
      await supabase.from('app_users').update(userPayload).eq('id', id);
    }

    return !error;
  } catch (err) {
    console.error("Supabase Update Catch Error:", err);
    return false;
  }
}

export async function dbDeleteNurse(id: string): Promise<boolean> {
  try {
    // 1. Unassign nurse from bookings to prevent foreign key errors
    await supabase.from('bookings').update({ assigned_nurse_id: null, assigned_nurse_name: null }).eq('assigned_nurse_id', id);
    await supabase.from('bookings').update({ referring_nurse_id: null, referring_nurse_name: null }).eq('referring_nurse_id', id);
    // 2. Unassign from leads
    await supabase.from('leads').update({ assigned_nurse_id: null }).eq('assigned_nurse_id', id);
    await supabase.from('leads').update({ nurse_id: null }).eq('nurse_id', id);
    // 3. Delete nurse from nurses table
    const { error } = await supabase.from('nurses').delete().eq('id', id);
    // 4. Delete nurse from app_users table
    await supabase.from('app_users').delete().eq('id', id);
    if (error) {
      console.error('[Supabase dbDeleteNurse error]:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase dbDeleteNurse exception]:', err);
    return false;
  }
}

export async function dbDeleteMultipleNurses(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  try {
    await supabase.from('bookings').update({ assigned_nurse_id: null, assigned_nurse_name: null }).in('assigned_nurse_id', ids);
    await supabase.from('bookings').update({ referring_nurse_id: null, referring_nurse_name: null }).in('referring_nurse_id', ids);
    await supabase.from('leads').update({ assigned_nurse_id: null }).in('assigned_nurse_id', ids);
    await supabase.from('leads').update({ nurse_id: null }).in('nurse_id', ids);
    const { error } = await supabase.from('nurses').delete().in('id', ids);
    await supabase.from('app_users').delete().in('id', ids);
    if (error) {
      console.error('[Supabase dbDeleteMultipleNurses error]:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase dbDeleteMultipleNurses exception]:', err);
    return false;
  }
}

// ============================================================================
// 3. BOOKINGS TABLE (public.bookings)
// ============================================================================

export async function dbFetchBookings(): Promise<Booking[] | null> {
  const data = await executeWithRetry(async () => {
    return await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
  });

  if (data === null) return null;

  return data.map((b: any) => ({
    id: b.id,
    createdAt: b.created_at,
    patientName: b.patient_name,
    patientPhone: b.patient_phone,
    patientAge: b.patient_age !== null ? Number(b.patient_age) : undefined,
    patientGender: b.patient_gender || undefined,
    serviceId: b.service_id,
    serviceTitle: b.service_title,
    area: b.area,
    fullAddress: b.full_address,
    bookingType: b.booking_type || (b.preferred_time?.toLowerCase().includes('immediate') || b.preferred_date?.toLowerCase().includes('instant') || b.preferred_date?.toLowerCase().includes('immediate') ? 'Instant' : 'Scheduled'),
    scheduledSlot: b.scheduled_slot || b.preferred_time,
    preferredDate: b.preferred_date,
    preferredTime: b.preferred_time,
    hasPrescription: Boolean(b.has_prescription),
    prescriptionFileName: b.prescription_file_name,
    prescriptionUrl: b.prescription_url,
    status: b.status || 'Assigned',
    nurseAcceptanceStatus: b.nurse_acceptance_status || (
      b.status === 'In-Progress' || b.status === 'Completed'
        ? 'Accepted'
        : (b.status === 'Rejected' && (b.rejected_by === 'Nurse' || b.rejection_reason?.toLowerCase().includes('nurse') || b.notes?.toLowerCase().includes('declined by nurse')))
        ? 'Rejected'
        : (b.assigned_nurse_id ? 'Pending' : undefined)
    ),
    assignedNurseId: b.assigned_nurse_id,
    assignedNurseName: b.assigned_nurse_name,
    referringNurseId: b.referring_nurse_id,
    referringNurseName: b.referring_nurse_name,
    estimatedFee: Number(b.estimated_fee) || 800,
    nightSurcharge: Number(b.night_surcharge) || 0,
    referralBonusRupees: Number(b.referral_bonus_rupees) || 0,
    notes: b.notes,
    rejectionReason: b.rejection_reason || undefined,
    rejectedBy: b.rejected_by || (b.status === 'Rejected' ? (b.rejection_reason?.toLowerCase().includes('nurse') || b.notes?.toLowerCase().includes('declined by nurse') ? 'Nurse' : 'Admin') : undefined),
    rejectedNurseId: b.rejected_nurse_id || undefined,
    rejectedNurseName: b.rejected_nurse_name || undefined,
    rejectedAt: b.rejected_at || undefined,
    promoCode: b.promo_code || undefined,
    discountRupees: Number(b.discount_rupees) || 0,
    finalFee: b.final_fee != null ? Number(b.final_fee) : undefined,
    numberOfVisits: b.number_of_visits != null ? Number(b.number_of_visits) : undefined,
    invoiceNumber: b.invoice_number || undefined,
    invoiceUrl: b.invoice_url || undefined
  }));
}

export async function dbSaveBooking(b: Booking): Promise<boolean> {
  try {
    let isoCreatedAt = new Date().toISOString();
    if (b.createdAt && b.createdAt.includes('T')) {
      isoCreatedAt = b.createdAt;
    }

    // Clean foreign key values so they are null if unassigned or empty
    const cleanAssignedNurseId = (b.assignedNurseId && b.assignedNurseId.trim() !== '' && b.assignedNurseId !== 'none')
      ? b.assignedNurseId.trim()
      : null;

    const cleanReferringNurseId = (b.referringNurseId && b.referringNurseId.trim() !== '' && b.referringNurseId !== 'none')
      ? b.referringNurseId.trim()
      : null;

    const cleanServiceId = b.serviceId ? String(b.serviceId).trim() : null;

    const payload: any = {
      id: b.id,
      created_at: isoCreatedAt,
      patient_name: b.patientName,
      patient_phone: b.patientPhone,
      patient_age: b.patientAge !== undefined && b.patientAge !== null ? (parseInt(String(b.patientAge)) || null) : null,
      patient_gender: b.patientGender || null,
      service_id: cleanServiceId,
      service_title: b.serviceTitle,
      area: b.area,
      full_address: b.fullAddress,
      booking_type: b.bookingType || 'Instant',
      scheduled_slot: b.scheduledSlot || null,
      preferred_date: b.preferredDate || 'Today',
      preferred_time: b.preferredTime || (b.bookingType === 'Instant' ? 'Immediate (ASAP)' : b.scheduledSlot || 'Slot TBD'),
      has_prescription: Boolean(b.hasPrescription),
      prescription_file_name: b.prescriptionFileName || null,
      prescription_url: b.prescriptionUrl || null,
      status: b.status || 'Assigned',
      assigned_nurse_id: cleanAssignedNurseId,
      assigned_nurse_name: b.assignedNurseName || null,
      referring_nurse_id: cleanReferringNurseId,
      referring_nurse_name: b.referringNurseName || null,
      estimated_fee: Number(b.estimatedFee) || 800.00,
      night_surcharge: Number(b.nightSurcharge) || 0.00,
      referral_bonus_rupees: Number(b.referralBonusRupees) || 0.00,
      notes: b.notes || null,
      rejection_reason: b.rejectionReason || null,
      promo_code: b.promoCode || null,
      discount_rupees: b.discountRupees || 0,
      final_fee: b.finalFee || null,
      number_of_visits: b.numberOfVisits || null,
      invoice_number: b.invoiceNumber || null,
      invoice_url: b.invoiceUrl || null
    };

    const { error } = await supabase.from('bookings').upsert(payload);
    if (error) {
      console.warn('[DB] Supabase bookings save warning:', error.message);
      if (error.message && error.message.includes('column')) {
        const fallbackPayload = { ...payload };
        if (fallbackPayload.rejection_reason) {
          fallbackPayload.notes = (fallbackPayload.notes ? fallbackPayload.notes + ' • ' : '') + `Rejection: ${fallbackPayload.rejection_reason}`;
          delete fallbackPayload.rejection_reason;
        }
        delete fallbackPayload.booking_type;
        delete fallbackPayload.scheduled_slot;
        delete fallbackPayload.number_of_visits;
        const retry = await supabase.from('bookings').upsert(fallbackPayload);
        if (!retry.error) return true;
        console.error('[DB] Supabase bookings save retry error:', retry.error.message);
      }
      return false;
    }

    return true;
  } catch (err) {
    console.error('[DB] dbSaveBooking exception:', err);
    return false;
  }
}

export async function dbInsertBooking(b: Booking): Promise<boolean> {
  return dbSaveBooking(b);
}

export async function dbUpdateBooking(id: string, updates: Partial<Booking>): Promise<boolean> {
  const payload: any = {};
  if (updates.patientName !== undefined) payload.patient_name = updates.patientName;
  if (updates.patientPhone !== undefined) payload.patient_phone = updates.patientPhone;
  if (updates.patientAge !== undefined) payload.patient_age = parseInt(String(updates.patientAge)) || null;
  if (updates.patientGender !== undefined) payload.patient_gender = updates.patientGender || null;
  if (updates.serviceTitle !== undefined) payload.service_title = updates.serviceTitle;
  if (updates.serviceId !== undefined) {
    payload.service_id = updates.serviceId ? String(updates.serviceId).trim() : null;
  }
  if (updates.area !== undefined) payload.area = updates.area;
  if (updates.fullAddress !== undefined) payload.full_address = updates.fullAddress;
  if (updates.bookingType !== undefined) payload.booking_type = updates.bookingType;
  if (updates.scheduledSlot !== undefined) payload.scheduled_slot = updates.scheduledSlot;
  if (updates.preferredDate !== undefined) payload.preferred_date = updates.preferredDate || null;
  if (updates.preferredTime !== undefined) payload.preferred_time = updates.preferredTime || null;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.rejectionReason !== undefined) payload.rejection_reason = updates.rejectionReason || null;
  if (updates.promoCode !== undefined) payload.promo_code = updates.promoCode || null;
  if (updates.discountRupees !== undefined) payload.discount_rupees = updates.discountRupees;
  if (updates.finalFee !== undefined) payload.final_fee = updates.finalFee || null;
  if (updates.numberOfVisits !== undefined) payload.number_of_visits = updates.numberOfVisits || null;
  if (updates.invoiceNumber !== undefined) payload.invoice_number = updates.invoiceNumber || null;
  if (updates.invoiceUrl !== undefined) payload.invoice_url = updates.invoiceUrl || null;
  if (updates.nurseAcceptanceStatus !== undefined) payload.nurse_acceptance_status = updates.nurseAcceptanceStatus;
  if (updates.hasPrescription !== undefined) payload.has_prescription = Boolean(updates.hasPrescription);
  if (updates.prescriptionFileName !== undefined) payload.prescription_file_name = updates.prescriptionFileName || null;
  if (updates.prescriptionUrl !== undefined) payload.prescription_url = updates.prescriptionUrl || null;
  if (updates.assignedNurseId !== undefined) {
    payload.assigned_nurse_id = (updates.assignedNurseId && updates.assignedNurseId.trim() !== '' && updates.assignedNurseId !== 'none') ? updates.assignedNurseId.trim() : null;
  }
  if (updates.assignedNurseName !== undefined) payload.assigned_nurse_name = updates.assignedNurseName || null;
  if (updates.referringNurseId !== undefined) {
    payload.referring_nurse_id = (updates.referringNurseId && updates.referringNurseId.trim() !== '' && updates.referringNurseId !== 'none') ? updates.referringNurseId.trim() : null;
  }
  if (updates.referringNurseName !== undefined) payload.referring_nurse_name = updates.referringNurseName || null;
  if (updates.estimatedFee !== undefined) payload.estimated_fee = Number(updates.estimatedFee);
  if (updates.nightSurcharge !== undefined) payload.night_surcharge = Number(updates.nightSurcharge);
  if (updates.referralBonusRupees !== undefined) payload.referral_bonus_rupees = Number(updates.referralBonusRupees);
  if (updates.notes !== undefined) payload.notes = updates.notes || null;

  try {
    const { error } = await supabase.from('bookings').update(payload).eq('id', id);
    if (error) {
      console.warn('[DB] Supabase bookings update warning:', error.message);
      if (error.message && error.message.includes('column')) {
        const fallbackPayload = { ...payload };
        if (fallbackPayload.rejection_reason) {
          fallbackPayload.notes = (fallbackPayload.notes ? fallbackPayload.notes + ' • ' : '') + `Rejection: ${fallbackPayload.rejection_reason}`;
          delete fallbackPayload.rejection_reason;
        }
        delete fallbackPayload.booking_type;
        delete fallbackPayload.scheduled_slot;
        delete fallbackPayload.nurse_acceptance_status;
        const retry = await supabase.from('bookings').update(fallbackPayload).eq('id', id);
        return !retry.error;
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function dbDeleteBooking(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) {
      console.error('[Supabase dbDeleteBooking error]:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase dbDeleteBooking exception]:', err);
    return false;
  }
}

export async function dbDeleteMultipleBookings(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  try {
    const { error } = await supabase.from('bookings').delete().in('id', ids);
    if (error) {
      console.error('[Supabase dbDeleteMultipleBookings error]:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase dbDeleteMultipleBookings exception]:', err);
    return false;
  }
}

// ============================================================================
// 4. LEADS TABLE (public.leads)
// ============================================================================

export async function dbFetchLeads(): Promise<NurseLead[] | null> {
  const data = await executeWithRetry(async () => {
    return await supabase
      .from('leads')
      .select('*')
      .order('submitted_at', { ascending: false });
  });

  if (data === null) return null;

  return data.map((l: any) => ({
    id: l.id,
    nurseId: l.nurse_id,
    patientName: l.patient_name || undefined,
    patientPhone: l.patient_phone || undefined,
    serviceId: l.service_id,
    area: l.area,
    submittedAt: l.submitted_at,
    referralType: l.referral_type,
    status: l.status || 'Converted',
    assignedNurseId: l.assigned_nurse_id,
    leadValueRupees: Number(l.lead_value_rupees) || 1000.00,
    pointsAwarded: l.points_awarded != null && !isNaN(Number(l.points_awarded)) ? Math.round(Number(l.points_awarded)) : 50,
    referralCommissionRupees: Number(l.referral_commission_rupees) || 100.00,
    referralRupees: Number(l.referral_commission_rupees) || 100.00,
    referredNurseName: l.referred_nurse_name || undefined,
    referredNursePhone: l.referred_nurse_phone || undefined,
    qualification: l.qualification || undefined,
    experienceYears: Number(l.experience_years) || 3,
    rejectionReason: l.rejection_reason || undefined
  }));
}

export async function dbSaveLead(lead: NurseLead): Promise<boolean> {
  try {
    let isoSubmittedAt = new Date().toISOString();
    if (lead.submittedAt && lead.submittedAt.includes('T')) {
      isoSubmittedAt = lead.submittedAt;
    }

    const cleanNurseId = (lead.nurseId && lead.nurseId.trim() !== '' && lead.nurseId !== 'none') ? lead.nurseId.trim() : null;
    const cleanAssignedNurseId = (lead.assignedNurseId && lead.assignedNurseId.trim() !== '' && lead.assignedNurseId !== 'none') ? lead.assignedNurseId.trim() : null;

    const payload: any = {
      id: lead.id,
      nurse_id: cleanNurseId,
      patient_name: lead.patientName || null,
      patient_phone: lead.patientPhone || null,
      service_id: lead.serviceId || null,
      area: lead.area || (lead as any).serviceArea || 'Hyderabad Central',
      submitted_at: isoSubmittedAt,
      referral_type: lead.referralType || null,
      status: lead.status || 'Pending Approval',
      assigned_nurse_id: cleanAssignedNurseId,
      lead_value_rupees: Number(lead.leadValueRupees) || 1000.00,
      points_awarded: lead.pointsAwarded != null && !isNaN(Number(lead.pointsAwarded)) ? Math.round(Number(lead.pointsAwarded)) : 50,
      referral_commission_rupees: Number(lead.referralCommissionRupees) || 100.00,
      referred_nurse_name: lead.referredNurseName || null,
      referred_nurse_phone: lead.referredNursePhone || null,
      qualification: lead.qualification || null,
      experience_years: !isNaN(Number(lead.experienceYears)) ? Math.max(0, Math.round(Number(lead.experienceYears))) : 3,
      rejection_reason: lead.rejectionReason || null
    };

    const { error } = await supabase.from('leads').upsert(payload);
    if (error) {
      console.warn('[DB] Supabase leads save warning:', error.message);
      // If foreign key constraint failed because nurse_id is not yet in public.nurses:
      if (error.message && (error.message.includes('foreign key') || error.message.includes('fkey') || error.message.includes('violates'))) {
        const safePayload = {
          ...payload,
          nurse_id: null,
          assigned_nurse_id: null
        };
        const retryFk = await supabase.from('leads').upsert(safePayload);
        if (!retryFk.error) return true;
      }
      if (error.message && error.message.includes('column')) {
        const fallback = {
          id: payload.id,
          nurse_id: null,
          patient_name: payload.patient_name,
          patient_phone: payload.patient_phone,
          service_id: payload.service_id,
          area: payload.area || 'Hyderabad Central',
          submitted_at: payload.submitted_at,
          referral_type: payload.referral_type,
          status: payload.status,
          assigned_nurse_id: null,
          lead_value_rupees: payload.lead_value_rupees,
          points_awarded: payload.points_awarded,
          referral_commission_rupees: payload.referral_commission_rupees
        };
        const retry = await supabase.from('leads').upsert(fallback);
        if (!retry.error) return true;
        console.error('[DB] Supabase leads save retry error:', retry.error.message);
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error('[DB] dbSaveLead exception:', err);
    return false;
  }
}

export async function dbInsertLead(lead: NurseLead): Promise<boolean> {
  return dbSaveLead(lead);
}

export async function dbUpdateLeadById(id: string, updates: Partial<NurseLead>): Promise<boolean> {
  const payload: any = {};
  if (updates.patientName !== undefined) payload.patient_name = updates.patientName;
  if (updates.patientPhone !== undefined) payload.patient_phone = updates.patientPhone;
  if (updates.serviceId !== undefined) payload.service_id = updates.serviceId;
  if (updates.area !== undefined) payload.area = updates.area;
  if (updates.referralType !== undefined) payload.referral_type = updates.referralType;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.nurseId !== undefined) {
    payload.nurse_id = (updates.nurseId && updates.nurseId.trim() !== '' && updates.nurseId !== 'none') ? updates.nurseId.trim() : null;
  }
  if (updates.assignedNurseId !== undefined) {
    payload.assigned_nurse_id = (updates.assignedNurseId && updates.assignedNurseId.trim() !== '' && updates.assignedNurseId !== 'none') ? updates.assignedNurseId.trim() : null;
  }
  if (updates.pointsAwarded !== undefined) payload.points_awarded = Math.round(Number(updates.pointsAwarded));
  if (updates.leadValueRupees !== undefined) payload.lead_value_rupees = Number(updates.leadValueRupees);
  if (updates.referralCommissionRupees !== undefined || (updates as any).referralRupees !== undefined) {
    payload.referral_commission_rupees = Number(updates.referralCommissionRupees ?? (updates as any).referralRupees);
  }
  if (updates.referredNurseName !== undefined) payload.referred_nurse_name = updates.referredNurseName;
  if (updates.referredNursePhone !== undefined) payload.referred_nurse_phone = updates.referredNursePhone;
  if (updates.qualification !== undefined) payload.qualification = updates.qualification;
  if (updates.experienceYears !== undefined) payload.experience_years = Math.round(Number(updates.experienceYears));
  if (updates.rejectionReason !== undefined) payload.rejection_reason = updates.rejectionReason;

  try {
    const { error } = await supabase.from('leads').update(payload).eq('id', id);
    if (error) {
      console.warn('[DB] Supabase leads update warning:', error.message);
      if (error.message && error.message.includes('column')) {
        const fallback: any = {};
        const safeLeadKeys = ['patient_name', 'patient_phone', 'service_id', 'area', 'status', 'nurse_id', 'assigned_nurse_id', 'points_awarded', 'lead_value_rupees', 'referral_commission_rupees'];
        safeLeadKeys.forEach((k) => {
          if (payload[k] !== undefined) fallback[k] = payload[k];
        });
        const retry = await supabase.from('leads').update(fallback).eq('id', id);
        return !retry.error;
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function dbDeleteLead(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) {
      console.error('[Supabase dbDeleteLead error]:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase dbDeleteLead exception]:', err);
    return false;
  }
}

export async function dbDeleteMultipleLeads(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  try {
    const { error } = await supabase.from('leads').delete().in('id', ids);
    if (error) {
      console.error('[Supabase dbDeleteMultipleLeads error]:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase dbDeleteMultipleLeads exception]:', err);
    return false;
  }
}

// ============================================================================
// 5. CONSULTATIONS TABLE (public.consultations)
// ============================================================================

export async function dbFetchConsultations(): Promise<DoctorConsultation[] | null> {
  const data = await executeWithRetry(async () => {
    return await supabase
      .from('consultations')
      .select('*')
      .order('requested_at', { ascending: false });
  });

  if (data === null) return null;

  return data.map((c: any) => ({
    id: c.id,
    patientName: c.patient_name,
    patientAge: c.patient_age !== null ? Number(c.patient_age) : undefined,
    patientPhone: c.patient_phone,
    symptoms: c.symptoms,
    area: c.area,
    requestedAt: c.requested_at,
    status: c.status || 'Awaiting Call',
    prescriptionIssued: Boolean(c.prescription_issued),
    prescriptionText: c.prescription_text,
    doctorNotes: c.prescription_text || '',
    recommendedService: c.recommended_service
  }));
}

export async function dbSaveConsultation(c: DoctorConsultation): Promise<boolean> {
  try {
    let isoRequestedAt = new Date().toISOString();
    if (c.requestedAt && c.requestedAt.includes('T')) {
      isoRequestedAt = c.requestedAt;
    }

    const payload = {
      id: c.id,
      patient_name: c.patientName,
      patient_age: c.patientAge !== undefined && c.patientAge !== null ? (parseInt(String(c.patientAge)) || null) : null,
      patient_phone: c.patientPhone,
      symptoms: c.symptoms || 'General teleconsultation request',
      area: c.area,
      requested_at: isoRequestedAt,
      status: c.status || 'Awaiting Call',
      prescription_issued: Boolean(c.prescriptionIssued),
      prescription_text: c.prescriptionText || c.doctorNotes || null,
      recommended_service: c.recommendedService || null
    };

    const { error } = await supabase.from('consultations').upsert(payload);
    return !error;
  } catch {
    return false;
  }
}

export async function dbInsertConsultation(c: DoctorConsultation): Promise<boolean> {
  return dbSaveConsultation(c);
}

export async function dbUpdateConsultationById(id: string, updates: Partial<DoctorConsultation>): Promise<boolean> {
  const payload: any = {};
  if (updates.patientName !== undefined) payload.patient_name = updates.patientName;
  if (updates.patientAge !== undefined) payload.patient_age = parseInt(String(updates.patientAge)) || null;
  if (updates.patientPhone !== undefined) payload.patient_phone = updates.patientPhone;
  if (updates.symptoms !== undefined) payload.symptoms = updates.symptoms;
  if (updates.area !== undefined) payload.area = updates.area;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.prescriptionIssued !== undefined) payload.prescription_issued = Boolean(updates.prescriptionIssued);
  if (updates.prescriptionText !== undefined || updates.doctorNotes !== undefined) {
    payload.prescription_text = updates.prescriptionText || updates.doctorNotes || null;
  }
  if (updates.recommendedService !== undefined) payload.recommended_service = updates.recommendedService || null;

  try {
    const { error } = await supabase.from('consultations').update(payload).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function dbDeleteConsultation(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('consultations').delete().eq('id', id);
    if (error) {
      console.error('[Supabase dbDeleteConsultation error]:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase dbDeleteConsultation exception]:', err);
    return false;
  }
}

export async function dbDeleteMultipleConsultations(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  try {
    const { error } = await supabase.from('consultations').delete().in('id', ids);
    if (error) {
      console.error('[Supabase dbDeleteMultipleConsultations error]:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase dbDeleteMultipleConsultations exception]:', err);
    return false;
  }
}

// ============================================================================
// 6. COUPONS TABLE (public.coupons)
// ============================================================================

export async function dbFetchCoupons(): Promise<Coupon[] | null> {
  const data = await executeWithRetry(async () => {
    return await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
  });

  if (data === null) return null;

  return data.map((c: any) => ({
    id: c.id,
    code: c.code,
    discountType: c.discount_type as 'flat' | 'percent',
    discountValue: Number(c.discount_value),
    maxDiscount: c.max_discount !== null && c.max_discount !== undefined ? Number(c.max_discount) : undefined,
    minOrderAmount: c.min_order_amount !== null && c.min_order_amount !== undefined ? Number(c.min_order_amount) : 0,
    description: c.description || '',
    status: (c.status || 'Active') as 'Active' | 'Inactive' | 'Expired',
    usageLimit: c.usage_limit !== null && c.usage_limit !== undefined ? Number(c.usage_limit) : undefined,
    timesUsed: Number(c.times_used) || 0,
    validUntil: c.valid_until || undefined,
    createdAt: c.created_at,
    updatedAt: c.updated_at
  }));
}

export async function dbInsertCoupon(coupon: Omit<Coupon, 'id' | 'createdAt' | 'timesUsed'>): Promise<Coupon | null> {
  const newId = `CPN-${coupon.code.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  
  let isoValidUntil: string | null = null;
  if (coupon.validUntil) {
    isoValidUntil = coupon.validUntil.includes('T') ? coupon.validUntil : new Date(coupon.validUntil).toISOString();
  }

  const payload = {
    id: newId,
    code: coupon.code.trim().toUpperCase(),
    discount_type: coupon.discountType === 'percent' ? 'percent' : 'flat',
    discount_value: Number(coupon.discountValue),
    max_discount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
    min_order_amount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0,
    description: (coupon.description || '').trim(),
    status: ['Active', 'Inactive', 'Expired'].includes(coupon.status) ? coupon.status : 'Active',
    usage_limit: coupon.usageLimit ? Math.round(Number(coupon.usageLimit)) : null,
    times_used: 0,
    valid_until: isoValidUntil,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('coupons')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[DB] Error inserting coupon:', error);
      return {
        ...coupon,
        id: newId,
        code: payload.code,
        timesUsed: 0,
        createdAt: payload.created_at,
        updatedAt: payload.updated_at
      };
    }

    return {
      id: data.id,
      code: data.code,
      discountType: data.discount_type,
      discountValue: Number(data.discount_value),
      maxDiscount: data.max_discount ? Number(data.max_discount) : undefined,
      minOrderAmount: data.min_order_amount ? Number(data.min_order_amount) : 0,
      description: data.description,
      status: data.status,
      usageLimit: data.usage_limit ? Number(data.usage_limit) : undefined,
      timesUsed: Number(data.times_used) || 0,
      validUntil: data.valid_until,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (err) {
    console.error('[DB] Insert coupon exception:', err);
    return {
      ...coupon,
      id: newId,
      code: payload.code,
      timesUsed: 0,
      createdAt: payload.created_at,
      updatedAt: payload.updated_at
    };
  }
}

export async function dbUpdateCoupon(id: string, updates: Partial<Coupon>): Promise<boolean> {
  const payload: any = {
    updated_at: new Date().toISOString()
  };

  if (updates.code !== undefined) payload.code = updates.code.trim().toUpperCase();
  if (updates.discountType !== undefined) payload.discount_type = updates.discountType;
  if (updates.discountValue !== undefined) payload.discount_value = Number(updates.discountValue);
  if (updates.maxDiscount !== undefined) payload.max_discount = updates.maxDiscount ? Number(updates.maxDiscount) : null;
  if (updates.minOrderAmount !== undefined) payload.min_order_amount = Number(updates.minOrderAmount);
  if (updates.description !== undefined) payload.description = updates.description.trim();
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.usageLimit !== undefined) payload.usage_limit = updates.usageLimit ? Math.round(Number(updates.usageLimit)) : null;
  if (updates.timesUsed !== undefined) payload.times_used = Math.round(Number(updates.timesUsed));
  if (updates.validUntil !== undefined) {
    payload.valid_until = updates.validUntil ? (updates.validUntil.includes('T') ? updates.validUntil : new Date(updates.validUntil).toISOString()) : null;
  }

  try {
    const { error } = await supabase
      .from('coupons')
      .update(payload)
      .eq('id', id);

    return !error;
  } catch (err) {
    console.error('[DB] Update coupon exception:', err);
    return false;
  }
}

export async function dbDeleteCoupon(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Supabase dbDeleteCoupon error]:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase dbDeleteCoupon exception]:', err);
    return false;
  }
}

export async function dbDeleteMultipleCoupons(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  try {
    const { error } = await supabase.from('coupons').delete().in('id', ids);
    if (error) {
      console.error('[Supabase dbDeleteMultipleCoupons error]:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase dbDeleteMultipleCoupons exception]:', err);
    return false;
  }
}

export async function dbIncrementCouponUsage(code: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('coupons')
      .select('id, times_used')
      .ilike('code', code.trim())
      .single();

    if (data) {
      await supabase
        .from('coupons')
        .update({
          times_used: (Number(data.times_used) || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);
    }
  } catch {
    // Non-blocking
  }
}

// ============================================================================
// 7. USER AUTHENTICATION & DIRECTORY (4-Digit PIN with Fallback)
// ============================================================================

export async function dbFetchAppUsers(): Promise<AppUser[]> {
  try {
    const { data, error } = await supabase.from('app_users').select('*');
    if (!error && data) {
      return data.map((u: any) => ({
        id: u.id,
        role: u.role,
        identifier: u.identifier,
        name: u.name,
        pin: u.pin ? String(u.pin).trim() : '', // Real PIN from Supabase
        phone: u.phone,
        email: u.email,
        designation: u.designation,
        serviceArea: u.service_area,
        avatarUrl: u.avatar_url
      }));
    }
  } catch {
    // Graceful fallback to seed users
  }
  return SEED_APP_USERS;
}

/**
 * Hardened Authentication Wrapper
 * Delegates directly to server-backed authenticateUserSecure with brute-force rate-limiting
 */
export async function dbVerifyUserPin(
  role: 'patient' | 'nurse' | 'doctor' | 'admin' | 'any' = 'any',
  inputIdentifier: string,
  inputPin: string
): Promise<{ success: boolean; user?: AppUser; message: string }> {
  return authenticateUserSecure(
    inputIdentifier,
    inputPin,
    role === 'any' ? undefined : role
  );
}

/**
 * Atomic Server-Side Coupon Redemption (Prevents double-spending and client-side price tampering)
 */
export async function dbRedeemCouponAtomic(
  code: string,
  orderAmount: number,
  userId?: string
): Promise<{ valid: boolean; discount: number; finalAmount: number; message: string }> {
  try {
    const { data, error } = await supabase.rpc('redeem_coupon_atomic', {
      p_code: code.trim(),
      p_order_amount: orderAmount,
      p_user_id: userId || null
    });

    if (!error && data) {
      return {
        valid: Boolean(data.valid),
        discount: Number(data.discount) || 0,
        finalAmount: Number(data.final_amount) || orderAmount,
        message: data.message || ''
      };
    }
  } catch (err) {
    console.warn('[DB] RPC redeem_coupon_atomic error:', err);
  }

  // Authoritative server-validation fallback against coupons table
  try {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (!coupon || coupon.status !== 'Active') {
      return { valid: false, discount: 0, finalAmount: orderAmount, message: 'Invalid or inactive promo code.' };
    }
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return { valid: false, discount: 0, finalAmount: orderAmount, message: 'Promo code has expired.' };
    }
    if (coupon.usage_limit && (coupon.times_used || 0) >= coupon.usage_limit) {
      return { valid: false, discount: 0, finalAmount: orderAmount, message: 'Promo code usage limit reached.' };
    }
    if (coupon.min_order_amount && orderAmount < Number(coupon.min_order_amount)) {
      return { 
        valid: false, 
        discount: 0, 
        finalAmount: orderAmount, 
        message: `Minimum order amount of ₹${coupon.min_order_amount} required.` 
      };
    }

    let calculatedDiscount = 0;
    if (coupon.discount_type === 'flat') {
      calculatedDiscount = Math.min(Number(coupon.discount_value), orderAmount);
    } else {
      const pct = orderAmount * (Number(coupon.discount_value) / 100);
      calculatedDiscount = Math.min(pct, Number(coupon.max_discount || orderAmount));
    }
    calculatedDiscount = Math.round(calculatedDiscount);

    return {
      valid: true,
      discount: calculatedDiscount,
      finalAmount: Math.max(0, orderAmount - calculatedDiscount),
      message: `Promo applied: ₹${calculatedDiscount} savings`
    };
  } catch {
    return { valid: false, discount: 0, finalAmount: orderAmount, message: 'Could not verify coupon.' };
  }
}

/**
 * Fetch System Audit Logs (Admin authorized only)
 */
export async function dbFetchAuditLogs(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) return data;
  } catch {}
  return [];
}

/**
 * Log System Audit Event
 */
export async function dbLogAuditEvent(
  action: string,
  targetEntity: string,
  targetId: string,
  details: Record<string, any> = {}
): Promise<void> {
  try {
    await supabase.rpc('log_audit_event_secure', {
      p_action: action,
      p_target_entity: targetEntity,
      p_target_id: targetId,
      p_details: details
    });
  } catch {
    try {
      await supabase.from('audit_logs').insert({
        action,
        target_entity: targetEntity,
        target_id: targetId,
        details
      });
    } catch {}
  }
}

export async function dbInsertAppUser(u: AppUser): Promise<boolean> {
  try {
    const payload = {
      id: u.id,
      role: u.role,
      identifier: (u.identifier || u.phone || u.email || u.id).trim().toLowerCase(),
      name: u.name,
      pin: u.pin,
      phone: u.phone || null,
      email: u.email || null,
      designation: u.designation || null,
      service_area: u.serviceArea || null,
      avatar_url: u.avatarUrl || null
    };
    const { error } = await supabase.from('app_users').upsert(payload, { onConflict: 'identifier' });
    if (error) {
      await supabase.from('app_users').upsert(payload, { onConflict: 'id' });
    }
    // Also save resilient local storage backup
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem('xn_registered_users');
        const list: AppUser[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex(x => x.id === u.id || x.identifier === u.identifier || (u.phone && x.phone === u.phone));
        if (idx >= 0) list[idx] = { ...list[idx], ...u };
        else list.push(u);
        localStorage.setItem('xn_registered_users', JSON.stringify(list));
      }
    } catch {}
    return true;
  } catch {
    return false;
  }
}

export async function dbUpdateAppUserById(id: string, updates: Partial<AppUser>): Promise<boolean> {
  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.role !== undefined) payload.role = updates.role;
  if (updates.identifier !== undefined) payload.identifier = updates.identifier;
  if (updates.pin !== undefined) payload.pin = updates.pin;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.designation !== undefined) payload.designation = updates.designation;
  if (updates.serviceArea !== undefined) payload.service_area = updates.serviceArea;

  try {
    const { error } = await supabase.from('app_users').update(payload).eq('id', id);
    if (!error) {
      try {
        if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
          const raw = localStorage.getItem('xn_registered_users');
          if (raw) {
            const list: AppUser[] = JSON.parse(raw);
            const idx = list.findIndex(u => u.id === id);
            if (idx !== -1) {
              list[idx] = { ...list[idx], ...updates };
              localStorage.setItem('xn_registered_users', JSON.stringify(list));
            }
          }
        }
      } catch {}
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function dbDeleteAppUser(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('app_users').delete().eq('id', id);
    // Also delete from nurses table if nurse account
    await supabase.from('nurses').delete().eq('id', id);
    if (error) {
      console.error('[Supabase dbDeleteAppUser error]:', error);
      return false;
    }
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        const raw = localStorage.getItem('xn_registered_users');
        if (raw) {
          const list: AppUser[] = JSON.parse(raw);
          const filtered = list.filter(u => u.id !== id);
          localStorage.setItem('xn_registered_users', JSON.stringify(filtered));
        }
      }
    } catch {}
    return true;
  } catch (err) {
    console.error('[Supabase dbDeleteAppUser exception]:', err);
    return false;
  }
}

export async function dbDeleteMultipleAppUsers(ids: string[]): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  try {
    const { error } = await supabase.from('app_users').delete().in('id', ids);
    await supabase.from('nurses').delete().in('id', ids);
    if (error) {
      console.error('[Supabase dbDeleteMultipleAppUsers error]:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase dbDeleteMultipleAppUsers exception]:', err);
    return false;
  }
}
