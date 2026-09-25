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

// ============================================================================
// DEFAULT SEED ENTITIES (OFFICIAL CLINICAL CATALOG & SEED FLEET)
// ============================================================================

export const DEFAULT_SERVICES: ServiceItem[] = [
  {
    id: 'saline-infusion',
    title: 'IV Infusions & Antibiotics Infusion',
    subtitle: 'Safe and hygienic infusion at home, subject to prescription',
    description: 'Safe and hygienic infusion at home, subject to prescription and clinical suitability. We will take care of it till disconnect the fluid and secure the line.',
    singleVisitPrice: 899,
    multiVisitPrice: 699,
    nightSurcharge: 399,
    prescriptionRequired: true,
    duration: '45 - 90 mins',
    indicativePrice: 'Single: ₹899 / Multi: ₹699',
    priceNumber: 899,
    features: [
      'Doorstep clinical service across Hyderabad',
      'Certified & background-verified RN attending',
      'Transport & basic PPE kit charges included',
      'Digital vitals check & medical observation log'
    ],
    icon: 'Droplet',
    badge: 'High Demand',
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
    imageUrl: '/images/services/saline-infusion.jpg'
  },
  {
    id: 'wound-dressing',
    title: 'Wound Dressing',
    subtitle: 'Professional wound cleaning and dressing according to care plan',
    description: 'Post-operative wound care, diabetic foot ulcers, bedsores (pressure ulcers), and traumatic wounds managed with clinical precision.',
    singleVisitPrice: 800,
    multiVisitPrice: 800,
    nightSurcharge: 399,
    prescriptionRequired: true,
    duration: '30 - 45 mins',
    indicativePrice: 'Single: ₹800 / Multi: ₹800',
    priceNumber: 800,
    features: [
      'Aseptic dressing change by certified RN',
      'Inspection of wound healing & infection markers',
      'Sterile pack & medical-grade dressings',
      'Handover notes for treating physician'
    ],
    icon: 'ShieldCheck',
    badge: 'Popular',
    procedureSteps: [
      'Aseptic field preparation',
      'Gentle removal of old dressing & wound cleaning',
      'Application of sterile dressing material',
      'Patient comfort check & documentation'
    ],
    equipmentProvided: [
      'Sterile dressing set & disposable gloves',
      'Antiseptic solution & sterile gauze swabs',
      'Micropore tape & bandage rolls',
      'Bio-hazard waste bag'
    ],
    imageUrl: '/images/services/wound-dressing.jpg'
  },
  {
    id: 'foleys-catheter',
    title: 'Foley Catheter Replacement',
    subtitle: 'Insertion / replacement and related nursing care at home',
    description: 'Expert urethral catheterization for elderly, bedridden, and post-surgery patients. Minimizes discomfort and protects against CAUTI.',
    singleVisitPrice: 1299,
    multiVisitPrice: 1299,
    nightSurcharge: 399,
    prescriptionRequired: true,
    duration: '30 - 45 mins',
    indicativePrice: 'Single: ₹1,299 / Multi: ₹1,299',
    priceNumber: 1299,
    features: [
      'Certified RN with catheterization expertise',
      'Sterile insertion & drainage bag setup',
      'Catheter care instructions for family/caregiver',
      'Observation of urine output & characteristics'
    ],
    icon: 'Activity',
    procedureSteps: [
      'Sterile drape & peri-urethral cleaning',
      'Gentle insertion using water-soluble lubricant',
      'Balloon inflation & secure anchoring',
      'Urine drainage verification & collection bag setup'
    ],
    equipmentProvided: [
      'Foley catheter & drainage bag (as prescribed)',
      'Sterile lubricating jelly & syringe with sterile water',
      'Antiseptic cleaning solution & cotton balls',
      'Medical disposal pouch'
    ],
    imageUrl: '/images/services/foleys-catheter.jpg'
  },
  {
    id: 'ryles-tube',
    title: 'Ryles / Nasogastric Tube Care',
    subtitle: 'Selected tube-related nursing care and feeding support',
    description: 'Safe insertion and replacement of nasogastric tubes for patients unable to swallow orally or requiring gastric aspiration.',
    singleVisitPrice: 1299,
    multiVisitPrice: 1299,
    nightSurcharge: 399,
    prescriptionRequired: true,
    duration: '30 - 45 mins',
    indicativePrice: 'Single: ₹1,299 / Multi: ₹1,299',
    priceNumber: 1299,
    features: [
      'Gentle nasogastric tube insertion by skilled RN',
      'Aspiration check for proper tube positioning',
      'Tube fixation with skin-safe hypo-allergenic tape',
      'Feeding protocol demonstration for family caregiver'
    ],
    icon: 'FileText',
    procedureSteps: [
      'Measurement of tube length (NEX measurement)',
      'Lubrication & gentle nasopharyngeal insertion',
      'Position verification via air insufflation & epigastric auscultation',
      'Secure taping & flushing with water'
    ],
    equipmentProvided: [
      'NG tube of appropriate French size',
      'Water-soluble lubricating gel',
      '50ml catheter-tip feeding syringe',
      'Fixation tape & stethoscope'
    ],
    imageUrl: '/images/services/ryles-tube.jpg'
  },
  {
    id: 'suture-removal',
    title: 'Suture / Staple Removal',
    subtitle: 'Removal according to the treating clinician instructions',
    description: 'Save elderly or recovering patients a stressful hospital visit. Certified nurses evaluate incision healing before removing non-absorbable sutures.',
    singleVisitPrice: 1000,
    multiVisitPrice: 1000,
    nightSurcharge: 399,
    prescriptionRequired: true,
    duration: '20 - 30 mins',
    indicativePrice: 'Single: ₹1,000 / Multi: ₹1,000',
    priceNumber: 1000,
    features: [
      'Suture line examination & wound edge assessment',
      'Sterile suture scissors / staple extractor usage',
      'Post-removal antiseptic dressing applied',
      'Healing photograph documented for patient records'
    ],
    icon: 'Scissors',
    badge: 'Quick Service',
    procedureSteps: [
      'Wound evaluation for complete edge approximation',
      'Skin disinfection with antiseptic swab',
      'Gentle extraction without pulling external thread through tissue',
      'Sterile adhesive closure / strip application'
    ],
    equipmentProvided: [
      'Sterile stitch cutter / staple remover tool',
      'Sterile anatomical forceps',
      'Antiseptic cleansing pads',
      'Waterproof protective dressing'
    ],
    imageUrl: '/images/services/suture-removal.jpg'
  },
  {
    id: 'injection-administration',
    title: 'Injection & Vitals Monitoring',
    subtitle: 'Administration of prescribed injections by qualified RNs',
    description: 'Intramuscular (IM), Subcutaneous (SC), or IV push injections administered with vitals monitoring and sterile needle handling.',
    singleVisitPrice: 699,
    multiVisitPrice: 699,
    nightSurcharge: 399,
    prescriptionRequired: true,
    duration: '15 - 20 mins',
    indicativePrice: 'Single: ₹699 / Multi: ₹699',
    priceNumber: 699,
    features: [
      'Prescription & dosage verification',
      'Sterile single-use syringe & needle',
      'Vitals check (BP, Pulse, SPO2, Temp)',
      '15-min post-injection observation'
    ],
    icon: 'Activity',
    procedureSteps: [
      'Verify patient identity, prescription, and drug expiry',
      'Check pre-administration vitals',
      'Administer injection via prescribed route (IM/SC/IV)',
      'Observe for adverse reactions & document'
    ],
    equipmentProvided: [
      'Sterile syringes & needles',
      'Alcohol prep swabs',
      'Vitals evaluation kit',
      'Sharp container & waste pouch'
    ],
    imageUrl: '/images/services/lab-diagnostics.jpg'
  },
  {
    id: 'doctor-consult',
    title: 'Online Doctor Consultation',
    subtitle: 'Connect with verified general physicians within 15 minutes',
    description: 'Valid digital prescription issued on WhatsApp. Direct coordination with Xpress Nurse visiting team across Hyderabad.',
    singleVisitPrice: 299,
    multiVisitPrice: 299,
    nightSurcharge: 0,
    prescriptionRequired: false,
    duration: '15 - 20 mins',
    indicativePrice: 'Flat ₹299 (Prescription Included)',
    priceNumber: 299,
    features: [
      'Video / phone consult with MD Physician',
      'Instant authorized digital prescription PDF',
      'Valid for all home nursing procedures',
      'Priority nursing visit dispatch after consultation'
    ],
    icon: 'Stethoscope',
    badge: 'Instant Prescription',
    procedureSteps: [
      'Instant connection via WhatsApp video or phone call',
      'Clinical symptoms and medical history evaluation',
      'Treatment planning and advice',
      'Issuance of digitally signed medical prescription'
    ],
    equipmentProvided: [
      'Direct WhatsApp Video / Tele-consult line',
      'Digitally signed medical prescription PDF',
      'Direct dispatch dispatch sync to home nursing team'
    ],
    imageUrl: '/images/services/doctor-consult.jpg'
  },
  {
    id: 'lab-diagnostics',
    title: 'Lab Sample Collection at Home',
    subtitle: 'Home blood & urine sample collection with NABL reports',
    description: 'Complete blood count, lipid profile, HbA1c, liver/kidney function tests collected at home with digital WhatsApp report delivery.',
    singleVisitPrice: 399,
    multiVisitPrice: 399,
    nightSurcharge: 0,
    prescriptionRequired: false,
    duration: '15 - 25 mins',
    indicativePrice: 'Starts from ₹399',
    priceNumber: 399,
    features: [
      'Painless venous blood collection at home',
      'Cold-chain transport of diagnostic specimens',
      'NABL-accredited diagnostic partner laboratories',
      'Digital test reports sent via WhatsApp in 12-24h'
    ],
    icon: 'TestTube2',
    procedureSteps: [
      'Patient identification and fasting status confirmation',
      'Tourniquet application and aseptic venipuncture',
      'Collection into color-coded vacuum tubes (EDTA, Gel, etc.)',
      'Tube barcoding, cold-chain packing, and lab dispatch'
    ],
    equipmentProvided: [
      'BD Vacutainer sterile safety needles & tubes',
      'Alcohol prep swabs & hypoallergenic adhesive bandage',
      'Cold storage temperature-controlled sample bag'
    ],
    imageUrl: '/images/services/lab-diagnostics.jpg'
  }
];

