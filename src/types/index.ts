export type ServiceId = 
  | 'saline-infusion'
  | 'wound-dressing'
  | 'foleys-catheter'
  | 'ryles-tube'
  | 'suture-removal'
  | 'lab-diagnostics'
  | 'doctor-consult'
  | 'personalized-nursing';

export interface ServiceItem {
  id: ServiceId;
  title: string;
  subtitle: string;
  description: string;
  prescriptionRequired: boolean;
  duration: string;
  indicativePrice: string;
  priceNumber?: number;
  multiVisitPrice?: number;
  nightSurcharge?: number;
  features: string[];
  icon: string;
  badge?: string;
  procedureSteps: string[];
  equipmentProvided: string[];
  imageUrl?: string;
}

export type HyderabadArea = 
  | 'Gachibowli'
  | 'LB Nagar'
  | 'Madhapur'
  | 'Banjara Hills'
  | 'Jubilee Hills'
  | 'Kukatpally'
  | 'Secunderabad'
  | 'Kondapur'
  | 'Dilsukhnagar'
  | 'Hitec City';

export interface Booking {
  id: string;
  createdAt: string;
  patientName: string;
  patientPhone: string;
  patientAge?: number;
  patientGender?: 'Male' | 'Female' | 'Other';
  serviceId: ServiceId;
  serviceTitle: string;
  area: HyderabadArea;
  fullAddress: string;
  preferredDate: string;
  preferredTime: string;
  hasPrescription: boolean;
  prescriptionFileName?: string;
  prescriptionUrl?: string;
  status: 'Pending' | 'Assigned' | 'In-Progress' | 'Completed' | 'Cancelled';
  assignedNurseId?: string;
  assignedNurseName?: string;
  referringNurseId?: string; // Referring Nurse who originated the lead
  referringNurseName?: string; // Name of referring nurse
  estimatedFee: number;
  promoCode?: string; // e.g. FIRST100, SENIOR15, HYDCARE
  discountRupees?: number; // Discount deducted
  finalFee?: number; // Payable amount after discount
  nightSurcharge?: number; // ₹399 after 9pm
  referralBonusRupees?: number; // 10% referral benefit
  notes?: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
}

export interface NurseProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  experienceYears: number;
  qualification: string;
  serviceArea: HyderabadArea; // Rule 2: Service area matching
  status: 'Active' | 'Pending Verification' | 'On Leave';
  totalLeads: number;
  convertedLeads: number;
  totalReferrals: number;
  pointsEarned: number;
  referralEarningsRupees: number;
  rating: number;
  avatarUrl: string;
  certificateVerified: boolean;
}

export interface NurseLead {
  id: string;
  nurseId: string;
  patientName: string;
  patientPhone: string;
  serviceId: ServiceId;
  area: HyderabadArea;
  submittedAt: string;
  status: 'Pending Approval' | 'Approved' | 'Rejected' | 'Converted' | 'Submitted' | 'Contacted' | 'Lost';
  assignedNurseId?: string;
  leadValueRupees?: number;
  pointsAwarded?: number;
  referralCommissionRupees?: number;
  approvedAt?: string;
  approvedBy?: string;
  adminNotes?: string;
}

export interface DoctorConsultation {
  id: string;
  patientName: string;
  patientAge: number;
  patientPhone: string;
  symptoms: string;
  area: HyderabadArea;
  requestedAt: string;
  status: 'Awaiting Call' | 'In Call' | 'Prescription Issued' | 'Completed';
  prescriptionIssued?: boolean;
  prescriptionText?: string;
  recommendedService?: ServiceId;
  doctorNotes?: string;
}

export interface AppUser {
  id: string;
  role: 'patient' | 'nurse' | 'doctor' | 'admin';
  identifier: string; // phone or email or staff id
  name: string;
  pin: string; // 4-digit numeric PIN
  phone?: string;
  email?: string;
  designation?: string;
  serviceArea?: HyderabadArea;
  avatarUrl?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'flat' | 'percent';
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  description: string;
  status: 'Active' | 'Inactive' | 'Expired';
  usageLimit?: number;
  timesUsed: number;
  validUntil?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type StorageCategory = 
  | 'invoices' 
  | 'prescriptions' 
  | 'certificates' 
  | 'teleconsult-rx' 
  | 'receipts' 
  | 'lab-reports';

export interface CloudflareStorageObject {
  id: string;
  bucketName: string;
  key: string;
  category: StorageCategory;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  publicUrl: string;
  dataUrl?: string; // Base64 / Data URL for in-browser instant preview
  metadata?: {
    bookingId?: string;
    patientName?: string;
    patientPhone?: string;
    serviceTitle?: string;
    nurseId?: string;
    nurseName?: string;
    amount?: number;
    gstin?: string;
    description?: string;
  };
}

export interface InvoiceDetails {
  invoiceNumber: string; // e.g. XN-INV-2026-1042
  invoiceDate: string;
  bookingId: string;
  patientName: string;
  patientPhone: string;
  patientAge?: number;
  patientGender?: string;
  fullAddress: string;
  area: string;
  serviceTitle: string;
  serviceId: string;
  assignedNurseName?: string;
  baseAmount: number;
  nightSurcharge?: number;
  discountRupees?: number;
  taxableAmount: number;
  cgst: number; // 9%
  sgst: number; // 9%
  totalAmount: number;
  paymentStatus: 'Paid' | 'Pending' | 'Refunded';
  paymentMode: 'UPI / Online' | 'Cash on Visit' | 'Corporate Direct';
  r2StorageKey: string;
  r2PublicUrl: string;
}

export interface CloudflareR2Config {
  accountId: string;
  bucketName: string;
  publicDomain: string;
  apiToken?: string;
  endpoint?: string;
  corsEnabled?: boolean;
}

