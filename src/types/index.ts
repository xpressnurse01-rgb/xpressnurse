export type ServiceId = 
  | 'saline-infusion'
  | 'wound-dressing'
  | 'foleys-catheter'
  | 'ryles-tube'
  | 'suture-removal'
  | 'injection-administration'
  | 'vitals-monitoring'
  | 'vital-monitoring'
  | 'elderly-care'
  | 'lab-diagnostics'
  | 'doctor-consult'
  | 'personalized-nursing'
  | (string & {});

export interface ServiceItem {
  id: ServiceId;
  title: string;
  subtitle?: string;
  description?: string;
  singleVisitPrice?: number;
  multiVisitPrice?: number;
  nightSurcharge?: number;
  prescriptionRequired?: boolean;
  duration?: string;
  indicativePrice?: string;
  priceNumber?: number;
  features?: string[];
  icon?: string;
  badge?: string;
  procedureSteps?: string[];
  equipmentProvided?: string[];
  imageUrl?: string;
  createdAt?: string;
}

export type HyderabadArea = string;

export interface Booking {
  id: string;
  createdAt: string;
  patientName: string;
  patientPhone: string;
  patientAge?: number;
  patientGender?: 'Male' | 'Female' | 'Other' | string;
  serviceId: ServiceId;
  serviceTitle: string;
  area: string;
  fullAddress: string;
  bookingType?: 'Instant' | 'Scheduled' | 'instant' | 'scheduled';
  preferredDate?: string;
  preferredTime?: string;
  scheduledSlot?: string;
  hasPrescription: boolean;
  prescriptionFileName?: string;
  prescriptionUrl?: string;
  prescriptionIssued?: boolean;
  status: 'Pending' | 'Assigned' | 'In-Progress' | 'Completed' | 'Cancelled' | 'Rejected';
  nurseAcceptanceStatus?: 'Pending' | 'Accepted' | 'Rejected';
  assignedNurseId?: string;
  assignedNurseName?: string;
  referringNurseId?: string;
  referringNurseName?: string;
  estimatedFee: number;
  nightSurcharge?: number;
  referralBonusRupees?: number;
  notes?: string;
  promoCode?: string;
  discountRupees?: number;
  finalFee?: number;
  invoiceNumber?: string;
  invoiceUrl?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedNurseId?: string;
  rejectedNurseName?: string;
  rejectedAt?: string;
}

export interface NursePayoutRecord {
  id: string;
  nurseId: string;
  amount: number;
  status: 'Paid' | 'Pending';
  description: string;
  date: string;
  transactionRef?: string;
  serviceTitle?: string;
  rejectionReason?: string;
}

export interface NurseProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  experienceYears: number;
  experience?: string;
  qualification: string;
  serviceArea: string;
  pin?: string;
  status: 'Active' | 'Pending Verification' | 'On Leave' | 'Rejected' | string;
  totalLeads: number;
  convertedLeads: number;
  totalReferrals: number;
  pointsEarned: number;
  completedVisits?: number;
  activeVisits?: number;
  points?: number;
  earningsPaid?: number;
  earningsPending?: number;
  referralEarningsRupees: number;
  totalEarningsRupees?: number;
  paidEarningsRupees?: number;
  pendingEarningsRupees?: number;
  payouts?: NursePayoutRecord[];
  rating: number;
  avatarUrl?: string;
  certificateVerified: boolean;
  certificateUrl?: string;
  createdAt?: string;
  rejectionReason?: string;
  referredByNurseId?: string;
  referredByNurseName?: string;
  referralCode?: string;
}

export interface NurseLead {
  id: string;
  nurseId?: string;
  nurseName?: string;
  referredNurseName?: string;
  referredNursePhone?: string;
  patientName?: string;
  patientPhone?: string;
  patientAge?: number | string;
  patientGender?: string;
  fullAddress?: string;
  notes?: string;
  qualification?: string;
  experienceYears?: number;
  serviceId?: ServiceId;
  serviceTitle?: string;
  area: string;
  submittedAt: string;
  status: 'Pending Approval' | 'Approved' | 'Rejected' | 'Converted' | 'Submitted' | 'Contacted' | 'Lost';
  assignedNurseId?: string;
  leadValueRupees?: number;
  pointsAwarded?: number;
  referralCommissionRupees?: number;
  approvedAt?: string;
  approvedBy?: string;
  adminNotes?: string;
  rejectionReason?: string;
  rejectedBy?: string;
}

export interface DoctorConsultation {
  id: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  patientPhone: string;
  symptoms: string;
  area: string;
  requestedAt?: string;
  status: 'Awaiting Call' | 'In Call' | 'Prescription Issued' | 'Completed' | 'Rejected';
  prescriptionIssued?: boolean;
  prescriptionText?: string;
  recommendedService?: ServiceId;
  doctorName?: string;
  doctorNotes?: string;
  rejectionReason?: string;
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
  serviceArea?: string;
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
  dataUrl?: string;
  metadata?: {
    bookingId?: string;
    patientName?: string;
    patientPhone?: string;
    serviceTitle?: string;
    nurseId?: string;
    nurseName?: string;
    qualification?: string;
    experienceYears?: number;
    certificateVerified?: boolean;
    amount?: number;
    totalAmount?: number;
    serviceArea?: string;
    description?: string;
    [key: string]: any;
  };
}

export interface InvoiceDetails {
  invoiceNumber: string;
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