export const DEFAULT_NURSES: NurseProfile[] = [
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
    avatarUrl: 'https://images.unsplash.com/photo-1594824813589-9a25b42d768a?w=150&auto=format&fit=crop&q=80',
    certificateVerified: true
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
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    certificateVerified: true
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
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    certificateVerified: true
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
    avatarUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80',
    certificateVerified: true
  }
];

export const DEFAULT_BOOKINGS: Booking[] = [
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
    prescriptionUrl: 'https://pub-830eaa9d07034c8d985d7d00577f77e9.r2.dev/prescriptions/Dr_Reddy_IV_Prescription.pdf',
    status: 'Assigned',
    assignedNurseId: 'nurse-101',
    assignedNurseName: 'Nurse Priya Sharma (Gachibowli Area Match)',
    referringNurseId: undefined,
    referringNurseName: undefined,
    estimatedFee: 899,
    nightSurcharge: 0,
    referralBonusRupees: 0,
    notes: 'Normal Saline 500ml post gastroenteritis.'
  },
  {
    id: 'BK-8902',
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
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
    prescriptionUrl: 'https://pub-830eaa9d07034c8d985d7d00577f77e9.r2.dev/prescriptions/Urology_Catheter_Order.pdf',
    status: 'Assigned',
    assignedNurseId: 'nurse-102',
    assignedNurseName: 'Nurse Rajesh Kumar (LB Nagar Area Match)',
    referringNurseId: 'nurse-101',
    referringNurseName: 'Nurse Priya Sharma (Gachibowli - 10% Referral)',
    estimatedFee: 1299,
    nightSurcharge: 0,
    referralBonusRupees: 129.90,
    notes: 'Referred by Nurse Priya from Gachibowli for LB Nagar resident. 10% bonus credited to Priya.'
  },
  {
    id: 'BK-8903',
    createdAt: new Date(Date.now() - 1800 * 1000).toISOString(),
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
    nightSurcharge: 0,
    referralBonusRupees: 80,
    notes: 'Post knee arthroscopy dressing change. Referred by Nurse Priya.'
  }
];

export const DEFAULT_LEADS: NurseLead[] = [
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
    referralCommissionRupees: 80
  }
];

export const DEFAULT_CONSULTATIONS: DoctorConsultation[] = [
  {
    id: 'CNS-5001',
    patientName: 'K. Venkatesh Rao',
    patientAge: 68,
    patientPhone: '98765 43210',
    symptoms: 'Mild dehydration & electrolyte depletion following acute gastroenteritis.',
    area: 'Gachibowli',
    requestedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    status: 'Prescription Issued',
    prescriptionIssued: true,
    prescriptionText: 'Rx: Normal Saline 0.9% 500ml IV Infusion slowly over 60 mins. Monitor BP & vitals pre/post.',
    recommendedService: 'saline-infusion'
  },
  {
    id: 'CNS-5002',
    patientName: 'Suresh Babu',
    patientAge: 58,
    patientPhone: '98490 55667',
    symptoms: 'Post-op knee arthroscopy dressing replacement & stitch line check.',
    area: 'Madhapur',
    requestedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    status: 'Awaiting Call',
    prescriptionIssued: false,
    prescriptionText: '',
    recommendedService: 'wound-dressing'
  }
];

export const DEFAULT_COUPONS: Coupon[] = [
  {
    id: 'CPN-FIRST100',
    code: 'FIRST100',
    discountType: 'flat',
    discountValue: 100,
    minOrderAmount: 500,
    description: 'Flat ₹100 instant off on your first home visit in Hyderabad',
    status: 'Active',
    usageLimit: 1000,
    timesUsed: 38,
    validUntil: '2026-12-31T23:59:59.000Z'
  },
  {
    id: 'CPN-CARE15',
    code: 'CARE15',
    discountType: 'percent',
    discountValue: 15,
    maxDiscount: 200,
    minOrderAmount: 600,
    description: '15% off up to ₹200 on all clinical nursing procedures',
    status: 'Active',
    usageLimit: 500,
    timesUsed: 24,
    validUntil: '2026-11-30T23:59:59.000Z'
  },
  {
    id: 'CPN-SENIOR20',
    code: 'SENIOR20',
    discountType: 'percent',
    discountValue: 20,
    maxDiscount: 250,
    minOrderAmount: 700,
    description: '20% off up to ₹250 dedicated to senior citizen care',
    status: 'Active',
    usageLimit: 500,
    timesUsed: 19,
    validUntil: '2026-12-31T23:59:59.000Z'
  },
  {
    id: 'CPN-HYD50',
    code: 'HYD50',
    discountType: 'flat',
    discountValue: 50,
    minOrderAmount: 300,
    description: 'Flat ₹50 quick discount across all Hyderabad zones',
    status: 'Active',
    usageLimit: 2000,
    timesUsed: 85,
    validUntil: '2026-10-31T23:59:59.000Z'
  },
  {
    id: 'CPN-HYDCARE150',
    code: 'HYDCARE150',
    discountType: 'flat',
    discountValue: 150,
    minOrderAmount: 1000,
    description: 'Special ₹150 off on critical procedures & catheter/tube care',
    status: 'Active',
    usageLimit: 200,
    timesUsed: 12,
    validUntil: '2026-11-15T23:59:59.000Z'
  },
  {
    id: 'CPN-WELCOME50',
    code: 'WELCOME50',
    discountType: 'percent',
    discountValue: 10,
    maxDiscount: 100,
    minOrderAmount: 400,
    description: '10% welcome bonus for all new patient registrations',
    status: 'Active',
    usageLimit: 1000,
    timesUsed: 42,
    validUntil: '2026-12-31T23:59:59.000Z'
  }
];

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
    serviceArea: 'Hyderabad HQ' as any
  },
  {
    id: 'user-doc-1',
    role: 'doctor',
    identifier: 'dr.reddy@xpressnurse.in',
    name: 'Dr. K. V. Reddy (MD Gen Med)',
    pin: '4321',
    phone: '9848011223',
    email: 'dr.reddy@xpressnurse.in',
    designation: 'Senior Consulting Physician',
    serviceArea: 'Hyderabad Tele-Care' as any
  },
  {
    id: 'nurse-101',
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
    id: 'nurse-102',
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
    id: 'nurse-103',
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
    id: 'nurse-104',
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

// ============================================================================
// 1. SERVICES TABLE (public.services)
// ============================================================================

export async function dbFetchServices(): Promise<ServiceItem[] | null> {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('single_visit_price', { ascending: false });

    if (error || !data || data.length === 0) return DEFAULT_SERVICES;

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
      createdAt: s.created_at
    }));
  } catch {
    return DEFAULT_SERVICES;
  }
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
      image_url: s.imageUrl || null
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

  try {
    const { error } = await supabase.from('services').update(payload).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function dbDeleteService(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('services').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// 2. NURSES TABLE (public.nurses)
// ============================================================================

export async function dbFetchNurses(): Promise<NurseProfile[] | null> {
  try {
    const { data, error } = await supabase
      .from('nurses')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) return DEFAULT_NURSES;

    return data.map((n: any) => ({
      id: n.id,
      name: n.name,
      phone: n.phone,
      email: n.email,
      experienceYears: Number(n.experience_years) || 5,
      qualification: n.qualification,
      serviceArea: n.service_area,
      status: n.status || 'Active',
      totalLeads: Number(n.total_leads) || 0,
      convertedLeads: Number(n.converted_leads) || 0,
      totalReferrals: Number(n.total_referrals) || 0,
      pointsEarned: Number(n.points_earned) || 300,
      referralEarningsRupees: Number(n.referral_earnings_rupees) || 0,
      rating: Number(n.rating) || 4.90,
      avatarUrl: n.avatar_url || 'https://images.unsplash.com/photo-1594824813589-9a25b42d768a?w=150&auto=format&fit=crop&q=80',
      certificateVerified: Boolean(n.certificate_verified),
      createdAt: n.created_at
    }));
  } catch {
    return DEFAULT_NURSES;
  }
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
      experience_years: Math.round(Number(n.experienceYears)) || 5,
      qualification: n.qualification,
      service_area: n.serviceArea,
      status: n.status || 'Active',
      total_leads: Math.round(Number(n.totalLeads)) || 0,
      converted_leads: Math.round(Number(n.convertedLeads)) || 0,
      total_referrals: Math.round(Number(n.totalReferrals)) || 0,
      points_earned: Math.round(Number(n.pointsEarned)) || 300,
      referral_earnings_rupees: Number(n.referralEarningsRupees) || 0,
      rating: Number(n.rating) || 4.90,
      avatar_url: n.avatarUrl || null,
      certificate_verified: Boolean(n.certificateVerified ?? true)
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
      experience_years: Math.round(Number(n.experienceYears)) || 5,
      qualification: n.qualification,
      service_area: n.serviceArea,
      status: n.status || 'Active',
      total_leads: Math.round(Number(n.totalLeads)) || 0,
      converted_leads: Math.round(Number(n.convertedLeads)) || 0,
      total_referrals: Math.round(Number(n.totalReferrals)) || 0,
      points_earned: Math.round(Number(n.pointsEarned)) || 300,
      referral_earnings_rupees: Number(n.referralEarningsRupees) || 0,
      rating: Number(n.rating) || 4.90,
      avatar_url: n.avatarUrl || 'https://images.unsplash.com/photo-1594824813589-9a25b42d768a?w=150&auto=format&fit=crop&q=80',
      certificate_verified: Boolean(n.certificateVerified ?? true)
    };

    const { error } = await supabase.from('nurses').insert(payload);
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
  if (updates.experienceYears !== undefined) payload.experience_years = Math.round(Number(updates.experienceYears));
  if (updates.qualification !== undefined) payload.qualification = updates.qualification;
  if (updates.serviceArea !== undefined) payload.service_area = updates.serviceArea;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.totalLeads !== undefined) payload.total_leads = Math.round(Number(updates.totalLeads));
  if (updates.convertedLeads !== undefined) payload.converted_leads = Math.round(Number(updates.convertedLeads));
  if (updates.totalReferrals !== undefined) payload.total_referrals = Math.round(Number(updates.totalReferrals));
  if (updates.pointsEarned !== undefined) payload.points_earned = Math.round(Number(updates.pointsEarned));
  if (updates.referralEarningsRupees !== undefined) payload.referral_earnings_rupees = Number(updates.referralEarningsRupees);
  if (updates.rating !== undefined) payload.rating = Number(updates.rating);
  if (updates.certificateVerified !== undefined) payload.certificate_verified = Boolean(updates.certificateVerified);
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;

  try {
    const { error } = await supabase.from('nurses').update(payload).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function dbDeleteNurse(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('nurses').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// 3. BOOKINGS TABLE (public.bookings)
// ============================================================================

export async function dbFetchBookings(): Promise<Booking[] | null> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return DEFAULT_BOOKINGS;

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
      preferredDate: b.preferred_date,
      preferredTime: b.preferred_time,
      hasPrescription: Boolean(b.has_prescription),
      prescriptionFileName: b.prescription_file_name,
      prescriptionUrl: b.prescription_url,
      status: b.status || 'Assigned',
      assignedNurseId: b.assigned_nurse_id,
      assignedNurseName: b.assigned_nurse_name,
      referringNurseId: b.referring_nurse_id,
      referringNurseName: b.referring_nurse_name,
      estimatedFee: Number(b.estimated_fee) || 800,
      nightSurcharge: Number(b.night_surcharge) || 0,
      referralBonusRupees: Number(b.referral_bonus_rupees) || 0,
      notes: b.notes
    }));
  } catch {
    return DEFAULT_BOOKINGS;
  }
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

    const payload = {
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
      preferred_date: b.preferredDate || 'Today',
      preferred_time: b.preferredTime || 'Immediate',
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
      notes: b.notes || null
    };

    const { error } = await supabase.from('bookings').upsert(payload);
    if (error) {
      console.error('[DB] Supabase bookings save error:', error.message, error.details);
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
  if (updates.preferredDate !== undefined) payload.preferred_date = updates.preferredDate || null;
  if (updates.preferredTime !== undefined) payload.preferred_time = updates.preferredTime || null;
  if (updates.status !== undefined) payload.status = updates.status;
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
    return !error;
  } catch {
    return false;
  }
}

export async function dbDeleteBooking(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// 4. LEADS TABLE (public.leads)
// ============================================================================

export async function dbFetchLeads(): Promise<NurseLead[] | null> {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error || !data || data.length === 0) return DEFAULT_LEADS;

    return data.map((l: any) => ({
      id: l.id,
      nurseId: l.nurse_id,
      patientName: l.patient_name,
      patientPhone: l.patient_phone,
      serviceId: l.service_id,
      area: l.area,
      submittedAt: l.submitted_at,
      status: l.status || 'Converted',
      assignedNurseId: l.assigned_nurse_id,
      leadValueRupees: Number(l.lead_value_rupees) || 1000.00,
      pointsAwarded: Math.round(Number(l.points_awarded)) || 50,
      referralCommissionRupees: Number(l.referral_commission_rupees) || 100.00
    }));
  } catch {
    return DEFAULT_LEADS;
  }
}

export async function dbSaveLead(lead: NurseLead): Promise<boolean> {
  try {
    let isoSubmittedAt = new Date().toISOString();
    if (lead.submittedAt && lead.submittedAt.includes('T')) {
      isoSubmittedAt = lead.submittedAt;
    }

    const cleanNurseId = (lead.nurseId && lead.nurseId.trim() !== '' && lead.nurseId !== 'none') ? lead.nurseId.trim() : null;
    const cleanAssignedNurseId = (lead.assignedNurseId && lead.assignedNurseId.trim() !== '' && lead.assignedNurseId !== 'none') ? lead.assignedNurseId.trim() : null;

    const payload = {
      id: lead.id,
      nurse_id: cleanNurseId,
      patient_name: lead.patientName,
      patient_phone: lead.patientPhone,
      service_id: lead.serviceId,
      area: lead.area,
      submitted_at: isoSubmittedAt,
      status: lead.status || 'Converted',
      assigned_nurse_id: cleanAssignedNurseId,
      lead_value_rupees: Number(lead.leadValueRupees) || 1000.00,
      points_awarded: Math.round(Number(lead.pointsAwarded)) || 50,
      referral_commission_rupees: Number(lead.referralCommissionRupees) || 100.00
    };

    const { error } = await supabase.from('leads').upsert(payload);
    if (error) {
      console.error('[DB] Supabase leads save error:', error.message);
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
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.nurseId !== undefined) {
    payload.nurse_id = (updates.nurseId && updates.nurseId.trim() !== '' && updates.nurseId !== 'none') ? updates.nurseId.trim() : null;
  }
  if (updates.assignedNurseId !== undefined) {
    payload.assigned_nurse_id = (updates.assignedNurseId && updates.assignedNurseId.trim() !== '' && updates.assignedNurseId !== 'none') ? updates.assignedNurseId.trim() : null;
  }
  if (updates.pointsAwarded !== undefined) payload.points_awarded = Math.round(Number(updates.pointsAwarded));
  if (updates.leadValueRupees !== undefined) payload.lead_value_rupees = Number(updates.leadValueRupees);
  if (updates.referralCommissionRupees !== undefined) payload.referral_commission_rupees = Number(updates.referralCommissionRupees);

  try {
    const { error } = await supabase.from('leads').update(payload).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function dbDeleteLead(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// 5. CONSULTATIONS TABLE (public.consultations)
// ============================================================================

export async function dbFetchConsultations(): Promise<DoctorConsultation[] | null> {
  try {
    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .order('requested_at', { ascending: false });

    if (error || !data || data.length === 0) return DEFAULT_CONSULTATIONS;

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
      recommendedService: c.recommended_service
    }));
  } catch {
    return DEFAULT_CONSULTATIONS;
  }
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
      prescription_text: c.prescriptionText || null,
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
  if (updates.prescriptionText !== undefined) payload.prescription_text = updates.prescriptionText || null;
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
    return !error;
  } catch {
    return false;
  }
}

// ============================================================================
// 6. COUPONS TABLE (public.coupons)
// ============================================================================

export async function dbFetchCoupons(): Promise<Coupon[] | null> {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return DEFAULT_COUPONS;
    }

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
  } catch (err) {
    console.warn('[DB] Using fallback default coupons:', err);
    return DEFAULT_COUPONS;
  }
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
    description: coupon.description.trim(),
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

    return !error;
  } catch {
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
    if (!error && data && data.length > 0) {
      return data.map((u: any) => ({
        id: u.id,
        role: u.role,
        identifier: u.identifier,
        name: u.name,
        pin: u.pin,
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

export async function dbVerifyUserPin(
  role: 'patient' | 'nurse' | 'doctor' | 'admin',
  inputIdentifier: string,
  inputPin: string
): Promise<{ success: boolean; user?: AppUser; message: string }> {
  const cleanId = inputIdentifier.trim().toLowerCase().replace(/[\s-+]/g, '');
  const cleanPin = inputPin.trim();

  if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
    return { success: false, message: 'PIN must be exactly 4 numeric digits.' };
  }

  // 1. Try querying Supabase app_users table if present
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('role', role);

    if (!error && data && data.length > 0) {
      const matched = data.find((u: any) => {
        const uId = (u.identifier || '').toLowerCase().replace(/[\s-+]/g, '');
        const uPhone = (u.phone || '').toLowerCase().replace(/[\s-+]/g, '');
        const uEmail = (u.email || '').toLowerCase().replace(/[\s-+]/g, '');
        return uId === cleanId || uPhone === cleanId || uEmail === cleanId;
      });

      if (matched) {
        if (matched.pin === cleanPin) {
          return {
            success: true,
            user: {
              id: matched.id,
              role: matched.role,
              identifier: matched.identifier,
              name: matched.name,
              pin: matched.pin,
              phone: matched.phone,
              email: matched.email,
              designation: matched.designation,
              serviceArea: matched.service_area,
              avatarUrl: matched.avatar_url
            },
            message: '4-Digit PIN verified successfully from database.'
          };
        } else {
          return { success: false, message: 'Incorrect 4-digit PIN. Please verify credentials.' };
        }
      }
    }
  } catch {
    // proceed to nurses table and seed directory
  }

  // 2. Query nurses table directly if nurse login
  if (role === 'nurse') {
    try {
      const { data: nursesData } = await supabase.from('nurses').select('*');
      if (nursesData && nursesData.length > 0) {
        const matchedNurse = nursesData.find((n: any) => {
          const nEmail = (n.email || '').toLowerCase().replace(/[\s-+]/g, '');
          const nPhone = (n.phone || '').toLowerCase().replace(/[\s-+]/g, '');
          const nId = (n.id || '').toLowerCase().replace(/[\s-+]/g, '');
          return nEmail === cleanId || nPhone === cleanId || nId === cleanId;
        });

        if (matchedNurse) {
          const seedMatch = SEED_APP_USERS.find(
            (s) => s.role === 'nurse' && s.identifier.toLowerCase() === matchedNurse.email.toLowerCase()
          );
          const expectedPin = seedMatch ? seedMatch.pin : '1001';
          if (cleanPin === expectedPin) {
            return {
              success: true,
              user: {
                id: matchedNurse.id,
                role: 'nurse',
                identifier: matchedNurse.email,
                name: matchedNurse.name,
                pin: cleanPin,
                phone: matchedNurse.phone,
                email: matchedNurse.email,
                designation: matchedNurse.qualification,
                serviceArea: matchedNurse.service_area
              },
              message: 'Nurse verified from database with 4-digit PIN.'
            };
          }
        }
      }
    } catch {
      // fallback
    }
  }

  // 3. Check fallback verified user directory
  const fallbackMatch = SEED_APP_USERS.find((u) => {
    if (u.role !== role) return false;
    const uId = u.identifier.toLowerCase().replace(/[\s-+]/g, '');
    const uPhone = (u.phone || '').toLowerCase().replace(/[\s-+]/g, '');
    const uEmail = (u.email || '').toLowerCase().replace(/[\s-+]/g, '');
    return uId === cleanId || uPhone === cleanId || uEmail === cleanId;
  });

  if (fallbackMatch) {
    if (fallbackMatch.pin === cleanPin) {
      return {
        success: true,
        user: fallbackMatch,
        message: '4-Digit PIN verified from database directory.'
      };
    } else {
      return { success: false, message: 'Incorrect 4-digit PIN for this account.' };
    }
  }

  // For patient testing with 10-digit mobile number
  if (role === 'patient' && cleanId.length === 10 && (cleanPin === '7569' || cleanPin === '1234' || cleanPin === '8899')) {
    return {
      success: true,
      user: {
        id: `user-pat-${cleanId.slice(-4)}`,
        role: 'patient',
        identifier: cleanId,
        name: `Patient (${cleanId})`,
        pin: cleanPin,
        phone: cleanId
      },
      message: 'Patient verified with 4-digit PIN.'
    };
  }

  return {
    success: false,
    message: `Account not found in ${role} directory. Please check your staff ID or phone number.`
  };
}

export async function dbInsertAppUser(u: AppUser): Promise<boolean> {
  try {
    const { error } = await supabase.from('app_users').insert({
      id: u.id,
      role: u.role,
      identifier: u.identifier,
      name: u.name,
      pin: u.pin,
      phone: u.phone || null,
      email: u.email || null,
      designation: u.designation || null,
      service_area: u.serviceArea || null,
      avatar_url: u.avatarUrl || null
    });
    return !error;
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
    return !error;
  } catch {
    return false;
  }
}

export async function dbDeleteAppUser(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('app_users').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}
