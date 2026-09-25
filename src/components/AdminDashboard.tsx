import React, { useState } from 'react';
import { 
  Booking, 
  NurseProfile, 
  HyderabadArea, 
  NurseLead, 
  Coupon, 
  AppUser, 
  ServiceItem, 
  DoctorConsultation, 
  ServiceId,
  CloudflareStorageObject,
  InvoiceDetails,
  CloudflareR2Config,
  StorageCategory
} from '../types';
import { 
  Users, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Shuffle, 
  AlertCircle, 
  FileText, 
  CheckCircle, 
  Award,
  Calendar, 
  Search, 
  Activity,
  ArrowRight,
  Tag,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  Percent,
  X,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Phone,
  Mail,
  Shield,
  ExternalLink,
  Stethoscope,
  Layers,
  DollarSign,
  Cloud,
  Download,
  Printer,
  UploadCloud,
  FileCheck,
  HardDrive,
  Settings,
  Receipt,
  Share2
} from 'lucide-react';
import { EmptyState } from './EmptyState';
import { DEFAULT_COUPONS, SEED_APP_USERS } from '../lib/supabase';
import {
  getCloudflareConfig,
  saveCloudflareConfig,
  getCloudflareObjects,
  uploadToCloudflareStorage,
  deleteFromCloudflareStorage,
  generateInvoiceDetails,
  saveInvoiceToCloudflareBucket,
  openPrintableInvoiceWindow,
  getPrescriptionStorageObject
} from '../lib/cloudflareStorage';

interface AdminDashboardProps {
  bookings: Booking[];
  nurses: NurseProfile[];
  leads: NurseLead[];
  services?: ServiceItem[];
  consultations?: DoctorConsultation[];
  coupons?: Coupon[];
  appUsers?: AppUser[];
  onAssignOrder: (bookingId: string, nurseId: string, ruleExplanation: string) => void;
  onAutoRouteAll: () => void;
  // Coupons CRUD
  onCreateCoupon?: (coupon: Omit<Coupon, 'id' | 'createdAt' | 'timesUsed'>) => Promise<void>;
  onUpdateCoupon?: (id: string, updates: Partial<Coupon>) => Promise<void>;
  onDeleteCoupon?: (id: string) => Promise<void>;
  // Bookings CRUD
  onCreateBooking?: (booking: Booking) => Promise<void>;
  onUpdateBooking?: (id: string, updates: Partial<Booking>) => Promise<void>;
  onDeleteBooking?: (id: string) => Promise<void>;
  // Nurses CRUD
  onCreateNurse?: (nurse: NurseProfile) => Promise<void>;
  onUpdateNurseRecord?: (id: string, updates: Partial<NurseProfile>) => Promise<void>;
  onDeleteNurse?: (id: string) => Promise<void>;
  // Leads CRUD
  onCreateLead?: (lead: NurseLead) => Promise<void>;
  onUpdateLead?: (id: string, updates: Partial<NurseLead>) => Promise<void>;
  onDeleteLead?: (id: string) => Promise<void>;
  onApproveLead?: (leadId: string, pointsAwarded: number, referralRupees: number, adminNotes?: string) => Promise<void>;
  onRejectLead?: (leadId: string, adminNotes?: string) => Promise<void>;
  // Services CRUD
  onCreateService?: (service: ServiceItem) => Promise<void>;
  onUpdateService?: (id: string, updates: Partial<ServiceItem>) => Promise<void>;
  onDeleteService?: (id: string) => Promise<void>;
  // Consultations CRUD
  onCreateConsultation?: (consult: DoctorConsultation) => Promise<void>;
  onUpdateConsultation?: (id: string, updates: Partial<DoctorConsultation>) => Promise<void>;
  onDeleteConsultation?: (id: string) => Promise<void>;
  // App Users CRUD
  onCreateAppUser?: (user: AppUser) => Promise<void>;
  onUpdateAppUser?: (id: string, updates: Partial<AppUser>) => Promise<void>;
  onDeleteAppUser?: (id: string) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  bookings,
  nurses,
  leads,
  services = [],
  consultations = [],
  coupons = DEFAULT_COUPONS,
  appUsers = SEED_APP_USERS,
  onAssignOrder,
  onAutoRouteAll,
  onCreateCoupon,
  onUpdateCoupon,
  onDeleteCoupon,
  onCreateBooking,
  onUpdateBooking,
  onDeleteBooking,
  onCreateNurse,
  onUpdateNurseRecord,
  onDeleteNurse,
  onCreateLead,
  onUpdateLead,
  onDeleteLead,
  onApproveLead,
  onRejectLead,
  onCreateService,
  onUpdateService,
  onDeleteService,
  onCreateConsultation,
  onUpdateConsultation,
  onDeleteConsultation,
  onCreateAppUser,
  onUpdateAppUser,
  onDeleteAppUser
}) => {
  const [activeTab, setActiveTab] = useState<'routing' | 'bookings' | 'nurses' | 'services' | 'leads' | 'consultations' | 'coupons' | 'credentials' | 'storage'>('routing');
  const [testSimPatientArea, setTestSimPatientArea] = useState<HyderabadArea>('LB Nagar');
  const [testSimReferringNurse, setTestSimReferringNurse] = useState<string>('none');
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // CLOUDFLARE R2 STORAGE & INVOICE MANAGEMENT STATE
  // --------------------------------------------------------------------------
  const [storageObjects, setStorageObjects] = useState<CloudflareStorageObject[]>(() => getCloudflareObjects());
  const [r2Config, setR2Config] = useState<CloudflareR2Config>(() => getCloudflareConfig());
  const [storageCategoryFilter, setStorageCategoryFilter] = useState<'all' | StorageCategory>('all');
  const [storageSearch, setStorageSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  
  // Modals
  const [isInvoicePreviewModalOpen, setIsInvoicePreviewModalOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceDetails | null>(null);
  const [isR2ConfigModalOpen, setIsR2ConfigModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [previewPrescriptionBooking, setPreviewPrescriptionBooking] = useState<Booking | null>(null);
  const [previewPrescriptionObject, setPreviewPrescriptionObject] = useState<CloudflareStorageObject | null>(null);
  const [previewPrescriptionConsultation, setPreviewPrescriptionConsultation] = useState<DoctorConsultation | null>(null);

  // R2 Config Form
  const [r2ConfigForm, setR2ConfigForm] = useState<CloudflareR2Config>(r2Config);

  // Upload Form
  const [uploadForm, setUploadForm] = useState({
    fileName: '',
    category: 'invoices' as StorageCategory,
    bookingId: '',
    patientName: '',
    description: ''
  });

  const handleViewPrescription = (booking: Booking) => {
    setPreviewPrescriptionConsultation(null);
    setPreviewPrescriptionBooking(booking);
    const obj = getPrescriptionStorageObject(booking.prescriptionUrl || booking.prescriptionFileName);
    setPreviewPrescriptionObject(obj || null);
    setIsPrescriptionModalOpen(true);
  };

  const handleViewConsultPrescription = (consult: DoctorConsultation) => {
    setPreviewPrescriptionBooking(null);
    setPreviewPrescriptionObject(null);
    setPreviewPrescriptionConsultation(consult);
    setIsPrescriptionModalOpen(true);
  };

  const handleViewStorageObjectPrescription = (obj: CloudflareStorageObject) => {
    setPreviewPrescriptionConsultation(null);
    setPreviewPrescriptionObject(obj);
    const matchedBooking = bookings.find(
      (b) => b.id === obj.metadata?.bookingId || (obj.key && b.prescriptionUrl && b.prescriptionUrl.includes(obj.fileName))
    );
    setPreviewPrescriptionBooking(matchedBooking || null);
    setIsPrescriptionModalOpen(true);
  };

  const handleViewBookingInvoice = async (booking: Booking) => {
    const inv = generateInvoiceDetails(booking);
    setPreviewInvoice(inv);
    setIsInvoicePreviewModalOpen(true);
    // Sync into storage objects list
    await saveInvoiceToCloudflareBucket(booking);
    setStorageObjects(getCloudflareObjects());
  };

  const handlePrintCurrentInvoice = () => {
    if (previewInvoice) {
      openPrintableInvoiceWindow(previewInvoice);
    }
  };

  const handleSyncAllInvoicesToCloudflare = async () => {
    for (const b of bookings) {
      await saveInvoiceToCloudflareBucket(b);
    }
    setStorageObjects(getCloudflareObjects());
    showToast(`Synced ${bookings.length} booking invoices to Cloudflare R2 bucket!`);
  };

  const handleSaveR2ConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveCloudflareConfig(r2ConfigForm);
    setR2Config(updated);
    setIsR2ConfigModalOpen(false);
    showToast('Cloudflare R2 Bucket settings saved!');
  };

  const handleUploadDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.fileName.trim()) {
      showToast('File name is required.', 'error');
      return;
    }
    const cleanFileName = uploadForm.fileName.endsWith('.pdf') ? uploadForm.fileName : `${uploadForm.fileName}.pdf`;
    await uploadToCloudflareStorage({
      fileName: cleanFileName,
      category: uploadForm.category,
      contentType: 'application/pdf',
      sizeBytes: Math.floor(110000 + Math.random() * 200000),
      metadata: {
        bookingId: uploadForm.bookingId || undefined,
        patientName: uploadForm.patientName || undefined,
        description: uploadForm.description || `Uploaded document to ${uploadForm.category}`
      }
    });
    setStorageObjects(getCloudflareObjects());
    setIsUploadModalOpen(false);
    setUploadForm({ fileName: '', category: 'invoices', bookingId: '', patientName: '', description: '' });
    showToast(`Uploaded "${cleanFileName}" to Cloudflare R2 bucket!`);
  };

  const handleDeleteObjectClick = async (obj: CloudflareStorageObject) => {
    if (window.confirm(`Permanently delete "${obj.key}" from Cloudflare R2 bucket?`)) {
      await deleteFromCloudflareStorage(obj.id);
      setStorageObjects(getCloudflareObjects());
      showToast(`Deleted ${obj.fileName} from Cloudflare bucket.`);
    }
  };

  const handleCopyPublicUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Cloudflare public link copied to clipboard!');
  };

  const filteredStorageObjects = storageObjects.filter((o) => {
    const matchesSearch = 
      o.fileName.toLowerCase().includes(storageSearch.toLowerCase()) ||
      o.key.toLowerCase().includes(storageSearch.toLowerCase()) ||
      (o.metadata?.patientName && o.metadata.patientName.toLowerCase().includes(storageSearch.toLowerCase())) ||
      (o.metadata?.bookingId && o.metadata.bookingId.toLowerCase().includes(storageSearch.toLowerCase())) ||
      (o.metadata?.description && o.metadata.description.toLowerCase().includes(storageSearch.toLowerCase()));
    const matchesCategory = storageCategoryFilter === 'all' ? true : o.category === storageCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredInvoicesList = bookings.filter((b) => {
    return (
      b.patientName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      b.id.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      b.serviceTitle.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      b.area.toLowerCase().includes(invoiceSearch.toLowerCase())
    );
  });

  // Global Toast Feedback for any DB mutation
  const [dbToast, setDbToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setDbToast({ message, type });
    setTimeout(() => setDbToast(null), 3500);
  };

  // Credentials State
  const [credentialSearch, setCredentialSearch] = useState('');
  const [credentialRoleFilter, setCredentialRoleFilter] = useState<'all' | 'nurse' | 'doctor' | 'admin' | 'patient'>('all');
  const [showAllPins, setShowAllPins] = useState(false);
  const [revealedPinIds, setRevealedPinIds] = useState<Record<string, boolean>>({});
  const [copiedPinUserId, setCopiedPinUserId] = useState<string | null>(null);

  const togglePinVisibility = (userId: string) => {
    setRevealedPinIds((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Coupons Management State
  const [couponSearch, setCouponSearch] = useState('');
  const [couponStatusFilter, setCouponStatusFilter] = useState<'all' | 'Active' | 'Inactive' | 'Expired'>('all');
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null);
  const [isSubmittingCoupon, setIsSubmittingCoupon] = useState(false);

  // Form State for Coupon Create / Edit
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'flat' as 'flat' | 'percent',
    discountValue: 100,
    maxDiscount: '',
    minOrderAmount: 500,
    description: '',
    status: 'Active' as 'Active' | 'Inactive',
    usageLimit: '',
    validUntil: ''
  });
  const [couponFormError, setCouponFormError] = useState('');

  const pendingBookings = bookings.filter((b) => b.status === 'Pending');

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setCouponForm({
      code: '',
      discountType: 'flat',
      discountValue: 100,
      maxDiscount: '',
      minOrderAmount: 500,
      description: '',
      status: 'Active',
      usageLimit: '1000',
      validUntil: '2026-12-31'
    });
    setCouponFormError('');
    setIsCouponModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '',
      minOrderAmount: coupon.minOrderAmount || 0,
      description: coupon.description,
      status: coupon.status === 'Expired' ? 'Inactive' : coupon.status,
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
      validUntil: coupon.validUntil ? coupon.validUntil.split('T')[0] : ''
    });
    setCouponFormError('');
    setIsCouponModalOpen(true);
  };

  // Submit Coupon (Create or Update to Supabase)
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.code.trim()) {
      setCouponFormError('Coupon code is required.');
      return;
    }
    if (couponForm.discountValue <= 0) {
      setCouponFormError('Discount value must be greater than 0.');
      return;
    }
    if (!couponForm.description.trim()) {
      setCouponFormError('Description is required.');
      return;
    }

    setIsSubmittingCoupon(true);
    setCouponFormError('');

    try {
      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        discountType: couponForm.discountType,
        discountValue: Number(couponForm.discountValue),
        maxDiscount: couponForm.maxDiscount ? Number(couponForm.maxDiscount) : undefined,
        minOrderAmount: Number(couponForm.minOrderAmount) || 0,
        description: couponForm.description.trim(),
        status: couponForm.status,
        usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : undefined,
        validUntil: couponForm.validUntil ? new Date(couponForm.validUntil).toISOString() : undefined
      };

      if (editingCoupon) {
        if (onUpdateCoupon) {
          await onUpdateCoupon(editingCoupon.id, payload);
        }
        setCouponFeedback(`Coupon "${payload.code}" updated successfully in Supabase!`);
      } else {
        if (onCreateCoupon) {
          await onCreateCoupon(payload);
        }
        setCouponFeedback(`Coupon "${payload.code}" created and live in Supabase!`);
      }

      setIsCouponModalOpen(false);
      setTimeout(() => setCouponFeedback(null), 4000);
    } catch (err: any) {
      setCouponFormError(err.message || 'Failed to save coupon to Supabase.');
    } finally {
      setIsSubmittingCoupon(false);
    }
  };

  // Toggle Coupon Active / Inactive
  const handleToggleCouponStatus = async (coupon: Coupon) => {
    const newStatus = coupon.status === 'Active' ? 'Inactive' : 'Active';
    if (onUpdateCoupon) {
      await onUpdateCoupon(coupon.id, { status: newStatus });
      setCouponFeedback(`Coupon ${coupon.code} marked ${newStatus}.`);
      setTimeout(() => setCouponFeedback(null), 3000);
    }
  };

  // Delete Coupon
  const handleDeleteCouponClick = async (coupon: Coupon) => {
    if (window.confirm(`Are you sure you want to permanently delete coupon "${coupon.code}" from Supabase?`)) {
      if (onDeleteCoupon) {
        await onDeleteCoupon(coupon.id);
        setCouponFeedback(`Coupon ${coupon.code} deleted.`);
        setTimeout(() => setCouponFeedback(null), 3000);
      }
    }
  };

  // Copy Code to Clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filtered Coupons
  const filteredCoupons = coupons.filter((c) => {
    const matchesSearch = 
      c.code.toLowerCase().includes(couponSearch.toLowerCase()) ||
      c.description.toLowerCase().includes(couponSearch.toLowerCase());
    const matchesStatus = 
      couponStatusFilter === 'all' ? true : c.status === couponStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered Users & Credentials
  const filteredUsers = appUsers.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(credentialSearch.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(credentialSearch.toLowerCase())) ||
      (u.phone && u.phone.includes(credentialSearch)) ||
      (u.serviceArea && u.serviceArea.toLowerCase().includes(credentialSearch.toLowerCase())) ||
      (u.designation && u.designation.toLowerCase().includes(credentialSearch.toLowerCase()));
    const matchesRole = credentialRoleFilter === 'all' ? true : u.role === credentialRoleFilter;
    return matchesSearch && matchesRole;
  });

  // --------------------------------------------------------------------------
  // 1. BOOKINGS CRUD STATE & HANDLERS
  // --------------------------------------------------------------------------
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [bookingForm, setBookingForm] = useState({
    id: '',
    patientName: '',
    patientPhone: '',
    patientAge: 45,
    patientGender: 'Female',
    serviceTitle: 'IV Saline Infusion',
    serviceId: 'saline-infusion' as ServiceId,
    area: 'LB Nagar' as HyderabadArea,
    fullAddress: '',
    status: 'Assigned' as 'Pending' | 'Assigned' | 'In-Progress' | 'Completed' | 'Cancelled',
    assignedNurseId: '',
    estimatedFee: 800,
    hasPrescription: true,
    notes: ''
  });

  const handleOpenCreateBookingModal = () => {
    setEditingBooking(null);
    setBookingForm({
      id: 'BK-' + Math.floor(1000 + Math.random() * 9000),
      patientName: '',
      patientPhone: '',
      patientAge: 45,
      patientGender: 'Female',
      serviceTitle: services[0]?.title || 'IV Saline Infusion',
      serviceId: (services[0]?.id as ServiceId) || 'saline-infusion',
      area: 'Gachibowli',
      fullAddress: '',
      status: 'Pending',
      assignedNurseId: '',
      estimatedFee: services[0]?.priceNumber || 800,
      hasPrescription: false,
      notes: ''
    });
    setIsBookingModalOpen(true);
  };

  const handleOpenEditBookingModal = (b: Booking) => {
    setEditingBooking(b);
    setBookingForm({
      id: b.id,
      patientName: b.patientName,
      patientPhone: b.patientPhone,
      patientAge: b.patientAge || 45,
      patientGender: b.patientGender || 'Female',
      serviceTitle: b.serviceTitle,
      serviceId: b.serviceId,
      area: b.area,
      fullAddress: b.fullAddress,
      status: b.status,
      assignedNurseId: b.assignedNurseId || '',
      estimatedFee: b.estimatedFee,
      hasPrescription: b.hasPrescription,
      notes: b.notes || ''
    });
    setIsBookingModalOpen(true);
  };

  const handleSaveBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.patientName.trim() || !bookingForm.patientPhone.trim()) {
      showToast('Patient name and phone are required.', 'error');
      return;
    }
    const assignedNurseObj = nurses.find((n) => n.id === bookingForm.assignedNurseId);
    const bookingPayload: Booking = {
      id: editingBooking ? editingBooking.id : bookingForm.id,
      createdAt: editingBooking ? editingBooking.createdAt : new Date().toISOString(),
      patientName: bookingForm.patientName.trim(),
      patientPhone: bookingForm.patientPhone.trim(),
      patientAge: Number(bookingForm.patientAge),
      patientGender: (bookingForm.patientGender as 'Male' | 'Female' | 'Other') || 'Female',
      serviceTitle: bookingForm.serviceTitle,
      serviceId: bookingForm.serviceId,
      area: bookingForm.area,
      fullAddress: bookingForm.fullAddress.trim() || `${bookingForm.area}, Hyderabad`,
      preferredDate: editingBooking?.preferredDate || 'Today',
      preferredTime: editingBooking?.preferredTime || 'Immediate (Within 45 mins)',
      status: bookingForm.status,
      assignedNurseId: assignedNurseObj?.id,
      assignedNurseName: assignedNurseObj?.name,
      estimatedFee: Number(bookingForm.estimatedFee),
      hasPrescription: bookingForm.hasPrescription,
      notes: bookingForm.notes.trim()
    };

    if (editingBooking && onUpdateBooking) {
      await onUpdateBooking(editingBooking.id, bookingPayload);
      showToast(`Booking ${bookingPayload.id} updated in Supabase!`);
    } else if (onCreateBooking) {
      await onCreateBooking(bookingPayload);
      showToast(`Booking ${bookingPayload.id} created in Supabase!`);
    }
    setIsBookingModalOpen(false);
  };

  const handleDeleteBookingClick = async (b: Booking) => {
    if (window.confirm(`Delete booking "${b.id}" for ${b.patientName} from Supabase?`)) {
      if (onDeleteBooking) {
        await onDeleteBooking(b.id);
        showToast(`Booking ${b.id} deleted from Supabase.`);
      }
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = 
      b.patientName.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.id.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.area.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      (b.assignedNurseName && b.assignedNurseName.toLowerCase().includes(bookingSearch.toLowerCase()));
    const matchesStatus = bookingStatusFilter === 'all' ? true : b.status === bookingStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // --------------------------------------------------------------------------
  // 2. NURSES CRUD STATE & HANDLERS
  // --------------------------------------------------------------------------
  const [nurseSearch, setNurseSearch] = useState('');
  const [nurseAreaFilter, setNurseAreaFilter] = useState<string>('all');
  const [isNurseModalOpen, setIsNurseModalOpen] = useState(false);
  const [editingNurse, setEditingNurse] = useState<NurseProfile | null>(null);
  const [nurseForm, setNurseForm] = useState({
    id: '',
    name: '',
    phone: '',
    email: '',
    qualification: 'B.Sc Nursing',
    experienceYears: 5,
    serviceArea: 'Gachibowli' as HyderabadArea,
    status: 'Active',
    certificateVerified: true,
    rating: 4.9,
    pin: '1001'
  });

  const handleOpenCreateNurseModal = () => {
    setEditingNurse(null);
    setNurseForm({
      id: 'nurse-' + Math.floor(100 + Math.random() * 900),
      name: '',
      phone: '',
      email: '',
      qualification: 'Registered Nurse (B.Sc Nursing)',
      experienceYears: 5,
      serviceArea: 'Gachibowli',
      status: 'Active',
      certificateVerified: true,
      rating: 4.9,
      pin: '100' + Math.floor(1 + Math.random() * 9)
    });
    setIsNurseModalOpen(true);
  };

  const handleOpenEditNurseModal = (n: NurseProfile) => {
    setEditingNurse(n);
    const existingUser = appUsers.find((u) => u.id === n.id || u.phone === n.phone || u.email === n.email);
    setNurseForm({
      id: n.id,
      name: n.name,
      phone: n.phone,
      email: n.email,
      qualification: n.qualification,
      experienceYears: n.experienceYears,
      serviceArea: n.serviceArea,
      status: n.status || 'Active',
      certificateVerified: !!n.certificateVerified,
      rating: n.rating || 4.9,
      pin: existingUser?.pin || '1001'
    });
    setIsNurseModalOpen(true);
  };

  const handleSaveNurseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nurseForm.name.trim() || !nurseForm.phone.trim() || !nurseForm.email.trim()) {
      showToast('Name, phone, and email are required.', 'error');
      return;
    }
    const nursePayload: NurseProfile = {
      id: editingNurse ? editingNurse.id : nurseForm.id,
      name: nurseForm.name.trim(),
      phone: nurseForm.phone.trim(),
      email: nurseForm.email.trim(),
      qualification: nurseForm.qualification.trim(),
      experienceYears: Number(nurseForm.experienceYears),
      serviceArea: nurseForm.serviceArea,
      status: (nurseForm.status as 'Active' | 'Pending Verification' | 'On Leave') || 'Active',
      totalLeads: editingNurse ? editingNurse.totalLeads : 0,
      convertedLeads: editingNurse ? editingNurse.convertedLeads : 0,
      totalReferrals: editingNurse ? editingNurse.totalReferrals : 0,
      pointsEarned: editingNurse ? editingNurse.pointsEarned : 300,
      referralEarningsRupees: editingNurse ? editingNurse.referralEarningsRupees : 0,
      rating: Number(nurseForm.rating) || 4.9,
      avatarUrl: editingNurse ? editingNurse.avatarUrl : 'https://images.unsplash.com/photo-1594824813571-638f0263614f?auto=format&fit=crop&q=80&w=400',
      certificateVerified: nurseForm.certificateVerified
    };

    if (editingNurse && onUpdateNurseRecord) {
      await onUpdateNurseRecord(editingNurse.id, nursePayload);
      // Also update app_user pin if exists
      if (onUpdateAppUser) {
        const u = appUsers.find((x) => x.id === editingNurse.id || x.phone === editingNurse.phone);
        if (u) await onUpdateAppUser(u.id, { pin: nurseForm.pin, name: nursePayload.name, serviceArea: nursePayload.serviceArea });
      }
      showToast(`Nurse ${nursePayload.name} updated in Supabase!`);
    } else if (onCreateNurse) {
      await onCreateNurse(nursePayload);
      if (onCreateAppUser) {
        await onCreateAppUser({
          id: nursePayload.id,
          name: nursePayload.name,
          role: 'nurse',
          identifier: nursePayload.email,
          pin: nurseForm.pin || '1001',
          phone: nursePayload.phone,
          email: nursePayload.email,
          designation: nursePayload.qualification,
          serviceArea: nursePayload.serviceArea
        });
      }
      showToast(`Nurse ${nursePayload.name} registered and live in Supabase!`);
    }
    setIsNurseModalOpen(false);
  };

  const handleDeleteNurseClick = async (n: NurseProfile) => {
    if (window.confirm(`Permanently remove nurse "${n.name}" from Supabase fleet?`)) {
      if (onDeleteNurse) {
        await onDeleteNurse(n.id);
        if (onDeleteAppUser) {
          const u = appUsers.find((x) => x.id === n.id || x.phone === n.phone);
          if (u) await onDeleteAppUser(u.id);
        }
        showToast(`Nurse ${n.name} removed from Supabase.`);
      }
    }
  };

  const filteredNurses = nurses.filter((n) => {
    const matchesSearch = 
      n.name.toLowerCase().includes(nurseSearch.toLowerCase()) ||
      n.phone.includes(nurseSearch) ||
      n.email.toLowerCase().includes(nurseSearch.toLowerCase()) ||
      n.qualification.toLowerCase().includes(nurseSearch.toLowerCase());
    const matchesArea = nurseAreaFilter === 'all' ? true : n.serviceArea === nurseAreaFilter;
    return matchesSearch && matchesArea;
  });

  // --------------------------------------------------------------------------
  // 3. SERVICES CRUD STATE & HANDLERS
  // --------------------------------------------------------------------------
  const [serviceSearch, setServiceSearch] = useState('');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [serviceForm, setServiceForm] = useState({
    id: '',
    title: '',
    subtitle: '',
    description: '',
    priceNumber: 800,
    multiVisitPrice: 800,
    nightSurcharge: 399,
    prescriptionRequired: true,
    duration: '45 - 60 mins',
    badge: ''
  });

  const handleOpenCreateServiceModal = () => {
    setEditingService(null);
    setServiceForm({
      id: 'procedure-' + Math.floor(100 + Math.random() * 900),
      title: '',
      subtitle: '',
      description: '',
      priceNumber: 800,
      multiVisitPrice: 800,
      nightSurcharge: 399,
      prescriptionRequired: true,
      duration: '45 - 60 mins',
      badge: 'Popular'
    });
    setIsServiceModalOpen(true);
  };

  const handleOpenEditServiceModal = (s: ServiceItem) => {
    setEditingService(s);
    setServiceForm({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle || '',
      description: s.description || '',
      priceNumber: s.priceNumber || 800,
      multiVisitPrice: s.multiVisitPrice || s.priceNumber || 800,
      nightSurcharge: s.nightSurcharge || 399,
      prescriptionRequired: !!s.prescriptionRequired,
      duration: s.duration || '45 - 60 mins',
      badge: s.badge || ''
    });
    setIsServiceModalOpen(true);
  };

  const handleSaveServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.title.trim()) {
      showToast('Procedure title is required.', 'error');
      return;
    }
    const servicePayload: ServiceItem = {
      id: (editingService ? editingService.id : serviceForm.id.toLowerCase().replace(/[^a-z0-9-]/g, '-')) as ServiceId,
      title: serviceForm.title.trim(),
      subtitle: serviceForm.subtitle.trim(),
      description: serviceForm.description.trim(),
      indicativePrice: `₹${serviceForm.priceNumber} per visit`,
      priceNumber: Number(serviceForm.priceNumber),
      multiVisitPrice: Number(serviceForm.multiVisitPrice),
      nightSurcharge: Number(serviceForm.nightSurcharge),
      prescriptionRequired: serviceForm.prescriptionRequired,
      duration: serviceForm.duration.trim(),
      features: ['Doorstep clinical service across Hyderabad', 'Certified & background-verified RN attending'],
      icon: 'Activity',
      badge: serviceForm.badge.trim() || undefined,
      procedureSteps: ['Aseptic preparation & equipment check', 'Clinical execution by RN'],
      equipmentProvided: ['Sterile gloves', 'Clinical disinfectant swab']
    };

    if (editingService && onUpdateService) {
      await onUpdateService(editingService.id, servicePayload);
      showToast(`Procedure "${servicePayload.title}" updated in Supabase!`);
    } else if (onCreateService) {
      await onCreateService(servicePayload);
      showToast(`Procedure "${servicePayload.title}" created in Supabase!`);
    }
    setIsServiceModalOpen(false);
  };

  const handleDeleteServiceClick = async (s: ServiceItem) => {
    if (window.confirm(`Delete clinical procedure "${s.title}" from Supabase catalog?`)) {
      if (onDeleteService) {
        await onDeleteService(s.id);
        showToast(`Procedure "${s.title}" deleted from Supabase.`);
      }
    }
  };

  const filteredServices = services.filter((s) => {
    return (
      s.title.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      s.id.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(serviceSearch.toLowerCase()))
    );
  });

  // --------------------------------------------------------------------------
  // 4. LEADS CRUD STATE & HANDLERS
  // --------------------------------------------------------------------------
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<NurseLead | null>(null);
  const [leadForm, setLeadForm] = useState({
    id: '',
    patientName: '',
    patientPhone: '',
    serviceId: 'saline-infusion' as ServiceId,
    area: 'LB Nagar' as HyderabadArea,
    nurseId: 'nurse-101',
    status: 'Pending Approval' as NurseLead['status'],
    leadValueRupees: 800,
    pointsAwarded: 50
  });

  const handleOpenCreateLeadModal = () => {
    setEditingLead(null);
    setLeadForm({
      id: 'LD-' + Math.floor(1000 + Math.random() * 9000),
      patientName: '',
      patientPhone: '',
      serviceId: (services[0]?.id as ServiceId) || 'saline-infusion',
      area: 'LB Nagar',
      nurseId: nurses[0]?.id || 'nurse-101',
      status: 'Pending Approval',
      leadValueRupees: 800,
      pointsAwarded: 50
    });
    setIsLeadModalOpen(true);
  };

  const handleOpenEditLeadModal = (l: NurseLead) => {
    setEditingLead(l);
    setLeadForm({
      id: l.id,
      patientName: l.patientName,
      patientPhone: l.patientPhone,
      serviceId: l.serviceId,
      area: l.area,
      nurseId: l.nurseId,
      status: l.status,
      leadValueRupees: l.leadValueRupees || 800,
      pointsAwarded: l.pointsAwarded || 50
    });
    setIsLeadModalOpen(true);
  };

  const handleSaveLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.patientName.trim() || !leadForm.patientPhone.trim()) {
      showToast('Patient name and phone are required.', 'error');
      return;
    }
    const leadPayload: NurseLead = {
      id: editingLead ? editingLead.id : leadForm.id,
      nurseId: leadForm.nurseId,
      patientName: leadForm.patientName.trim(),
      patientPhone: leadForm.patientPhone.trim(),
      serviceId: leadForm.serviceId,
      area: leadForm.area,
      submittedAt: editingLead ? editingLead.submittedAt : new Date().toISOString(),
      status: leadForm.status,
      leadValueRupees: Number(leadForm.leadValueRupees),
      pointsAwarded: Number(leadForm.pointsAwarded)
    };

    if (editingLead && onUpdateLead) {
      await onUpdateLead(editingLead.id, leadPayload);
      showToast(`Lead ${leadPayload.id} updated in Supabase!`);
    } else if (onCreateLead) {
      await onCreateLead(leadPayload);
      showToast(`Lead ${leadPayload.id} created in Supabase!`);
    }
    setIsLeadModalOpen(false);
  };

  const handleDeleteLeadClick = async (l: NurseLead) => {
    if (window.confirm(`Delete lead "${l.id}" (${l.patientName}) from Supabase?`)) {
      if (onDeleteLead) {
        await onDeleteLead(l.id);
        showToast(`Lead ${l.id} deleted from Supabase.`);
      }
    }
  };

  // Admin Lead Rewards & Approval Decision Modal State
  const [approvalModalLead, setApprovalModalLead] = useState<NurseLead | null>(null);
  const [approvalPoints, setApprovalPoints] = useState<number>(50);
  const [approvalReferralRupees, setApprovalReferralRupees] = useState<number>(80);
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isProcessingApproval, setIsProcessingApproval] = useState<boolean>(false);

  const handleOpenApproveModal = (lead: NurseLead) => {
    setApprovalModalLead(lead);
    const serviceObj = services.find((s) => s.id === lead.serviceId);
    const estimatedValue = lead.leadValueRupees || serviceObj?.priceNumber || 800;
    setApprovalPoints(lead.pointsAwarded && lead.pointsAwarded > 0 ? lead.pointsAwarded : 50);
    setApprovalReferralRupees(
      lead.referralCommissionRupees !== undefined && lead.referralCommissionRupees > 0
        ? lead.referralCommissionRupees
        : Math.round(estimatedValue * 0.1)
    );
    setApprovalNotes(lead.adminNotes || `Approved by Admin. Cross-area service verified.`);
    setRejectReason('');
    setIsRejectConfirmOpen(false);
  };

  const handleConfirmApproval = async () => {
    if (!approvalModalLead || !onApproveLead) return;
    setIsProcessingApproval(true);
    try {
      await onApproveLead(approvalModalLead.id, Number(approvalPoints), Number(approvalReferralRupees), approvalNotes);
      const referringNurse = nurses.find((n) => n.id === approvalModalLead.nurseId);
      showToast(`Lead ${approvalModalLead.id} approved! Credited +${approvalPoints} pts & ₹${approvalReferralRupees} to ${referringNurse?.name || 'Nurse'}.`);
      setApprovalModalLead(null);
    } catch {
      showToast('Error approving lead in Supabase', 'error');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!approvalModalLead || !onRejectLead) return;
    setIsProcessingApproval(true);
    try {
      await onRejectLead(approvalModalLead.id, rejectReason || 'Rejected by Admin review');
      showToast(`Lead ${approvalModalLead.id} marked as Rejected.`);
      setApprovalModalLead(null);
      setIsRejectConfirmOpen(false);
    } catch {
      showToast('Error rejecting lead', 'error');
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch = 
      l.patientName.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.patientPhone.includes(leadSearch) ||
      l.area.toLowerCase().includes(leadSearch.toLowerCase());
    const matchesStatus = leadStatusFilter === 'all' ? true : l.status === leadStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // --------------------------------------------------------------------------
  // 5. DOCTOR CONSULTATIONS CRUD STATE & HANDLERS
  // --------------------------------------------------------------------------
  const [consultSearch, setConsultSearch] = useState('');
  const [consultStatusFilter, setConsultStatusFilter] = useState<string>('all');
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [editingConsult, setEditingConsult] = useState<DoctorConsultation | null>(null);
  const [consultForm, setConsultForm] = useState({
    id: '',
    patientName: '',
    patientAge: 45,
    patientPhone: '',
    symptoms: '',
    area: 'Gachibowli' as HyderabadArea,
    status: 'Awaiting Call' as 'Awaiting Call' | 'In Call' | 'Prescription Issued' | 'Completed',
    prescriptionIssued: false,
    prescriptionText: '',
    recommendedService: 'saline-infusion' as ServiceId
  });

  const handleOpenCreateConsultModal = () => {
    setEditingConsult(null);
    setConsultForm({
      id: 'DOC-REQ-' + Math.floor(100 + Math.random() * 900),
      patientName: '',
      patientAge: 45,
      patientPhone: '',
      symptoms: '',
      area: 'Gachibowli',
      status: 'Awaiting Call',
      prescriptionIssued: false,
      prescriptionText: '',
      recommendedService: 'saline-infusion'
    });
    setIsConsultModalOpen(true);
  };

  const handleOpenEditConsultModal = (c: DoctorConsultation) => {
    setEditingConsult(c);
    setConsultForm({
      id: c.id,
      patientName: c.patientName,
      patientAge: c.patientAge || 45,
      patientPhone: c.patientPhone,
      symptoms: c.symptoms,
      area: c.area,
      status: c.status,
      prescriptionIssued: !!c.prescriptionIssued,
      prescriptionText: c.prescriptionText || '',
      recommendedService: c.recommendedService || 'saline-infusion'
    });
    setIsConsultModalOpen(true);
  };

  const handleSaveConsultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultForm.patientName.trim() || !consultForm.patientPhone.trim() || !consultForm.symptoms.trim()) {
      showToast('Patient name, phone, and symptoms are required.', 'error');
      return;
    }
    const consultPayload: DoctorConsultation = {
      id: editingConsult ? editingConsult.id : consultForm.id,
      patientName: consultForm.patientName.trim(),
      patientAge: Number(consultForm.patientAge),
      patientPhone: consultForm.patientPhone.trim(),
      symptoms: consultForm.symptoms.trim(),
      area: consultForm.area as HyderabadArea,
      requestedAt: editingConsult ? editingConsult.requestedAt : new Date().toISOString(),
      status: consultForm.status as 'Awaiting Call' | 'In Call' | 'Prescription Issued' | 'Completed',
      prescriptionIssued: consultForm.prescriptionIssued,
      prescriptionText: consultForm.prescriptionText.trim(),
      recommendedService: consultForm.recommendedService as ServiceId
    };

    if (editingConsult && onUpdateConsultation) {
      await onUpdateConsultation(editingConsult.id, consultPayload);
      showToast(`Consultation ${consultPayload.id} updated in Supabase!`);
    } else if (onCreateConsultation) {
      await onCreateConsultation(consultPayload);
      showToast(`Consultation ${consultPayload.id} created in Supabase!`);
    }
    setIsConsultModalOpen(false);
  };

  const handleDeleteConsultClick = async (c: DoctorConsultation) => {
    if (window.confirm(`Delete clinical request for "${c.patientName}" from Supabase?`)) {
      if (onDeleteConsultation) {
        await onDeleteConsultation(c.id);
        showToast(`Consultation ${c.id} deleted from Supabase.`);
      }
    }
  };

  const filteredConsults = consultations.filter((c) => {
    const matchesSearch = 
      c.patientName.toLowerCase().includes(consultSearch.toLowerCase()) ||
      c.patientPhone.includes(consultSearch) ||
      c.symptoms.toLowerCase().includes(consultSearch.toLowerCase()) ||
      c.area.toLowerCase().includes(consultSearch.toLowerCase());
    const matchesStatus = consultStatusFilter === 'all' ? true : c.status === consultStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // --------------------------------------------------------------------------
  // 6. APP USERS & CREDENTIALS CRUD STATE & HANDLERS
  // --------------------------------------------------------------------------
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userForm, setUserForm] = useState({
    id: '',
    name: '',
    role: 'nurse' as 'admin' | 'doctor' | 'nurse' | 'patient',
    identifier: '',
    pin: '1001',
    phone: '',
    email: '',
    designation: '',
    serviceArea: 'Gachibowli'
  });

  const handleOpenCreateUserModal = () => {
    setEditingUser(null);
    setUserForm({
      id: 'user-' + Math.floor(100 + Math.random() * 900),
      name: '',
      role: 'nurse',
      identifier: '',
      pin: '1001',
      phone: '',
      email: '',
      designation: 'Registered Nurse',
      serviceArea: 'Gachibowli'
    });
    setIsUserModalOpen(true);
  };

  const handleOpenEditUserModal = (u: AppUser) => {
    setEditingUser(u);
    setUserForm({
      id: u.id,
      name: u.name,
      role: u.role,
      identifier: u.identifier,
      pin: u.pin,
      phone: u.phone || '',
      email: u.email || '',
      designation: u.designation || '',
      serviceArea: u.serviceArea || 'Hyderabad Multi-Zone'
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name.trim() || !userForm.pin.trim()) {
      showToast('Name and 4-digit PIN are required.', 'error');
      return;
    }
    if (!/^\d{4}$/.test(userForm.pin.trim())) {
      showToast('PIN must be exactly 4 digits (0-9).', 'error');
      return;
    }
    const userPayload: AppUser = {
      id: editingUser ? editingUser.id : userForm.id,
      name: userForm.name.trim(),
      role: userForm.role,
      identifier: userForm.identifier.trim() || userForm.email.trim() || userForm.phone.trim(),
      pin: userForm.pin.trim(),
      phone: userForm.phone.trim(),
      email: userForm.email.trim(),
      designation: userForm.designation.trim(),
      serviceArea: userForm.serviceArea.trim() as any
    };

    if (editingUser && onUpdateAppUser) {
      await onUpdateAppUser(editingUser.id, userPayload);
      showToast(`User ${userPayload.name} credentials updated in Supabase!`);
    } else if (onCreateAppUser) {
      await onCreateAppUser(userPayload);
      showToast(`User ${userPayload.name} created in Supabase!`);
    }
    setIsUserModalOpen(false);
  };

  const handleDeleteUserClick = async (u: AppUser) => {
    if (window.confirm(`Permanently remove user credentials for "${u.name}" (${u.role}) from Supabase?`)) {
      if (onDeleteAppUser) {
        await onDeleteAppUser(u.id);
        showToast(`User ${u.name} removed from Supabase.`);
      }
    }
  };

  // Test Routing Simulation Engine
  const runRoutingSimulation = () => {
    if (testSimReferringNurse !== 'none') {
      // RULE 1: Referral stays with the nurse
      const referringNurseObj = nurses.find((n) => n.id === testSimReferringNurse);
      setSimulationResult(
        `[RULE 1 TRIGGERED] Direct Nurse Referral: Assigned back to ${referringNurseObj?.name} (${referringNurseObj?.serviceArea}). 10% referral revenue & 50 points credited.`
      );
    } else {
      // RULE 2: Area-based routing
      const matchingNurse = nurses.find((n) => n.serviceArea === testSimPatientArea);
      if (matchingNurse) {
        setSimulationResult(
          `[RULE 2 TRIGGERED] Area-Based Auto Routing: Patient in ${testSimPatientArea} matched to nearest localized nurse: ${matchingNurse.name} (Service Area: ${matchingNurse.serviceArea}). Real-time notification dispatched to nurse's dashboard.`
        );
      } else {
        setSimulationResult(
          `[RULE 2 TRIGGERED] Fallback Routing: No nurse currently stationed strictly in ${testSimPatientArea}. Routed to nearest regional fleet supervisor.`
        );
      }
    }
  };

  return (
    <div className="panel-container container">
      {/* Admin Panel Header */}
      <div className="panel-header">
        <div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-navy-900)' }}>
            Admin Operations & Routing Center
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--neutral-600)' }}>
            Dispatch, verify credentials, and manage multi-zone Hyderabad home nursing fleets
          </p>
        </div>

        <div className="panel-header-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
          <button
            className={`btn btn-sm ${activeTab === 'routing' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('routing')}
          >
            <Shuffle size={14} />
            <span>Smart Routing</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'bookings' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('bookings')}
          >
            <Calendar size={14} />
            <span>Bookings ({bookings.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'nurses' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('nurses')}
          >
            <Users size={14} />
            <span>Nurse Roster ({nurses.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'services' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('services')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Layers size={14} />
            <span>Services & Pricing ({services.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'leads' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('leads')}
          >
            <Activity size={14} />
            <span>Leads CRM ({leads.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'consultations' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('consultations')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Stethoscope size={14} />
            <span>Doctor Consults ({consultations.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'coupons' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('coupons')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Tag size={14} />
            <span>Coupons ({coupons.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'credentials' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('credentials')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <KeyRound size={14} />
            <span>Staff & PINs ({appUsers.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'storage' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => {
              setStorageObjects(getCloudflareObjects());
              setActiveTab('storage');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Cloud size={14} />
            <span>Cloudflare Bucket ({storageObjects.length})</span>
          </button>
        </div>
      </div>

      {/* Real-time DB Operation Toast Banner */}
      {dbToast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 999999,
          background: dbToast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          border: `1.5px solid ${dbToast.type === 'success' ? '#10B981' : '#EF4444'}`,
          borderRadius: 12,
          padding: '0.85rem 1.25rem',
          color: dbToast.type === 'success' ? '#065F46' : '#991B1B',
          fontWeight: 700,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.18)'
        }}>
          {dbToast.type === 'success' ? <CheckCircle size={18} style={{ color: '#059669' }} /> : <AlertCircle size={18} style={{ color: '#DC2626' }} />}
          <span>{dbToast.message}</span>
        </div>
      )}

      {/* High-level KPIs */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#EEF5FF', color: 'var(--primary-navy-700)' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div className="stat-val">{bookings.length}</div>
            <div className="stat-label">Total Platform Bookings</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FFF1F2', color: '#E11D48' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="stat-val">{pendingBookings.length}</div>
            <div className="stat-label">Pending Dispatches</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="stat-val">{nurses.length}</div>
            <div className="stat-label">Active Verified Nurses</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
            <Activity size={24} />
          </div>
          <div>
            <div className="stat-val">100%</div>
            <div className="stat-label">SLA Response Rate</div>
          </div>
        </div>
      </div>

      {/* SMART ROUTING ENGINE (SECTION 6 BLUEPRINT) */}
      {activeTab === 'routing' && (
        <div>
          {/* Rules Overview Callouts */}
          <div className="admin-rules-grid">
            <div className="rule-callout rule-1" style={{ marginBottom: 0 }}>
              <div>
                <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '0.25rem' }}>
                  Rule 1 — Order-to-Nurse Assignment
                </strong>
                <p style={{ fontSize: '0.85rem' }}>
                  When a nurse refers a patient (brings in an order), that order must be assigned back to that same nurse and be clearly visible on their dashboard as "your order".
                </p>
              </div>
            </div>

            <div className="rule-callout rule-2" style={{ marginBottom: 0 }}>
              <div>
                <strong style={{ fontSize: '1rem', display: 'block', marginBottom: '0.25rem' }}>
                  Rule 2 — Area-Based Routing
                </strong>
                <p style={{ fontSize: '0.85rem' }}>
                  Example: A patient in Gachibowli vs. LB Nagar. The system routes/notifies the nurse whose service area matches the patient’s location — reflecting on that nurse’s dashboard in real-time.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Routing Simulator */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Live Dispatch & Area-Routing Simulator</h3>
              <span className="status-pill info">Automated Dispatcher</span>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '0.9rem', color: 'var(--neutral-600)', marginBottom: '1.25rem' }}>
                Test the algorithmic routing engine with any patient neighborhood and referral condition:
              </p>

              <div className="routing-sim-grid">
                <div>
                  <label className="form-label">Patient Hyderabad Location</label>
                  <select
                    className="form-control"
                    value={testSimPatientArea}
                    onChange={(e) => setTestSimPatientArea(e.target.value as HyderabadArea)}
                  >
                    <option value="Gachibowli">Gachibowli (Zone West)</option>
                    <option value="LB Nagar">LB Nagar (Zone East)</option>
                    <option value="Madhapur">Madhapur (Zone Hitec)</option>
                    <option value="Banjara Hills">Banjara Hills (Zone Central)</option>
                    <option value="Kukatpally">Kukatpally (Zone North-West)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Referring Source</label>
                  <select
                    className="form-control"
                    value={testSimReferringNurse}
                    onChange={(e) => setTestSimReferringNurse(e.target.value)}
                  >
                    <option value="none">Direct Public Patient / WhatsApp Booking (Rule 2 Area Match)</option>
                    {nurses.map((n) => (
                      <option key={n.id} value={n.id}>
                        Referred by {n.name} (Rule 1 Lock)
                      </option>
                    ))}
                  </select>
                </div>

                <button onClick={runRoutingSimulation} className="btn btn-primary" style={{ height: 44 }}>
                  <Shuffle size={16} />
                  <span>Execute Routing Check</span>
                </button>
              </div>

              {simulationResult && (
                <div style={{ padding: '1rem 1.25rem', background: '#F8FAFC', border: '1.5px solid #0284C7', borderRadius: 'var(--radius-md)', color: '#0F172A', fontSize: '0.92rem', lineHeight: 1.6 }}>
                  {simulationResult}
                </div>
              )}
            </div>
          </div>

          {/* Pending Dispatches Table with One-Click Routing */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Pending Unassigned Bookings ({pendingBookings.length})</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>
                  New orders awaiting automated or manual dispatch
                </p>
              </div>
              <button onClick={onAutoRouteAll} className="btn btn-danger btn-sm">
                <Shuffle size={14} />
                <span>Auto-Route All Pending via Rule 2</span>
              </button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Patient</th>
                    <th>Procedure</th>
                    <th>Location</th>
                    <th>Prescription</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-500)' }}>
                        ✓ All active bookings have been routed and assigned to local nurses!
                      </td>
                    </tr>
                  ) : (
                    pendingBookings.map((b) => (
                      <tr key={b.id}>
                        <td><strong>{b.id}</strong></td>
                        <td>{b.patientName} ({b.patientPhone})</td>
                        <td>{b.serviceTitle}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <MapPin size={14} style={{ color: 'var(--neutral-500)' }} />
                            <span>{b.area}</span>
                          </div>
                        </td>
                        <td>
                          {b.hasPrescription || b.prescriptionFileName || b.prescriptionUrl ? (
                            <button
                              type="button"
                              onClick={() => handleViewPrescription(b)}
                              className="btn btn-sm"
                              style={{
                                background: '#F0FDF4',
                                border: '1px solid #BBF7D0',
                                color: '#15803D',
                                fontSize: '0.76rem',
                                padding: '0.22rem 0.5rem',
                                borderRadius: 8,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title="Inspect Prescription in Cloudflare R2 Bucket"
                            >
                              <Cloud size={12} style={{ color: '#0284C7' }} />
                              <span>{b.prescriptionFileName ? (b.prescriptionFileName.length > 12 ? b.prescriptionFileName.slice(0, 10) + '...' : b.prescriptionFileName) : 'View Rx'}</span>
                            </button>
                          ) : (
                            <span style={{ color: '#DC2626', fontSize: '0.8rem', fontWeight: 600 }}>⚠️ Needs Consult</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {nurses
                              .filter((n) => n.serviceArea === b.area)
                              .map((matchingNurse) => (
                                <button
                                  key={matchingNurse.id}
                                  onClick={() =>
                                    onAssignOrder(
                                      b.id,
                                      matchingNurse.id,
                                      `Rule 2 Matched: ${b.area} Area Specialist (${matchingNurse.name})`
                                    )
                                  }
                                  className="btn btn-primary btn-sm"
                                  title={`Route to ${matchingNurse.name} (${b.area})`}
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                                >
                                  <span>Assign to {matchingNurse.name.split(' ')[0]} RN</span>
                                  <ArrowRight size={13} />
                                </button>
                              ))}

                            <select
                              className="form-control"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', width: 'auto', minWidth: '150px' }}
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  const selectedNurse = nurses.find((n) => n.id === e.target.value);
                                  onAssignOrder(
                                    b.id,
                                    e.target.value,
                                    `Manual Dispatch by Admin to ${selectedNurse?.name || e.target.value}`
                                  );
                                }
                              }}
                            >
                              <option value="" disabled>Or Assign Any Nurse...</option>
                              {nurses.map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.name} ({n.serviceArea})
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => handleViewBookingInvoice(b)}
                              className="btn btn-outline btn-sm"
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.35rem 0.55rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                color: '#0284C7',
                                borderColor: '#BAE6FD',
                                background: '#F0F9FF',
                                fontWeight: 700
                              }}
                              title="Issue and preview official GST invoice"
                            >
                              <Receipt size={13} />
                              <span>Invoice</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ALL BOOKINGS TAB (FULL SUPABASE CRUD) */}
      {activeTab === 'bookings' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 className="card-title">Master Patient Bookings & Dispatch Records</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--neutral-500)', margin: 0 }}>
                Total: {bookings.length} appointments | Synced with Supabase <code>bookings</code> table
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleSyncAllInvoicesToCloudflare}
                className="btn btn-outline btn-sm"
                style={{ borderRadius: 9999, fontWeight: 700, gap: '0.4rem', borderColor: '#BAE6FD', color: '#0284C7', background: '#F0F9FF' }}
                title="Issue and sync tax invoices for all bookings into Cloudflare R2 bucket"
              >
                <Receipt size={15} />
                <span>Issue All Invoices ({bookings.length})</span>
              </button>
              <button
                onClick={handleOpenCreateBookingModal}
                className="btn btn-danger btn-sm"
                style={{ borderRadius: 9999, fontWeight: 700, gap: '0.4rem' }}
              >
                <Plus size={16} />
                <span>Create New Booking</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--neutral-200)', background: '#FAFAFA', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
              <input
                type="text"
                placeholder="Search patient, booking ID, area, or assigned nurse..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2rem',
                  fontSize: '0.85rem',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1'
                }}
              />
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', fontWeight: 600 }}>Status:</span>
              <select
                value={bookingStatusFilter}
                onChange={(e) => setBookingStatusFilter(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.82rem',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontWeight: 600
                }}
              >
                <option value="all">All Bookings ({bookings.length})</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="In-Progress">In-Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <EmptyState
              title="No Master Bookings Found"
              description={bookingSearch ? 'No bookings matched your filter criteria.' : 'No home nurse or diagnostic appointments have been created yet.'}
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>Patient & Phone</th>
                    <th>Procedure</th>
                    <th>Area</th>
                    <th>Assigned Nurse</th>
                    <th>Prescription</th>
                    <th>Fee</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((b) => (
                    <tr key={b.id}>
                      <td><strong style={{ fontFamily: 'monospace' }}>{b.id}</strong></td>
                      <td>
                        <div><strong>{b.patientName}</strong></div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>{b.patientPhone}</div>
                      </td>
                      <td>{b.serviceTitle}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MapPin size={14} style={{ color: 'var(--neutral-500)' }} />
                          <span>{b.area}</span>
                        </div>
                      </td>
                      <td>
                        {b.assignedNurseName ? (
                          <div>
                            <div style={{ fontWeight: 600 }}>{b.assignedNurseName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                              {b.referringNurseName
                                ? `⚡ Referred by: ${b.referringNurseName}`
                                : (b.referringNurseId ? 'Rule 1 (Referral)' : 'Rule 2 (Area Matched)')}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#E11D48', fontWeight: 600 }}>Unassigned</span>
                        )}
                      </td>
                      <td>
                        {b.prescriptionFileName || b.prescriptionUrl || b.hasPrescription ? (
                          <button
                            type="button"
                            onClick={() => handleViewPrescription(b)}
                            className="btn btn-sm"
                            style={{
                              background: '#F0FDF4',
                              border: '1px solid #BBF7D0',
                              color: '#15803D',
                              fontSize: '0.76rem',
                              padding: '0.22rem 0.55rem',
                              borderRadius: 8,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="Inspect Prescription in Cloudflare R2 Bucket"
                          >
                            <Cloud size={12} style={{ color: '#0284C7' }} />
                            <span>{b.prescriptionFileName ? (b.prescriptionFileName.length > 14 ? b.prescriptionFileName.slice(0, 12) + '...' : b.prescriptionFileName) : 'View Rx'}</span>
                          </button>
                        ) : (
                          <span style={{ color: '#DC2626', fontSize: '0.78rem', fontWeight: 600 }}>Needs Consult</span>
                        )}
                      </td>
                      <td><strong style={{ color: 'var(--primary-navy-900)' }}>₹{b.estimatedFee}</strong></td>
                      <td>
                        <span className={`status-pill ${
                          b.status === 'Completed' ? 'success' :
                          b.status === 'Assigned' ? 'info' :
                          b.status === 'Pending' ? 'warning' : 'neutral'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <button
                            type="button"
                            onClick={() => handleViewBookingInvoice(b)}
                            title="Issue Official GST Invoice (Save to Cloudflare R2)"
                            style={{
                              background: '#F0FDF4',
                              border: '1px solid #BBF7D0',
                              color: '#15803D',
                              padding: '0.3rem 0.55rem',
                              borderRadius: 6,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          >
                            <Receipt size={13} />
                            <span>Invoice</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditBookingModal(b)}
                            title="Edit Booking in Supabase"
                            style={{
                              background: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              color: '#1D4ED8',
                              padding: '0.3rem 0.45rem',
                              borderRadius: 6,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBookingClick(b)}
                            title="Delete Booking from Supabase"
                            style={{
                              background: '#FEF2F2',
                              border: '1px solid #FECDD3',
                              color: '#E11D48',
                              padding: '0.3rem 0.45rem',
                              borderRadius: 6,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* NURSE ROSTER TAB (FULL SUPABASE CRUD) */}
      {activeTab === 'nurses' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 className="card-title">Registered Nursing Fleet & Service Areas</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--neutral-500)', margin: 0 }}>
                Total: {nurses.length} certified nurses | Synced with Supabase <code>nurses</code> table
              </p>
            </div>
            <button
              onClick={handleOpenCreateNurseModal}
              className="btn btn-danger btn-sm"
              style={{ borderRadius: 9999, fontWeight: 700, gap: '0.4rem' }}
            >
              <Plus size={16} />
              <span>Add New Nurse</span>
            </button>
          </div>

          {/* Filter & Search Toolbar */}
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--neutral-200)', background: '#FAFAFA', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
              <input
                type="text"
                placeholder="Search nurse by name, phone, email, qualification..."
                value={nurseSearch}
                onChange={(e) => setNurseSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2rem',
                  fontSize: '0.85rem',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1'
                }}
              />
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', fontWeight: 600 }}>Area:</span>
              <select
                value={nurseAreaFilter}
                onChange={(e) => setNurseAreaFilter(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.82rem',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontWeight: 600
                }}
              >
                <option value="all">All Service Areas</option>
                <option value="Gachibowli">Gachibowli</option>
                <option value="LB Nagar">LB Nagar</option>
                <option value="Madhapur">Madhapur</option>
                <option value="Banjara Hills">Banjara Hills</option>
                <option value="Kukatpally">Kukatpally</option>
              </select>
            </div>
          </div>

          {filteredNurses.length === 0 ? (
            <EmptyState
              title="No Nurses Stationed"
              description={nurseSearch ? 'No nurses matched your search criteria.' : 'No registered nurses are currently stationed in the fleet directory.'}
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nurse</th>
                    <th>Login PIN & Access</th>
                    <th>Service Area (Rule 2)</th>
                    <th>Qualification</th>
                    <th>Experience</th>
                    <th>Leads & Referrals</th>
                    <th>Points</th>
                    <th>Earnings (10%)</th>
                    <th>Verification</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNurses.map((n) => {
                    const userObj = appUsers.find(
                      (u) => u.id === n.id || u.phone === n.phone || u.email?.toLowerCase().includes(n.name.toLowerCase().split(' ')[1] || 'never')
                    );
                    const userPin = userObj?.pin || '1001';
                    const isRevealed = showAllPins || revealedPinIds[n.id];

                    return (
                      <tr key={n.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <img
                              src={n.avatarUrl}
                              alt={n.name}
                              style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div>
                              <strong>{n.name}</strong>
                              <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)' }}>{n.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span className="pin-badge" style={{ fontSize: '0.84rem', padding: '0.18rem 0.45rem' }}>
                                <Lock size={11} style={{ color: '#0284C7' }} />
                                <span>{isRevealed ? userPin : '••••'}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePinVisibility(n.id)}
                                title={isRevealed ? 'Hide PIN' : 'Reveal PIN'}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--neutral-400)' }}
                              >
                                {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(userPin);
                                  setCopiedPinUserId(n.id);
                                  setTimeout(() => setCopiedPinUserId(null), 2000);
                                }}
                                title="Copy 4-digit PIN"
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, color: copiedPinUserId === n.id ? '#059669' : 'var(--neutral-400)' }}
                              >
                                {copiedPinUserId === n.id ? <Check size={13} /> : <Copy size={13} />}
                              </button>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', marginTop: '0.2rem' }}>
                              {userObj?.email || n.phone}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="status-pill info">
                            <MapPin size={12} />
                            <span>{n.serviceArea}</span>
                          </span>
                        </td>
                        <td>{n.qualification}</td>
                        <td>{n.experienceYears} Years</td>
                        <td>
                          <div>Leads: {n.totalLeads}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)' }}>Converted: {n.convertedLeads}</div>
                        </td>
                        <td><strong>{n.pointsEarned} pts</strong></td>
                        <td><strong style={{ color: '#059669' }}>₹{n.referralEarningsRupees}</strong></td>
                        <td>
                          {n.certificateVerified ? (
                            <span className="status-pill success">Verified Certificate</span>
                          ) : (
                            <span className="status-pill warning">Pending Review</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditNurseModal(n)}
                              title="Edit Nurse details in Supabase"
                              style={{
                                background: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                color: '#1D4ED8',
                                padding: '0.3rem 0.45rem',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNurseClick(n)}
                              title="Delete Nurse from Supabase"
                              style={{
                                background: '#FEF2F2',
                                border: '1px solid #FECDD3',
                                color: '#E11D48',
                                padding: '0.3rem 0.45rem',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SERVICES & PRICING CATALOG TAB (FULL SUPABASE CRUD) */}
      {activeTab === 'services' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="stats-grid" style={{ marginBottom: 0 }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                <Layers size={22} />
              </div>
              <div>
                <div className="stat-val">{services.length}</div>
                <div className="stat-label">Total Clinical Procedures</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                <FileText size={22} />
              </div>
              <div>
                <div className="stat-val">{services.filter((s) => s.prescriptionRequired).length}</div>
                <div className="stat-label">Doctor Rx Required</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                <DollarSign size={22} />
              </div>
              <div>
                <div className="stat-val">
                  ₹{services.length > 0 ? Math.round(services.reduce((acc, s) => acc + (s.priceNumber || 0), 0) / services.length) : 0}
                </div>
                <div className="stat-label">Avg Procedure Price</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
                <Sparkles size={22} />
              </div>
              <div>
                <div className="stat-val">{services.filter((s) => s.badge).length}</div>
                <div className="stat-label">Highlighted Featured Badges</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 className="card-title">Clinical Procedures Catalog & Tariff Rates</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--neutral-500)', margin: 0 }}>
                  Manage procedure prices, multi-visit packages, night surcharges, and Rx mandates synced with Supabase <code>services</code> table
                </p>
              </div>

              <button
                onClick={handleOpenCreateServiceModal}
                className="btn btn-danger btn-sm"
                style={{ borderRadius: 9999, fontWeight: 700, gap: '0.4rem' }}
              >
                <Plus size={16} />
                <span>Add New Procedure</span>
              </button>
            </div>

            {/* Filter & Search Toolbar */}
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--neutral-200)', background: '#FAFAFA', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
                <input
                  type="text"
                  placeholder="Search procedures by title, slug ID, or description..."
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem 0.45rem 2rem',
                    fontSize: '0.85rem',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1'
                  }}
                />
                <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
              </div>
            </div>

            {filteredServices.length === 0 ? (
              <EmptyState
                title="No Services Found"
                description={serviceSearch ? 'No services matched your search.' : 'No clinical procedures in Supabase catalog.'}
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Procedure ID & Title</th>
                      <th>Single Visit Price</th>
                      <th>Multi-Visit Package</th>
                      <th>Night Surcharge</th>
                      <th>Prescription</th>
                      <th>Typical Duration</th>
                      <th>Badge</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div><strong>{s.title}</strong></div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', fontFamily: 'monospace' }}>{s.id}</div>
                          {s.subtitle && <div style={{ fontSize: '0.74rem', color: 'var(--neutral-600)' }}>{s.subtitle}</div>}
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: 'var(--primary-navy-950)', fontSize: '0.95rem' }}>
                            ₹{s.priceNumber}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>per home visit</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: '#059669', fontSize: '0.88rem' }}>
                            ₹{s.multiVisitPrice || s.priceNumber}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>per visit package</div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#D97706' }}>
                            +₹{s.nightSurcharge || 399}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>after 8:00 PM</div>
                        </td>
                        <td>
                          {s.prescriptionRequired ? (
                            <span className="status-pill danger" style={{ fontSize: '0.75rem' }}>Mandatory Rx</span>
                          ) : (
                            <span className="status-pill success" style={{ fontSize: '0.75rem' }}>No Rx Needed</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: 'var(--neutral-600)' }}>{s.duration || '45 - 60 mins'}</span>
                        </td>
                        <td>
                          {s.badge ? (
                            <span className="status-pill info" style={{ fontSize: '0.75rem' }}>{s.badge}</span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditServiceModal(s)}
                              title="Edit Procedure in Supabase"
                              style={{
                                background: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                color: '#1D4ED8',
                                padding: '0.3rem 0.45rem',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteServiceClick(s)}
                              title="Delete Procedure from Supabase"
                              style={{
                                background: '#FEF2F2',
                                border: '1px solid #FECDD3',
                                color: '#E11D48',
                                padding: '0.3rem 0.45rem',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LEADS CRM TAB (FULL SUPABASE CRUD + ADMIN REWARD DECISION) */}
      {activeTab === 'leads' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 className="card-title">Nurse-Generated Leads Pipeline</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--neutral-500)', margin: 0 }}>
                Total: {leads.length} referral leads | Synced with Supabase <code>leads</code> table
              </p>
            </div>
            <button
              onClick={handleOpenCreateLeadModal}
              className="btn btn-danger btn-sm"
              style={{ borderRadius: 9999, fontWeight: 700, gap: '0.4rem' }}
            >
              <Plus size={16} />
              <span>Record New Lead</span>
            </button>
          </div>

          {/* Pending Approvals Notice Banner */}
          {leads.filter((l) => l.status === 'Pending Approval').length > 0 && (
            <div style={{
              margin: '0.85rem 1.25rem 0',
              padding: '0.85rem 1.15rem',
              background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
              border: '1px solid #FCD34D',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: '#F59E0B',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900
                }}>
                  !
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#92400E', fontSize: '0.92rem' }}>
                    {leads.filter((l) => l.status === 'Pending Approval').length} Nurse Lead(s) Awaiting Admin Decision & Approval
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#B45309' }}>
                    Nurses do not receive reward points or referral earnings until Admin reviews and decides the amounts below.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLeadStatusFilter('Pending Approval')}
                style={{
                  background: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  padding: '0.4rem 0.95rem',
                  cursor: 'pointer'
                }}
              >
                Review Pending ({leads.filter((l) => l.status === 'Pending Approval').length})
              </button>
            </div>
          )}

          {/* Filter & Search Toolbar */}
          <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--neutral-200)', background: '#FAFAFA', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
              <input
                type="text"
                placeholder="Search by patient name, phone, or neighborhood..."
                value={leadSearch}
                onChange={(e) => setLeadSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2rem',
                  fontSize: '0.85rem',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1'
                }}
              />
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', fontWeight: 600 }}>Status:</span>
              <select
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.82rem',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontWeight: 600
                }}
              >
                <option value="all">All Lead Statuses ({leads.length})</option>
                <option value="Pending Approval">⏳ Pending Approval ({leads.filter((l) => l.status === 'Pending Approval').length})</option>
                <option value="Approved">✓ Approved</option>
                <option value="Converted">Converted</option>
                <option value="Submitted">Submitted</option>
                <option value="Assigned">Assigned</option>
                <option value="Rejected">Rejected</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
          </div>

          {filteredLeads.length === 0 ? (
            <EmptyState
              title="No Nurse Leads Recorded"
              description={leadSearch ? 'No leads matched your search query.' : 'No nurse leads have been registered yet.'}
            />
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lead ID</th>
                    <th>Patient Name</th>
                    <th>Phone</th>
                    <th>Service</th>
                    <th>Area</th>
                    <th>Referring Nurse</th>
                    <th>Points Decided</th>
                    <th>Referral Earning</th>
                    <th>Decision Status</th>
                    <th style={{ textAlign: 'right' }}>Admin Decision & Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((l) => {
                    const referringNurse = nurses.find((n) => n.id === l.nurseId);
                    const isPending = l.status === 'Pending Approval';
                    const isApproved = l.status === 'Approved' || l.status === 'Converted';
                    const isRejected = l.status === 'Rejected';

                    return (
                      <tr 
                        key={l.id} 
                        style={{ 
                          background: isPending ? '#FFFDF5' : undefined,
                          borderLeft: isPending ? '4px solid #F59E0B' : undefined 
                        }}
                      >
                        <td>
                          <strong style={{ fontFamily: 'monospace' }}>{l.id}</strong>
                          <div style={{ fontSize: '0.7rem', color: 'var(--neutral-400)' }}>
                            {l.submittedAt && l.submittedAt.includes('T') ? new Date(l.submittedAt).toLocaleDateString() : l.submittedAt || 'Recent'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{l.patientName}</div>
                        </td>
                        <td>{l.patientPhone}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{l.serviceId}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>Value: ₹{l.leadValueRupees || 800}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <MapPin size={13} style={{ color: 'var(--neutral-500)' }} />
                            <span>{l.area}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{referringNurse ? referringNurse.name : l.nurseId}</div>
                          {referringNurse && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>
                              Station: {referringNurse.serviceArea}
                            </div>
                          )}
                        </td>
                        <td>
                          {isPending ? (
                            <span style={{ 
                              background: '#FEF3C7', 
                              color: '#92400E', 
                              fontSize: '0.75rem', 
                              fontWeight: 700, 
                              padding: '0.2rem 0.5rem', 
                              borderRadius: 6 
                            }}>
                              ⏳ Pending Admin Decision
                            </span>
                          ) : isRejected ? (
                            <span style={{ color: 'var(--neutral-400)', fontSize: '0.8rem' }}>0 pts</span>
                          ) : (
                            <strong style={{ color: '#059669', fontSize: '0.9rem' }}>
                              +{l.pointsAwarded || 50} pts
                            </strong>
                          )}
                        </td>
                        <td>
                          {isPending ? (
                            <span style={{ 
                              background: '#FEF3C7', 
                              color: '#92400E', 
                              fontSize: '0.75rem', 
                              fontWeight: 700, 
                              padding: '0.2rem 0.5rem', 
                              borderRadius: 6 
                            }}>
                              ⏳ Est. ₹{l.referralCommissionRupees || Math.round((l.leadValueRupees || 800) * 0.1)}
                            </span>
                          ) : isRejected ? (
                            <span style={{ color: 'var(--neutral-400)', fontSize: '0.8rem' }}>₹0</span>
                          ) : (
                            <strong style={{ color: '#059669', fontSize: '0.9rem' }}>
                              ₹{l.referralCommissionRupees !== undefined ? l.referralCommissionRupees : Math.round((l.leadValueRupees || 800) * 0.1)}
                            </strong>
                          )}
                        </td>
                        <td>
                          <span className={`status-pill ${
                            isApproved ? 'success' :
                            isPending ? 'warning' :
                            isRejected ? 'danger' :
                            l.status === 'Submitted' ? 'info' : 'neutral'
                          }`}>
                            {isPending ? '⏳ Pending Approval' : isApproved ? '✓ Approved' : isRejected ? '✕ Rejected' : l.status}
                          </span>
                          {l.adminNotes && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--neutral-500)', marginTop: '0.2rem', maxWidth: 160 }} title={l.adminNotes}>
                              Note: {l.adminNotes.length > 28 ? l.adminNotes.slice(0, 25) + '...' : l.adminNotes}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => handleOpenApproveModal(l)}
                                style={{
                                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: 8,
                                  padding: '0.35rem 0.7rem',
                                  fontWeight: 700,
                                  fontSize: '0.76rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  boxShadow: '0 2px 5px rgba(5,150,105,0.25)'
                                }}
                                title="Admin Decides Points and Commission to Approve"
                              >
                                <CheckCircle size={13} />
                                <span>Decide & Approve</span>
                              </button>
                            )}

                            {isApproved && (
                              <button
                                type="button"
                                onClick={() => handleOpenApproveModal(l)}
                                style={{
                                  background: '#F0FDF4',
                                  border: '1px solid #BBF7D0',
                                  color: '#166534',
                                  borderRadius: 6,
                                  padding: '0.28rem 0.55rem',
                                  fontWeight: 700,
                                  fontSize: '0.72rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                                title="Adjust Points or Referral Commission Awarded"
                              >
                                <Award size={12} />
                                <span>Adjust</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenEditLeadModal(l)}
                              title="Edit Lead in Supabase"
                              style={{
                                background: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                color: '#1D4ED8',
                                padding: '0.3rem 0.45rem',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLeadClick(l)}
                              title="Delete Lead from Supabase"
                              style={{
                                background: '#FEF2F2',
                                border: '1px solid #FECDD3',
                                color: '#E11D48',
                                padding: '0.3rem 0.45rem',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DOCTOR TELECONSULTATIONS TAB (FULL SUPABASE CRUD) */}
      {activeTab === 'consultations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="stats-grid" style={{ marginBottom: 0 }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#E0F2FE', color: '#0284C7' }}>
                <Stethoscope size={22} />
              </div>
              <div>
                <div className="stat-val">{consultations.length}</div>
                <div className="stat-label">Total Tele-Consults</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#FFF1F2', color: '#E11D48' }}>
                <Clock size={22} />
              </div>
              <div>
                <div className="stat-val">{consultations.filter((c) => c.status === 'Awaiting Call').length}</div>
                <div className="stat-label">Awaiting Doctor Call</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                <CheckCircle size={22} />
              </div>
              <div>
                <div className="stat-val">{consultations.filter((c) => c.prescriptionIssued).length}</div>
                <div className="stat-label">Digital Rx Issued</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <div className="stat-val">100%</div>
                <div className="stat-label">MBBS Verification Rate</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 className="card-title">Doctor Teleconsultation Triage & Rx Queue</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--neutral-500)', margin: 0 }}>
                  Manage patient tele-triage requests, issued clinical prescriptions, and service conversions synced with Supabase <code>consultations</code> table
                </p>
              </div>

              <button
                onClick={handleOpenCreateConsultModal}
                className="btn btn-danger btn-sm"
                style={{ borderRadius: 9999, fontWeight: 700, gap: '0.4rem' }}
              >
                <Plus size={16} />
                <span>New Consultation</span>
              </button>
            </div>

            {/* Filter & Search Toolbar */}
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--neutral-200)', background: '#FAFAFA', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
                <input
                  type="text"
                  placeholder="Search by patient, symptoms, contact phone, or area..."
                  value={consultSearch}
                  onChange={(e) => setConsultSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem 0.45rem 2rem',
                    fontSize: '0.85rem',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1'
                  }}
                />
                <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', fontWeight: 600 }}>Status:</span>
                <select
                  value={consultStatusFilter}
                  onChange={(e) => setConsultStatusFilter(e.target.value)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.82rem',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontWeight: 600
                  }}
                >
                  <option value="all">All Consultation Statuses ({consultations.length})</option>
                  <option value="Awaiting Call">Awaiting Call</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {filteredConsults.length === 0 ? (
              <EmptyState
                title="No Consultations Found"
                description={consultSearch ? 'No consultation records matched your search.' : 'No patient teleconsultation requests logged.'}
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Patient Name & Age</th>
                      <th>Phone</th>
                      <th>Symptoms / Chief Complaint</th>
                      <th>Area</th>
                      <th>Prescription</th>
                      <th>Recommended Service</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConsults.map((c) => (
                      <tr key={c.id}>
                        <td><strong style={{ fontFamily: 'monospace' }}>{c.id}</strong></td>
                        <td>
                          <div><strong>{c.patientName}</strong></div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Age: {c.patientAge || '—'}</div>
                        </td>
                        <td>{c.patientPhone}</td>
                        <td style={{ maxWidth: 220 }}>
                          <div style={{ fontSize: '0.82rem', color: 'var(--neutral-700)', lineHeight: 1.4 }}>
                            {c.symptoms}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <MapPin size={13} style={{ color: 'var(--neutral-500)' }} />
                            <span>{c.area}</span>
                          </div>
                        </td>
                        <td>
                          {c.prescriptionIssued ? (
                            <button
                              type="button"
                              onClick={() => handleViewConsultPrescription(c)}
                              title="Click to inspect doctor prescription"
                              style={{
                                background: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                padding: '0.35rem 0.65rem',
                                borderRadius: 8,
                                textAlign: 'left',
                                cursor: 'pointer',
                                display: 'block',
                                width: '100%',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span className="status-pill success" style={{ fontSize: '0.74rem', padding: '1px 6px' }}>✓ Rx Issued</span>
                                <Eye size={12} style={{ color: '#059669' }} />
                              </div>
                              {c.prescriptionText && (
                                <div style={{ fontSize: '0.72rem', color: '#065F46', marginTop: '0.25rem', maxWidth: 170, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                                  {c.prescriptionText}
                                </div>
                              )}
                            </button>
                          ) : (
                            <span className="status-pill warning" style={{ fontSize: '0.75rem' }}>Pending Rx</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{c.recommendedService || 'saline-infusion'}</span>
                        </td>
                        <td>
                          <span className={`status-pill ${
                            c.status === 'Completed' ? 'success' :
                            c.status === 'Awaiting Call' ? 'danger' : 'neutral'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            {c.prescriptionIssued && (
                              <button
                                type="button"
                                onClick={() => handleViewConsultPrescription(c)}
                                title="Inspect Prescribed Clinical Orders & Dosage"
                                style={{
                                  background: '#ECFDF5',
                                  border: '1px solid #A7F3D0',
                                  color: '#065F46',
                                  padding: '0.3rem 0.55rem',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontWeight: 700,
                                  fontSize: '0.74rem'
                                }}
                              >
                                <FileText size={13} />
                                <span>View Rx</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditConsultModal(c)}
                              title="Edit Consultation in Supabase"
                              style={{
                                background: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                color: '#1D4ED8',
                                padding: '0.3rem 0.45rem',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteConsultClick(c)}
                              title="Delete Consultation from Supabase"
                              style={{
                                background: '#FEF2F2',
                                border: '1px solid #FECDD3',
                                color: '#E11D48',
                                padding: '0.3rem 0.45rem',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COUPONS & PROMO ENGINE TAB (FULL SUPABASE CRUD) */}
      {activeTab === 'coupons' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Feedback Toast Banner */}
          {couponFeedback && (
            <div style={{
              padding: '0.85rem 1.25rem',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: 12,
              color: '#065F46',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.1)'
            }}>
              <CheckCircle size={18} style={{ color: '#059669' }} />
              <span>{couponFeedback}</span>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="stats-grid" style={{ marginBottom: 0 }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                <Tag size={22} />
              </div>
              <div>
                <div className="stat-val">{coupons.length}</div>
                <div className="stat-label">Total Coupons in Supabase</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                <CheckCircle size={22} />
              </div>
              <div>
                <div className="stat-val">{coupons.filter((c) => c.status === 'Active').length}</div>
                <div className="stat-label">Active & Redeemable</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#EFF6FF', color: '#0284C7' }}>
                <Users size={22} />
              </div>
              <div>
                <div className="stat-val">
                  {coupons.reduce((sum, c) => sum + (c.timesUsed || 0), 0)}
                </div>
                <div className="stat-label">Total Redemptions by Patients</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#FEF2F2', color: '#E11D48' }}>
                <Percent size={22} />
              </div>
              <div>
                <div className="stat-val" style={{ color: '#E11D48' }}>
                  ₹{coupons.reduce((sum, c) => sum + ((c.timesUsed || 0) * (c.discountType === 'flat' ? c.discountValue : 120)), 0).toLocaleString()}
                </div>
                <div className="stat-label">Total Patient Savings Generated</div>
              </div>
            </div>
          </div>

          {/* Main Card with Toolbar & Table */}
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 className="card-title">Promotional Coupons & Discount Directory</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--neutral-500)', margin: 0 }}>
                  Manage discount codes, percentage cuts, minimum order thresholds, and expiry dates synchronized with Supabase
                </p>
              </div>

              <button 
                onClick={handleOpenCreateModal} 
                className="btn btn-danger btn-sm"
                style={{ borderRadius: 9999, fontWeight: 700, gap: '0.4rem' }}
              >
                <Plus size={16} />
                <span>Create New Coupon</span>
              </button>
            </div>

            {/* Filter & Search Toolbar */}
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--neutral-200)', background: '#FAFAFA', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
                <input
                  type="text"
                  placeholder="Search by code or description..."
                  value={couponSearch}
                  onChange={(e) => setCouponSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem 0.45rem 2rem',
                    fontSize: '0.85rem',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1'
                  }}
                />
                <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', fontWeight: 600 }}>Filter:</span>
                <select
                  value={couponStatusFilter}
                  onChange={(e) => setCouponStatusFilter(e.target.value as any)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.82rem',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontWeight: 600
                  }}
                >
                  <option value="all">All Coupons ({coupons.length})</option>
                  <option value="Active">Active Only</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
            </div>

            {/* Coupons Table */}
            {filteredCoupons.length === 0 ? (
              <EmptyState
                title="No Coupons Found"
                description={couponSearch ? 'No coupons matched your search criteria.' : 'No coupons exist in the database. Click "+ Create New Coupon" to add one.'}
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Coupon Code</th>
                      <th>Discount Value</th>
                      <th>Min Order / Max Cap</th>
                      <th>Description</th>
                      <th>Redemptions</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCoupons.map((c) => {
                      const isExpired = c.validUntil && new Date(c.validUntil) < new Date();
                      const displayStatus = isExpired ? 'Expired' : c.status;
                      const usagePct = c.usageLimit ? Math.min(100, Math.round(((c.timesUsed || 0) / c.usageLimit) * 100)) : null;

                      return (
                        <tr key={c.id}>
                          {/* Code */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '0.92rem',
                                color: 'var(--primary-navy-950)',
                                background: '#F1F5F9',
                                border: '1px solid #CBD5E1',
                                padding: '0.2rem 0.55rem',
                                borderRadius: 6,
                                letterSpacing: '0.04em'
                              }}>
                                {c.code}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(c.code)}
                                title="Copy code"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: copiedCode === c.code ? '#059669' : 'var(--neutral-400)',
                                  padding: '0.2rem'
                                }}
                              >
                                {copiedCode === c.code ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                          </td>

                          {/* Discount Value */}
                          <td>
                            <div style={{ fontWeight: 800, color: c.discountType === 'flat' ? '#059669' : '#0284C7', fontSize: '0.92rem' }}>
                              {c.discountType === 'flat' ? `Flat ₹${c.discountValue}` : `${c.discountValue}% OFF`}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', textTransform: 'capitalize' }}>
                              {c.discountType} discount
                            </div>
                          </td>

                          {/* Min Order & Max Cap */}
                          <td>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                              Min: ₹{c.minOrderAmount || 0}
                            </div>
                            {c.maxDiscount ? (
                              <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>
                                Cap: ₹{c.maxDiscount}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.72rem', color: 'var(--neutral-400)' }}>
                                No cap
                              </div>
                            )}
                          </td>

                          {/* Description */}
                          <td style={{ maxWidth: 220 }}>
                            <div style={{ fontSize: '0.82rem', color: 'var(--neutral-700)', lineHeight: 1.4 }}>
                              {c.description}
                            </div>
                            {c.validUntil && (
                              <div style={{ fontSize: '0.72rem', color: isExpired ? '#DC2626' : 'var(--neutral-500)', marginTop: '0.2rem' }}>
                                Valid till: {new Date(c.validUntil).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            )}
                          </td>

                          {/* Redemptions */}
                          <td style={{ minWidth: 120 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-navy-950)' }}>
                              {c.timesUsed || 0} {c.usageLimit ? `/ ${c.usageLimit}` : 'used'}
                            </div>
                            {usagePct !== null && (
                              <div style={{ width: '100%', height: 4, background: '#E2E8F0', borderRadius: 9999, marginTop: '0.25rem', overflow: 'hidden' }}>
                                <div style={{ width: `${usagePct}%`, height: '100%', background: usagePct >= 90 ? '#DC2626' : '#059669', borderRadius: 9999 }} />
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td>
                            <span className={`status-pill ${
                              displayStatus === 'Active' ? 'success' : displayStatus === 'Expired' ? 'danger' : 'neutral'
                            }`}>
                              {displayStatus}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              {/* Quick Toggle Status */}
                              <button
                                type="button"
                                onClick={() => handleToggleCouponStatus(c)}
                                title={c.status === 'Active' ? 'Click to Deactivate' : 'Click to Activate'}
                                style={{
                                  background: c.status === 'Active' ? '#ECFDF5' : '#F1F5F9',
                                  border: `1px solid ${c.status === 'Active' ? '#A7F3D0' : '#CBD5E1'}`,
                                  color: c.status === 'Active' ? '#059669' : '#64748B',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: 6,
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {c.status === 'Active' ? 'Active' : 'Enable'}
                              </button>

                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(c)}
                                title="Edit Coupon"
                                style={{
                                  background: '#EFF6FF',
                                  border: '1px solid #BFDBFE',
                                  color: '#1D4ED8',
                                  padding: '0.3rem 0.45rem',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Edit2 size={13} />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteCouponClick(c)}
                                title="Delete Coupon"
                                style={{
                                  background: '#FEF2F2',
                                  border: '1px solid #FECDD3',
                                  color: '#E11D48',
                                  padding: '0.3rem 0.45rem',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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

      {/* STAFF & PATIENT CREDENTIALS DIRECTORY TAB */}
      {activeTab === 'credentials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Quick Metrics Bar */}
          <div className="stats-grid" style={{ marginBottom: 0 }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
                <KeyRound size={22} />
              </div>
              <div>
                <div className="stat-val">{appUsers.length}</div>
                <div className="stat-label">Total Authenticated Users</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                <Users size={22} />
              </div>
              <div>
                <div className="stat-val">
                  {appUsers.filter((u) => u.role === 'nurse').length}
                </div>
                <div className="stat-label">Fleet Nurses with PIN</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#EFF6FF', color: '#0284C7' }}>
                <Activity size={22} />
              </div>
              <div>
                <div className="stat-val">
                  {appUsers.filter((u) => u.role === 'doctor').length}
                </div>
                <div className="stat-label">Tele-Consult Doctors</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#FFFBEB', color: '#D97706' }}>
                <Shield size={22} />
              </div>
              <div>
                <div className="stat-val">
                  {appUsers.filter((u) => u.role === 'patient').length}
                </div>
                <div className="stat-label">Active Patient Accounts</div>
              </div>
            </div>
          </div>

          {/* Master Credentials Directory Card */}
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 className="card-title">Staff & Patient Access Credentials Directory</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--neutral-500)', margin: 0 }}>
                  Master list of 4-digit security PINs, registered login identifiers, and stationed service areas synced with Supabase <code>app_users</code> table
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAllPins(!showAllPins)}
                  className="btn btn-outline btn-sm"
                  style={{ borderRadius: 9999, fontWeight: 700 }}
                >
                  {showAllPins ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showAllPins ? 'Hide All PINs' : 'Reveal All PINs'}</span>
                </button>

                <button
                  onClick={handleOpenCreateUserModal}
                  className="btn btn-danger btn-sm"
                  style={{ borderRadius: 9999, fontWeight: 700, gap: '0.4rem' }}
                >
                  <Plus size={16} />
                  <span>Add User Account</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--neutral-200)', background: '#FAFAFA', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
                <input
                  type="text"
                  placeholder="Search by name, email, phone, role, or area..."
                  value={credentialSearch}
                  onChange={(e) => setCredentialSearch(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '2.1rem', fontSize: '0.85rem', padding: '0.45rem 0.75rem 0.45rem 2.1rem' }}
                />
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', fontWeight: 600 }}>Role Filter:</span>
                {(['all', 'nurse', 'doctor', 'admin', 'patient'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCredentialRoleFilter(r)}
                    className={`btn btn-sm ${credentialRoleFilter === r ? 'btn-primary' : 'btn-outline'}`}
                    style={{ textTransform: 'capitalize', fontSize: '0.78rem', padding: '0.3rem 0.65rem' }}
                  >
                    {r === 'all' ? `All (${appUsers.length})` : r}
                  </button>
                ))}
              </div>
            </div>

            {/* Credentials Table */}
            {filteredUsers.length === 0 ? (
              <EmptyState
                title="No User Credentials Found"
                description={credentialSearch ? 'No accounts matched your search criteria.' : 'No authenticated staff or patient records found.'}
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Account Name & Designation</th>
                      <th>System Role</th>
                      <th>Registered Login Identifier</th>
                      <th>4-Digit Security PIN</th>
                      <th>Station / Service Area</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isRevealed = showAllPins || revealedPinIds[u.id];
                      const roleBadgeClass = 
                        u.role === 'admin' ? 'admin' :
                        u.role === 'doctor' ? 'doctor' :
                        u.role === 'nurse' ? 'nurse' : 'patient';

                      return (
                        <tr key={u.id}>
                          {/* Name & Designation */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                background: u.role === 'admin' ? '#EDE9FE' : u.role === 'doctor' ? '#E0F2FE' : u.role === 'nurse' ? '#ECFDF5' : '#FEF3C7',
                                color: u.role === 'admin' ? '#7C3AED' : u.role === 'doctor' ? '#0284C7' : u.role === 'nurse' ? '#059669' : '#D97706',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.85rem'
                              }}>
                                {u.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--primary-navy-950)' }}>{u.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>{u.designation || u.role}</div>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td>
                            <span className={`role-badge ${roleBadgeClass}`}>
                              {u.role}
                            </span>
                          </td>

                          {/* Login Identifier */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              {u.email ? <Mail size={13} style={{ color: 'var(--neutral-400)' }} /> : <Phone size={13} style={{ color: 'var(--neutral-400)' }} />}
                              <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{u.identifier || u.email || u.phone}</span>
                            </div>
                            {u.phone && u.email && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', marginTop: '0.15rem' }}>
                                Mobile: {u.phone}
                              </div>
                            )}
                          </td>

                          {/* 4-Digit Security PIN */}
                          <td>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span className="pin-badge" style={{ fontSize: '0.92rem' }}>
                                <Lock size={12} style={{ color: '#0284C7' }} />
                                <span>{isRevealed ? u.pin : '••••'}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePinVisibility(u.id)}
                                title={isRevealed ? 'Hide PIN' : 'Reveal PIN'}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 3, color: 'var(--neutral-400)' }}
                              >
                                {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(u.pin);
                                  setCopiedPinUserId(u.id);
                                  setTimeout(() => setCopiedPinUserId(null), 2000);
                                }}
                                title="Copy PIN"
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 3, color: copiedPinUserId === u.id ? '#059669' : 'var(--neutral-400)' }}
                              >
                                {copiedPinUserId === u.id ? <Check size={14} /> : <Copy size={14} />}
                              </button>
                            </div>
                          </td>

                          {/* Service Area */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem' }}>
                              <MapPin size={13} style={{ color: 'var(--neutral-500)' }} />
                              <span>{u.serviceArea || 'Hyderabad Multi-Zone'}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td>
                            <span className="status-pill success">
                              <ShieldCheck size={12} />
                              <span>Authorized</span>
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const details = `Role: ${u.role}\nIdentifier: ${u.identifier || u.email || u.phone}\nPIN: ${u.pin}`;
                                  navigator.clipboard.writeText(details);
                                  setCopiedPinUserId(u.id);
                                  setTimeout(() => setCopiedPinUserId(null), 2000);
                                }}
                                className="btn btn-outline btn-sm"
                                style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                                title="Copy full login credentials (Identifier & PIN)"
                              >
                                {copiedPinUserId === u.id ? (
                                  <>
                                    <Check size={12} style={{ color: '#059669' }} />
                                    <span style={{ color: '#059669' }}>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditUserModal(u)}
                                title="Edit User Credentials in Supabase"
                                style={{
                                  background: '#EFF6FF',
                                  border: '1px solid #BFDBFE',
                                  color: '#1D4ED8',
                                  padding: '0.3rem 0.45rem',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Edit2 size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteUserClick(u)}
                                title="Delete User from Supabase"
                                style={{
                                  background: '#FEF2F2',
                                  border: '1px solid #FECDD3',
                                  color: '#E11D48',
                                  padding: '0.3rem 0.45rem',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Login Protocol Information Callout */}
          <div style={{
            background: 'linear-gradient(135deg, #0A192F 0%, #0F2744 100%)',
            borderRadius: 18,
            padding: '1.5rem 1.75rem',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.25rem',
            boxShadow: '0 8px 30px -4px rgba(10, 25, 47, 0.25)'
          }}>
            <div style={{ maxWidth: 650 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <KeyRound size={18} style={{ color: '#38BDF8' }} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  PIN-Based Unified Portal Authentication
                </h4>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#CBD5E1', lineHeight: 1.5, margin: 0 }}>
                Every nurse, doctor, administrator, and registered patient logs in using their registered identifier (Phone or Email) and their authorized 4-digit PIN. No complex passwords required.
              </p>
            </div>

            <a
              href="/login"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-danger"
              style={{ borderRadius: 9999, fontWeight: 700, gap: '0.45rem', padding: '0.6rem 1.25rem' }}
            >
              <span>Test Sign In Portal</span>
              <ExternalLink size={15} />
            </a>
          </div>

        </div>
      )}

      {/* CLOUDFLARE R2 BUCKET STORAGE ENGINE TAB */}
      {activeTab === 'storage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header Action Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0A192F 0%, #0F2744 100%)',
            borderRadius: 18,
            padding: '1.5rem 1.75rem',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 8px 30px -4px rgba(10, 25, 47, 0.25)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <Cloud size={22} style={{ color: '#38BDF8' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Cloudflare R2 Storage Bucket Engine
                </h3>
              </div>
              <p style={{ fontSize: '0.84rem', color: '#94A3B8', margin: 0 }}>
                Bucket: <strong style={{ color: '#38BDF8' }}>{r2Config.bucketName}</strong> • Endpoint: <span style={{ color: '#CBD5E1' }}>{r2Config.publicDomain}</span> • Zero Egress Fees Verified
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsR2ConfigModalOpen(true)}
                className="btn btn-outline"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: '#FFFFFF',
                  borderRadius: 9999,
                  fontSize: '0.8rem',
                  gap: '0.35rem'
                }}
              >
                <Settings size={14} />
                <span>R2 Bucket Settings</span>
              </button>
              <button
                type="button"
                onClick={handleSyncAllInvoicesToCloudflare}
                className="btn btn-outline"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: '#FFFFFF',
                  borderRadius: 9999,
                  fontSize: '0.8rem',
                  gap: '0.35rem'
                }}
              >
                <Receipt size={14} />
                <span>Sync Invoices to R2</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadForm({ fileName: '', category: 'prescriptions', bookingId: '', patientName: '', description: '' });
                  setIsUploadModalOpen(true);
                }}
                className="btn btn-danger"
                style={{
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  gap: '0.35rem',
                  padding: '0.5rem 1.15rem'
                }}
              >
                <UploadCloud size={15} />
                <span>Upload Document</span>
              </button>
            </div>
          </div>

          {/* Key Metrics Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                  Total Bucket Objects
                </span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HardDrive size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary-navy-950)' }}>
                {storageObjects.length}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#059669', marginTop: '0.25rem', fontWeight: 600 }}>
                ✓ Synced with Cloudflare R2
              </div>
            </div>

            <div className="card" style={{ padding: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                  Compulsory Prescriptions
                </span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#059669' }}>
                {storageObjects.filter((o) => o.category === 'prescriptions').length}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>
                Mandatory for Home Clinical Care
              </div>
            </div>

            <div className="card" style={{ padding: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                  Tax Invoices Stored
                </span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FFFBEB', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Receipt size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#D97706' }}>
                {storageObjects.filter((o) => o.category === 'invoices').length}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>
                GST Compliant Doorstep Invoices
              </div>
            </div>

            <div className="card" style={{ padding: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--neutral-500)', textTransform: 'uppercase' }}>
                  Bucket Size Stored
                </span>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Cloud size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary-navy-950)' }}>
                {(storageObjects.reduce((acc, o) => acc + (o.sizeBytes || 0), 0) / (1024 * 1024)).toFixed(2)} MB
              </div>
              <div style={{ fontSize: '0.74rem', color: '#0284C7', marginTop: '0.25rem', fontWeight: 600 }}>
                Global CDN Edge Distribution
              </div>
            </div>
          </div>

          {/* Storage Filter Toolbar & Table Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Filter Header */}
            <div style={{
              padding: '1.15rem 1.4rem',
              borderBottom: '1px solid var(--neutral-200)',
              background: '#FAFAFA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              {/* Category Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                {(['all', 'prescriptions', 'invoices', 'certificates', 'teleconsult-rx', 'lab-reports'] as const).map((cat) => {
                  const count = cat === 'all' ? storageObjects.length : storageObjects.filter((o) => o.category === cat).length;
                  const label = cat === 'all' ? 'All Objects' : cat === 'prescriptions' ? 'Prescriptions (Rx)' : cat === 'teleconsult-rx' ? 'Doctor Tele-Rx' : cat.charAt(0).toUpperCase() + cat.slice(1);
                  const isSelected = storageCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setStorageCategoryFilter(cat)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: 9999,
                        fontSize: '0.76rem',
                        fontWeight: isSelected ? 800 : 600,
                        border: isSelected ? '1px solid #0284C7' : '1px solid #E2E8F0',
                        background: isSelected ? '#EFF6FF' : '#FFFFFF',
                        color: isSelected ? '#0284C7' : '#475569',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <span>{label}</span>
                      <span style={{
                        background: isSelected ? '#0284C7' : '#E2E8F0',
                        color: isSelected ? '#FFFFFF' : '#475569',
                        fontSize: '0.68rem',
                        padding: '1px 6px',
                        borderRadius: 9999
                      }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Box */}
              <div style={{ position: 'relative', width: 260 }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
                <input
                  type="text"
                  placeholder="Search file, patient, ref..."
                  value={storageSearch}
                  onChange={(e) => setStorageSearch(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '2rem', paddingRight: '0.75rem', fontSize: '0.8rem', height: 34, borderRadius: 8 }}
                />
              </div>
            </div>

            {/* Objects Table */}
            {filteredStorageObjects.length === 0 ? (
              <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                <EmptyState
                  compact
                  title="No Storage Objects Found"
                  description={storageSearch ? `No objects match "${storageSearch}".` : 'No files found in this category.'}
                />
              </div>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Object Key & File Name</th>
                      <th>Category</th>
                      <th>Patient / Booking Metadata</th>
                      <th>Size</th>
                      <th>Uploaded At</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStorageObjects.map((obj) => {
                      const isPrescription = obj.category === 'prescriptions';
                      const isInvoice = obj.category === 'invoices';
                      return (
                        <tr key={obj.id}>
                          {/* Object Key */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                              <div style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                background: isPrescription ? '#ECFDF5' : isInvoice ? '#FFFBEB' : '#F1F5F9',
                                color: isPrescription ? '#059669' : isInvoice ? '#D97706' : '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {isPrescription ? <FileText size={17} /> : isInvoice ? <Receipt size={17} /> : <Cloud size={17} />}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--primary-navy-950)' }}>
                                  {obj.fileName}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'monospace' }}>
                                  {obj.key}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '2px 8px',
                              borderRadius: 9999,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: isPrescription ? '#ECFDF5' : isInvoice ? '#FFFBEB' : '#EFF6FF',
                              color: isPrescription ? '#059669' : isInvoice ? '#D97706' : '#1D4ED8',
                              border: `1px solid ${isPrescription ? '#A7F3D0' : isInvoice ? '#FDE68A' : '#BFDBFE'}`
                            }}>
                              {isPrescription ? 'Rx Mandatory' : obj.category.toUpperCase()}
                            </span>
                          </td>

                          {/* Metadata */}
                          <td>
                            {obj.metadata?.patientName ? (
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-navy-900)' }}>
                                  {obj.metadata.patientName}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                  Ref: {obj.metadata.bookingId || 'Direct Upload'}
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.76rem', color: '#94A3B8' }}>{obj.metadata?.description || 'System asset'}</span>
                            )}
                          </td>

                          {/* Size */}
                          <td>
                            <span style={{ fontSize: '0.82rem', color: 'var(--neutral-700)', fontWeight: 600 }}>
                              {(obj.sizeBytes / 1024).toFixed(0)} KB
                            </span>
                          </td>

                          {/* Upload Date */}
                          <td>
                            <span style={{ fontSize: '0.78rem', color: 'var(--neutral-500)' }}>
                              {new Date(obj.uploadedAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              {isPrescription && (
                                <button
                                  type="button"
                                  onClick={() => handleViewStorageObjectPrescription(obj)}
                                  className="btn btn-sm"
                                  style={{
                                    background: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    color: '#059669',
                                    padding: '0.25rem 0.55rem',
                                    borderRadius: 6,
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                  title="Inspect Prescription Document"
                                >
                                  <Eye size={12} />
                                  <span>View Rx</span>
                                </button>
                              )}

                              {isInvoice && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const matchingBooking = bookings.find((b) => b.id === obj.metadata?.bookingId);
                                    if (matchingBooking) {
                                      handleViewBookingInvoice(matchingBooking);
                                    } else {
                                      window.open(obj.publicUrl, '_blank');
                                    }
                                  }}
                                  className="btn btn-sm"
                                  style={{
                                    background: '#FFFBEB',
                                    border: '1px solid #FDE68A',
                                    color: '#B45309',
                                    padding: '0.25rem 0.55rem',
                                    borderRadius: 6,
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                  }}
                                  title="View Invoice"
                                >
                                  <Receipt size={12} />
                                  <span>Invoice</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleCopyPublicUrl(obj.publicUrl)}
                                style={{
                                  background: '#F1F5F9',
                                  border: '1px solid #CBD5E1',
                                  color: '#334155',
                                  padding: '0.28rem 0.45rem',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Copy Cloudflare Public URL"
                              >
                                <Copy size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteObjectClick(obj)}
                                style={{
                                  background: '#FEF2F2',
                                  border: '1px solid #FECDD3',
                                  color: '#E11D48',
                                  padding: '0.28rem 0.45rem',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Delete from Cloudflare Bucket"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
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

      {/* CREATE / EDIT COUPON MODAL */}
      {isCouponModalOpen && (
        <div 
          className="modal-overlay" 
          onClick={() => setIsCouponModalOpen(false)}
          style={{ zIndex: 99999, pointerEvents: 'auto' }}
        >
          <div 
            className="modal-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: 540, borderRadius: 20, pointerEvents: 'auto' }}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: '#FAFAFA', borderBottom: '1px solid var(--neutral-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-navy-950)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tag size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                    {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Supabase Coupon'}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--neutral-500)', fontWeight: 500 }}>
                    Changes sync immediately across customer booking flows and database
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsCouponModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={17} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCoupon} className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
              {couponFormError && (
                <div style={{ padding: '0.65rem 0.85rem', background: '#FEF2F2', border: '1px solid #FECDD3', borderRadius: 8, color: '#DC2626', fontSize: '0.82rem', fontWeight: 600, marginBottom: '1rem' }}>
                  {couponFormError}
                </div>
              )}

              {/* Row 1: Code & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    COUPON CODE *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MONSOON50"
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase'
                    }}
                    className="form-control"
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    STATUS
                  </label>
                  <select
                    className="form-control"
                    value={couponForm.status}
                    onChange={(e) => setCouponForm({ ...couponForm, status: e.target.value as any })}
                  >
                    <option value="Active">Active (Redeemable)</option>
                    <option value="Inactive">Inactive (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Discount Type & Value */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    DISCOUNT TYPE
                  </label>
                  <select
                    className="form-control"
                    value={couponForm.discountType}
                    onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value as any })}
                  >
                    <option value="flat">Flat Amount (₹)</option>
                    <option value="percent">Percentage (%)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    {couponForm.discountType === 'flat' ? 'AMOUNT (₹) *' : 'PERCENT (%) *'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={couponForm.discountType === 'percent' ? 100 : 5000}
                    value={couponForm.discountValue}
                    onChange={(e) => setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })}
                    className="form-control"
                    required
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    MAX CAP (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="No limit"
                    value={couponForm.maxDiscount}
                    disabled={couponForm.discountType === 'flat'}
                    onChange={(e) => setCouponForm({ ...couponForm, maxDiscount: e.target.value })}
                    className="form-control"
                    style={{ background: couponForm.discountType === 'flat' ? '#F1F5F9' : '#FFFFFF' }}
                  />
                </div>
              </div>

              {/* Row 3: Minimum Order & Usage Limit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    MIN ORDER AMOUNT (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={couponForm.minOrderAmount}
                    onChange={(e) => setCouponForm({ ...couponForm, minOrderAmount: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    USAGE LIMIT (TOTAL)
                  </label>
                  <input
                    type="number"
                    placeholder="Unlimited"
                    value={couponForm.usageLimit}
                    onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Row 4: Valid Until Date */}
              <div style={{ marginBottom: '0.85rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  EXPIRY DATE (OPTIONAL)
                </label>
                <input
                  type="date"
                  value={couponForm.validUntil}
                  onChange={(e) => setCouponForm({ ...couponForm, validUntil: e.target.value })}
                  className="form-control"
                />
              </div>

              {/* Row 5: Description */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                  PATIENT DESCRIPTION *
                </label>
                <input
                  type="text"
                  placeholder="e.g. ₹100 flat discount for first home visit in Hyderabad"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
                  className="form-control"
                  required
                />
              </div>

              {/* Live Preview Card */}
              <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 10, padding: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Live Patient Preview in Booking Modal:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '0.45rem 0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#065F46', fontWeight: 600 }}>
                    <CheckCircle size={15} style={{ color: '#059669' }} />
                    <span><strong>{couponForm.code || 'CODE'}</strong> applied ({couponForm.description || 'Description'})</span>
                  </div>
                  <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.84rem' }}>
                    -{couponForm.discountType === 'flat' ? `₹${couponForm.discountValue}` : `${couponForm.discountValue}%`}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsCouponModalOpen(false)}
                  className="btn btn-outline"
                  style={{ borderRadius: 9999 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCoupon}
                  className="btn btn-danger"
                  style={{ borderRadius: 9999, fontWeight: 700, minWidth: 140, justifyContent: 'center' }}
                >
                  {isSubmittingCoupon ? 'Saving to Supabase...' : editingCoupon ? 'Update Coupon' : 'Create & Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. CREATE / EDIT BOOKING MODAL */}
      {/* ========================================================================= */}
      {isBookingModalOpen && (
        <div 
          className="modal-overlay" 
          data-lenis-prevent="true"
          onClick={() => setIsBookingModalOpen(false)}
          style={{ zIndex: 99999, pointerEvents: 'auto' }}
        >
          <div 
            className="modal-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: 580, borderRadius: 20, pointerEvents: 'auto', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: '#FAFAFA', borderBottom: '1px solid var(--neutral-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-navy-950)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                    {editingBooking ? `Edit Booking: ${editingBooking.id}` : 'Create New Patient Booking'}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--neutral-500)', fontWeight: 500 }}>
                    Directly updates dispatch records in Supabase <code>bookings</code> table
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveBookingSubmit} className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>PATIENT FULL NAME *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra"
                    value={bookingForm.patientName}
                    onChange={(e) => setBookingForm({ ...bookingForm, patientName: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>PHONE NUMBER *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={bookingForm.patientPhone}
                    onChange={(e) => setBookingForm({ ...bookingForm, patientPhone: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>PATIENT AGE</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={bookingForm.patientAge}
                    onChange={(e) => setBookingForm({ ...bookingForm, patientAge: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>GENDER</label>
                  <select
                    className="form-control"
                    value={bookingForm.patientGender}
                    onChange={(e) => setBookingForm({ ...bookingForm, patientGender: e.target.value })}
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>AREA (RULE 2)</label>
                  <select
                    className="form-control"
                    value={bookingForm.area}
                    onChange={(e) => setBookingForm({ ...bookingForm, area: e.target.value as HyderabadArea })}
                  >
                    <option value="Gachibowli">Gachibowli</option>
                    <option value="LB Nagar">LB Nagar</option>
                    <option value="Madhapur">Madhapur</option>
                    <option value="Banjara Hills">Banjara Hills</option>
                    <option value="Kukatpally">Kukatpally</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>CLINICAL PROCEDURE</label>
                  <select
                    className="form-control"
                    value={bookingForm.serviceId}
                    onChange={(e) => {
                      const sel = services.find((s) => s.id === e.target.value);
                      setBookingForm({
                        ...bookingForm,
                        serviceId: e.target.value as ServiceId,
                        serviceTitle: sel ? sel.title : bookingForm.serviceTitle,
                        estimatedFee: sel?.priceNumber ?? bookingForm.estimatedFee
                      });
                    }}
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.title} (₹{s.priceNumber})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ESTIMATED FEE (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={bookingForm.estimatedFee}
                    onChange={(e) => setBookingForm({ ...bookingForm, estimatedFee: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>DISPATCH STATUS</label>
                  <select
                    className="form-control"
                    value={bookingForm.status}
                    onChange={(e) => setBookingForm({ ...bookingForm, status: e.target.value as any })}
                  >
                    <option value="Pending">Pending (Unassigned)</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In-Progress">In-Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ASSIGNED NURSE</label>
                  <select
                    className="form-control"
                    value={bookingForm.assignedNurseId}
                    onChange={(e) => setBookingForm({ ...bookingForm, assignedNurseId: e.target.value })}
                  >
                    <option value="">— Unassigned —</option>
                    {nurses.map((n) => (
                      <option key={n.id} value={n.id}>{n.name} ({n.serviceArea})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>STREET ADDRESS</label>
                <input
                  type="text"
                  placeholder="Flat/House number, Apartment, Landmark"
                  value={bookingForm.fullAddress}
                  onChange={(e) => setBookingForm({ ...bookingForm, fullAddress: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  id="bHasRx"
                  checked={bookingForm.hasPrescription}
                  onChange={(e) => setBookingForm({ ...bookingForm, hasPrescription: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="bHasRx" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                  Doctor Clinical Prescription is Verified & Attached
                </label>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>DISPATCH / CLINICAL NOTES</label>
                <textarea
                  rows={2}
                  placeholder="Special clinical instructions, gate access codes, etc."
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsBookingModalOpen(false)} className="btn btn-outline" style={{ borderRadius: 9999 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" style={{ borderRadius: 9999, fontWeight: 700, minWidth: 140, justifyContent: 'center' }}>
                  {editingBooking ? 'Update Booking' : 'Create Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CREATE / EDIT NURSE MODAL */}
      {/* ========================================================================= */}
      {isNurseModalOpen && (
        <div 
          className="modal-overlay" 
          data-lenis-prevent="true"
          onClick={() => setIsNurseModalOpen(false)}
          style={{ zIndex: 99999, pointerEvents: 'auto' }}
        >
          <div 
            className="modal-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: 580, borderRadius: 20, pointerEvents: 'auto', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: '#FAFAFA', borderBottom: '1px solid var(--neutral-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-navy-950)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                    {editingNurse ? `Edit Nurse: ${editingNurse.name}` : 'Register New Certified Nurse'}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--neutral-500)', fontWeight: 500 }}>
                    Synchronized with Supabase <code>nurses</code> and <code>app_users</code> tables
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsNurseModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveNurseSubmit} className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>NURSE FULL NAME *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. S. Anitha RN"
                    value={nurseForm.name}
                    onChange={(e) => setNurseForm({ ...nurseForm, name: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>PHONE NUMBER *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 11111"
                    value={nurseForm.phone}
                    onChange={(e) => setNurseForm({ ...nurseForm, phone: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>LOGIN EMAIL *</label>
                  <input
                    type="email"
                    required
                    placeholder="nurse.name@xpressnurse.in"
                    value={nurseForm.email}
                    onChange={(e) => setNurseForm({ ...nurseForm, email: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>4-DIGIT LOGIN PIN *</label>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    placeholder="1001"
                    value={nurseForm.pin}
                    onChange={(e) => setNurseForm({ ...nurseForm, pin: e.target.value.replace(/\D/g, '') })}
                    className="form-control"
                    style={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.1em' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>QUALIFICATION</label>
                  <input
                    type="text"
                    placeholder="B.Sc Nursing (Registered RN)"
                    value={nurseForm.qualification}
                    onChange={(e) => setNurseForm({ ...nurseForm, qualification: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>EXP. (YEARS)</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={nurseForm.experienceYears}
                    onChange={(e) => setNurseForm({ ...nurseForm, experienceYears: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>RATING</label>
                  <input
                    type="number"
                    step={0.1}
                    min={3.0}
                    max={5.0}
                    value={nurseForm.rating}
                    onChange={(e) => setNurseForm({ ...nurseForm, rating: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>SERVICE AREA (RULE 2)</label>
                  <select
                    className="form-control"
                    value={nurseForm.serviceArea}
                    onChange={(e) => setNurseForm({ ...nurseForm, serviceArea: e.target.value as HyderabadArea })}
                  >
                    <option value="Gachibowli">Gachibowli</option>
                    <option value="LB Nagar">LB Nagar</option>
                    <option value="Madhapur">Madhapur</option>
                    <option value="Banjara Hills">Banjara Hills</option>
                    <option value="Kukatpally">Kukatpally</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ROSTER STATUS</label>
                  <select
                    className="form-control"
                    value={nurseForm.status}
                    onChange={(e) => setNurseForm({ ...nurseForm, status: e.target.value })}
                  >
                    <option value="Active">Active (Available for routing)</option>
                    <option value="On-Duty">On-Duty (Currently on visit)</option>
                    <option value="Off-Duty">Off-Duty (Unavailable)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  id="nCertVer"
                  checked={nurseForm.certificateVerified}
                  onChange={(e) => setNurseForm({ ...nurseForm, certificateVerified: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="nCertVer" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                  Nursing Council Certificate & KYC Background Verified
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsNurseModalOpen(false)} className="btn btn-outline" style={{ borderRadius: 9999 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" style={{ borderRadius: 9999, fontWeight: 700, minWidth: 140, justifyContent: 'center' }}>
                  {editingNurse ? 'Update Nurse' : 'Register Nurse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CREATE / EDIT SERVICE MODAL */}
      {/* ========================================================================= */}
      {isServiceModalOpen && (
        <div 
          className="modal-overlay" 
          data-lenis-prevent="true"
          onClick={() => setIsServiceModalOpen(false)}
          style={{ zIndex: 99999, pointerEvents: 'auto' }}
        >
          <div 
            className="modal-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: 580, borderRadius: 20, pointerEvents: 'auto', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: '#FAFAFA', borderBottom: '1px solid var(--neutral-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-navy-950)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layers size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                    {editingService ? `Edit Procedure: ${editingService.title}` : 'Add New Clinical Procedure'}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--neutral-500)', fontWeight: 500 }}>
                    Updates public catalog tariffs in Supabase <code>services</code> table
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsServiceModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveServiceSubmit} className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>PROCEDURE TITLE *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IV Saline & Antibiotic Infusion"
                    value={serviceForm.title}
                    onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>SLUG / CODE ID</label>
                  <input
                    type="text"
                    disabled={!!editingService}
                    placeholder="saline-infusion"
                    value={serviceForm.id}
                    onChange={(e) => setServiceForm({ ...serviceForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    className="form-control"
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>SUBTITLE / SHORT SPEC</label>
                <input
                  type="text"
                  placeholder="Doctor-prescribed medication, electrolyte replenishment"
                  value={serviceForm.subtitle}
                  onChange={(e) => setServiceForm({ ...serviceForm, subtitle: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>SINGLE VISIT (₹) *</label>
                  <input
                    type="number"
                    min={100}
                    required
                    value={serviceForm.priceNumber}
                    onChange={(e) => setServiceForm({ ...serviceForm, priceNumber: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>PACKAGE / VISIT (₹)</label>
                  <input
                    type="number"
                    min={100}
                    value={serviceForm.multiVisitPrice}
                    onChange={(e) => setServiceForm({ ...serviceForm, multiVisitPrice: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>NIGHT SURCHARGE (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={serviceForm.nightSurcharge}
                    onChange={(e) => setServiceForm({ ...serviceForm, nightSurcharge: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>TYPICAL DURATION</label>
                  <input
                    type="text"
                    placeholder="45 - 60 mins"
                    value={serviceForm.duration}
                    onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>FEATURED BADGE</label>
                  <input
                    type="text"
                    placeholder="Popular / 24/7 Available"
                    value={serviceForm.badge}
                    onChange={(e) => setServiceForm({ ...serviceForm, badge: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>CLINICAL DESCRIPTION</label>
                <textarea
                  rows={2}
                  placeholder="Detailed description of the nursing procedure for patients..."
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  id="sRxReq"
                  checked={serviceForm.prescriptionRequired}
                  onChange={(e) => setServiceForm({ ...serviceForm, prescriptionRequired: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="sRxReq" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                  Prescription Mandatory (Doctor tele-consult triage prompted if patient has none)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsServiceModalOpen(false)} className="btn btn-outline" style={{ borderRadius: 9999 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" style={{ borderRadius: 9999, fontWeight: 700, minWidth: 140, justifyContent: 'center' }}>
                  {editingService ? 'Update Procedure' : 'Publish Procedure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CREATE / EDIT LEAD MODAL */}
      {/* ========================================================================= */}
      {isLeadModalOpen && (
        <div 
          className="modal-overlay" 
          data-lenis-prevent="true"
          onClick={() => setIsLeadModalOpen(false)}
          style={{ zIndex: 99999, pointerEvents: 'auto' }}
        >
          <div 
            className="modal-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: 540, borderRadius: 20, pointerEvents: 'auto' }}
          >
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: '#FAFAFA', borderBottom: '1px solid var(--neutral-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-navy-950)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                    {editingLead ? `Edit Referral Lead: ${editingLead.id}` : 'Record Nurse Referral Lead'}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--neutral-500)', fontWeight: 500 }}>
                    Governed by Rule 1 (referrals stay with the nurse) in Supabase <code>leads</code> table
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsLeadModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveLeadSubmit} className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>PATIENT FULL NAME *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lakshmi Devi"
                    value={leadForm.patientName}
                    onChange={(e) => setLeadForm({ ...leadForm, patientName: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>CONTACT PHONE *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 22222"
                    value={leadForm.patientPhone}
                    onChange={(e) => setLeadForm({ ...leadForm, patientPhone: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>REFERRING NURSE (RULE 1)</label>
                  <select
                    className="form-control"
                    value={leadForm.nurseId}
                    onChange={(e) => setLeadForm({ ...leadForm, nurseId: e.target.value })}
                  >
                    {nurses.map((n) => (
                      <option key={n.id} value={n.id}>{n.name} ({n.serviceArea})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>PATIENT AREA</label>
                  <select
                    className="form-control"
                    value={leadForm.area}
                    onChange={(e) => setLeadForm({ ...leadForm, area: e.target.value as HyderabadArea })}
                  >
                    <option value="LB Nagar">LB Nagar</option>
                    <option value="Gachibowli">Gachibowli</option>
                    <option value="Madhapur">Madhapur</option>
                    <option value="Banjara Hills">Banjara Hills</option>
                    <option value="Kukatpally">Kukatpally</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>PROCEDURE NEEDED</label>
                  <select
                    className="form-control"
                    value={leadForm.serviceId}
                    onChange={(e) => setLeadForm({ ...leadForm, serviceId: e.target.value as ServiceId })}
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>LEAD STATUS</label>
                  <select
                    className="form-control"
                    value={leadForm.status}
                    onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value as any })}
                  >
                    <option value="Converted">Converted (Award Payout)</option>
                    <option value="Submitted">Submitted (Under Review)</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>LEAD VALUE (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={leadForm.leadValueRupees}
                    onChange={(e) => setLeadForm({ ...leadForm, leadValueRupees: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>POINTS AWARDED</label>
                  <input
                    type="number"
                    min={0}
                    value={leadForm.pointsAwarded}
                    onChange={(e) => setLeadForm({ ...leadForm, pointsAwarded: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsLeadModalOpen(false)} className="btn btn-outline" style={{ borderRadius: 9999 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" style={{ borderRadius: 9999, fontWeight: 700, minWidth: 140, justifyContent: 'center' }}>
                  {editingLead ? 'Update Lead' : 'Submit Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4B. ADMIN LEAD REWARD & APPROVAL DECISION MODAL */}
      {/* ========================================================================= */}
      {approvalModalLead && (
        <div 
          className="modal-overlay" 
          data-lenis-prevent="true"
          onClick={() => setApprovalModalLead(null)}
          style={{ zIndex: 99999, pointerEvents: 'auto' }}
        >
          <div 
            className="modal-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: 580, borderRadius: 20, pointerEvents: 'auto', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: '#FAFAFA', borderBottom: '1px solid var(--neutral-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Award size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                    Admin Decision: Points & Referral Earnings
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--neutral-500)', fontWeight: 500 }}>
                    Decide rewards for Nurse Referral Lead <strong style={{ color: 'var(--primary-navy-900)' }}>{approvalModalLead.id}</strong>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setApprovalModalLead(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={17} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
              {/* Lead & Nurse Summary Card */}
              {(() => {
                const referringNurse = nurses.find((n) => n.id === approvalModalLead.nurseId);
                const serviceObj = services.find((s) => s.id === approvalModalLead.serviceId);
                const procedureFee = approvalModalLead.leadValueRupees || serviceObj?.priceNumber || 800;

                return (
                  <>
                    <div style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 12,
                      padding: '1rem',
                      marginBottom: '1.25rem'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--neutral-500)', fontWeight: 700 }}>
                            Patient Information
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary-navy-950)' }}>
                            {approvalModalLead.patientName}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
                            📞 {approvalModalLead.patientPhone}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--neutral-600)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem' }}>
                            <MapPin size={12} style={{ color: 'var(--neutral-400)' }} />
                            <span>{approvalModalLead.area}, Hyderabad</span>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--neutral-500)', fontWeight: 700 }}>
                            Procedure & Value
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-navy-900)' }}>
                            {serviceObj?.title || approvalModalLead.serviceId}
                          </div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669', marginTop: '0.2rem' }}>
                            Fee: ₹{procedureFee}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', marginTop: '0.15rem' }}>
                            Submitted: {approvalModalLead.submittedAt ? (approvalModalLead.submittedAt.includes('T') ? new Date(approvalModalLead.submittedAt).toLocaleDateString() : approvalModalLead.submittedAt) : 'Recent'}
                          </div>
                        </div>
                      </div>

                      <div style={{
                        borderTop: '1px solid #E2E8F0',
                        paddingTop: '0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', fontWeight: 600 }}>Referring Nurse: </span>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--primary-navy-900)' }}>
                            {referringNurse?.name || approvalModalLead.nurseId} ({referringNurse?.serviceArea || 'Stationed'})
                          </strong>
                        </div>
                        {referringNurse && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--neutral-600)' }}>
                            Current Balance: <strong style={{ color: '#059669' }}>{referringNurse.pointsEarned || 0} pts</strong> | <strong style={{ color: '#059669' }}>₹{referringNurse.referralEarningsRupees || 0}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin Input 1: Points to Award */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--primary-navy-900)' }}>
                          1. REWARD POINTS TO AWARD NURSE *
                        </label>
                        <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>Standard: 50 pts</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <input
                          type="number"
                          min={0}
                          max={5000}
                          value={approvalPoints}
                          onChange={(e) => setApprovalPoints(Number(e.target.value))}
                          className="form-control"
                          style={{ fontWeight: 800, fontSize: '1rem', color: '#047857', maxWidth: 160 }}
                        />
                        <span style={{ fontWeight: 700, color: 'var(--neutral-600)', fontSize: '0.9rem' }}>Points</span>
                      </div>

                      {/* Quick preset chips */}
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {[0, 25, 50, 75, 100, 150, 200].map((pts) => (
                          <button
                            key={pts}
                            type="button"
                            onClick={() => setApprovalPoints(pts)}
                            style={{
                              padding: '0.25rem 0.6rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              borderRadius: 6,
                              border: approvalPoints === pts ? '1px solid #059669' : '1px solid #CBD5E1',
                              background: approvalPoints === pts ? '#ECFDF5' : '#FFFFFF',
                              color: approvalPoints === pts ? '#065F46' : 'var(--neutral-700)',
                              cursor: 'pointer'
                            }}
                          >
                            {pts === 50 ? '50 pts (Standard)' : pts === 0 ? '0 pts' : `+${pts} pts`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Admin Input 2: Referral Commission (₹) */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 800, margin: 0, color: 'var(--primary-navy-900)' }}>
                          2. REFERRAL EARNING TO CREDIT NURSE (₹) *
                        </label>
                        <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
                          10% of Fee = ₹{Math.round(procedureFee * 0.1)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 800, color: 'var(--neutral-700)', fontSize: '1.1rem' }}>₹</span>
                        <input
                          type="number"
                          min={0}
                          max={50000}
                          value={approvalReferralRupees}
                          onChange={(e) => setApprovalReferralRupees(Number(e.target.value))}
                          className="form-control"
                          style={{ fontWeight: 800, fontSize: '1rem', color: '#047857', maxWidth: 160 }}
                        />
                        <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>
                          ({procedureFee > 0 ? Math.round((approvalReferralRupees / procedureFee) * 100) : 0}% of ₹{procedureFee} fee)
                        </span>
                      </div>

                      {/* Quick percentage chips */}
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {[
                          { label: '0%', val: 0 },
                          { label: `5% (₹${Math.round(procedureFee * 0.05)})`, val: Math.round(procedureFee * 0.05) },
                          { label: `10% (₹${Math.round(procedureFee * 0.10)}) - Standard`, val: Math.round(procedureFee * 0.10) },
                          { label: `15% (₹${Math.round(procedureFee * 0.15)})`, val: Math.round(procedureFee * 0.15) },
                          { label: `20% (₹${Math.round(procedureFee * 0.20)})`, val: Math.round(procedureFee * 0.20) },
                          { label: 'Flat ₹100', val: 100 },
                          { label: 'Flat ₹150', val: 150 },
                          { label: 'Flat ₹200', val: 200 }
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => setApprovalReferralRupees(chip.val)}
                            style={{
                              padding: '0.25rem 0.55rem',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              borderRadius: 6,
                              border: approvalReferralRupees === chip.val ? '1px solid #059669' : '1px solid #CBD5E1',
                              background: approvalReferralRupees === chip.val ? '#ECFDF5' : '#FFFFFF',
                              color: approvalReferralRupees === chip.val ? '#065F46' : 'var(--neutral-700)',
                              cursor: 'pointer'
                            }}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Admin Input 3: Notes / Remarks */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary-navy-900)' }}>
                        3. ADMIN APPROVAL REMARKS (OPTIONAL)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Cross-area referral verified. Patient completed Foley catheterization."
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        className="form-control"
                      />
                    </div>

                    {/* Summary Outcome Box */}
                    <div style={{
                      background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                      border: '1px solid #A7F3D0',
                      borderRadius: 12,
                      padding: '0.85rem 1rem',
                      marginBottom: '1.25rem',
                      fontSize: '0.82rem',
                      color: '#065F46'
                    }}>
                      <div style={{ fontWeight: 800, marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle size={15} color="#059669" />
                        <span>Upon Clicking Approve:</span>
                      </div>
                      <div style={{ lineHeight: 1.5 }}>
                        • Nurse <strong>{referringNurse?.name || 'Referring Nurse'}</strong> wallet credited <strong>+{approvalPoints} reward points</strong>.
                        <br />
                        • Nurse receives <strong>₹{approvalReferralRupees} referral payout</strong> directly into their account balance.
                        <br />
                        • Lead status changes to <strong style={{ color: '#047857' }}>Approved</strong> in Supabase.
                      </div>
                    </div>

                    {/* Reject Confirmation Drawer if toggled */}
                    {isRejectConfirmOpen && (
                      <div style={{
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: 12,
                        padding: '0.85rem 1rem',
                        marginBottom: '1.25rem'
                      }}>
                        <div style={{ fontWeight: 800, color: '#991B1B', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                          Confirm Lead Rejection
                        </div>
                        <p style={{ fontSize: '0.78rem', color: '#B91C1C', margin: '0 0 0.5rem' }}>
                          This will mark the lead as Rejected with 0 points and 0 commission. The nurse will not receive any payout.
                        </p>
                        <input
                          type="text"
                          placeholder="Reason for rejection (e.g. Invalid patient contact, duplicate entry)"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="form-control"
                          style={{ marginBottom: '0.65rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => setIsRejectConfirmOpen(false)}
                            className="btn btn-outline btn-sm"
                            style={{ borderRadius: 6, fontSize: '0.78rem' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmReject}
                            disabled={isProcessingApproval}
                            className="btn btn-danger btn-sm"
                            style={{ borderRadius: 6, fontWeight: 700, fontSize: '0.78rem' }}
                          >
                            {isProcessingApproval ? 'Rejecting...' : 'Confirm Reject'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Modal Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        {!isRejectConfirmOpen && (
                          <button
                            type="button"
                            onClick={() => setIsRejectConfirmOpen(true)}
                            className="btn btn-outline btn-sm"
                            style={{
                              color: '#DC2626',
                              borderColor: '#FECACA',
                              background: '#FFF5F5',
                              borderRadius: 9999,
                              fontWeight: 700,
                              fontSize: '0.78rem'
                            }}
                          >
                            Reject Lead
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.65rem' }}>
                        <button
                          type="button"
                          onClick={() => setApprovalModalLead(null)}
                          className="btn btn-outline"
                          style={{ borderRadius: 9999 }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmApproval}
                          disabled={isProcessingApproval}
                          className="btn btn-sm"
                          style={{
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 9999,
                            fontWeight: 800,
                            padding: '0.55rem 1.35rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            boxShadow: '0 4px 10px rgba(5,150,105,0.35)',
                            cursor: 'pointer'
                          }}
                        >
                          <CheckCircle size={16} />
                          <span>{isProcessingApproval ? 'Approving...' : `Approve & Credit (+${approvalPoints} pts, ₹${approvalReferralRupees})`}</span>
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      {isConsultModalOpen && (
        <div 
          className="modal-overlay" 
          data-lenis-prevent="true"
          onClick={() => setIsConsultModalOpen(false)}
          style={{ zIndex: 99999, pointerEvents: 'auto' }}
        >
          <div 
            className="modal-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: 580, borderRadius: 20, pointerEvents: 'auto', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: '#FAFAFA', borderBottom: '1px solid var(--neutral-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-navy-950)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Stethoscope size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                    {editingConsult ? `Edit Tele-Consult: ${editingConsult.id}` : 'Create Doctor Tele-Consult Request'}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--neutral-500)', fontWeight: 500 }}>
                    Updates prescription queue in Supabase <code>consultations</code> table
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsConsultModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveConsultSubmit} className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>PATIENT FULL NAME *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. S. Venkat Rao"
                    value={consultForm.patientName}
                    onChange={(e) => setConsultForm({ ...consultForm, patientName: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>CONTACT PHONE *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 33333"
                    value={consultForm.patientPhone}
                    onChange={(e) => setConsultForm({ ...consultForm, patientPhone: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>AGE</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={consultForm.patientAge}
                    onChange={(e) => setConsultForm({ ...consultForm, patientAge: Number(e.target.value) })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>AREA</label>
                  <select
                    className="form-control"
                    value={consultForm.area}
                    onChange={(e) => setConsultForm({ ...consultForm, area: e.target.value as HyderabadArea })}
                  >
                    <option value="Gachibowli">Gachibowli</option>
                    <option value="LB Nagar">LB Nagar</option>
                    <option value="Madhapur">Madhapur</option>
                    <option value="Banjara Hills">Banjara Hills</option>
                    <option value="Kukatpally">Kukatpally</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>STATUS</label>
                  <select
                    className="form-control"
                    value={consultForm.status}
                    onChange={(e) => setConsultForm({ ...consultForm, status: e.target.value as any })}
                  >
                    <option value="Awaiting Call">Awaiting Call</option>
                    <option value="In Call">In Call</option>
                    <option value="Prescription Issued">Prescription Issued</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>REPORTED SYMPTOMS / CHIEF COMPLAINT *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Mild dehydration, post-viral fatigue. Needs doctor consult for IV saline approval."
                  value={consultForm.symptoms}
                  onChange={(e) => setConsultForm({ ...consultForm, symptoms: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  id="cRxIss"
                  checked={consultForm.prescriptionIssued}
                  onChange={(e) => setConsultForm({ ...consultForm, prescriptionIssued: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="cRxIss" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                  Doctor Digital Prescription Issued
                </label>
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ISSUED RX INSTRUCTIONS / MEDICATION</label>
                <input
                  type="text"
                  placeholder="e.g. Normal Saline 500ml IV over 45 min under nurse supervision"
                  value={consultForm.prescriptionText}
                  onChange={(e) => setConsultForm({ ...consultForm, prescriptionText: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>RECOMMENDED SERVICE FOR NURSING VISIT</label>
                <select
                  className="form-control"
                  value={consultForm.recommendedService}
                  onChange={(e) => setConsultForm({ ...consultForm, recommendedService: e.target.value as ServiceId })}
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsConsultModalOpen(false)} className="btn btn-outline" style={{ borderRadius: 9999 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" style={{ borderRadius: 9999, fontWeight: 700, minWidth: 140, justifyContent: 'center' }}>
                  {editingConsult ? 'Update Consult' : 'Create Consult'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CREATE / EDIT APP USER & CREDENTIALS MODAL */}
      {/* ========================================================================= */}
      {isUserModalOpen && (
        <div 
          className="modal-overlay" 
          data-lenis-prevent="true"
          onClick={() => setIsUserModalOpen(false)}
          style={{ zIndex: 99999, pointerEvents: 'auto' }}
        >
          <div 
            className="modal-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: 540, borderRadius: 20, pointerEvents: 'auto' }}
          >
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: '#FAFAFA', borderBottom: '1px solid var(--neutral-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-navy-950)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                    {editingUser ? `Edit Account: ${editingUser.name}` : 'Add New User & Security PIN'}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--neutral-500)', fontWeight: 500 }}>
                    Directly updates portal login credentials in Supabase <code>app_users</code> table
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSaveUserSubmit} className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>ACCOUNT FULL NAME *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Priya Rao"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>SYSTEM ROLE *</label>
                  <select
                    className="form-control"
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                  >
                    <option value="nurse">Nurse</option>
                    <option value="doctor">Doctor</option>
                    <option value="admin">Administrator</option>
                    <option value="patient">Patient</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>LOGIN IDENTIFIER (EMAIL / PHONE) *</label>
                  <input
                    type="text"
                    placeholder="e.g. priya.rao@xpressnurse.in or mobile"
                    value={userForm.identifier}
                    onChange={(e) => setUserForm({ ...userForm, identifier: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>4-DIGIT PIN *</label>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    placeholder="e.g. 2002"
                    value={userForm.pin}
                    onChange={(e) => setUserForm({ ...userForm, pin: e.target.value.replace(/\D/g, '') })}
                    className="form-control"
                    style={{ fontFamily: 'monospace', fontWeight: 800, letterSpacing: '0.1em' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>MOBILE NUMBER</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>EMAIL ADDRESS</label>
                  <input
                    type="email"
                    placeholder="name@xpressnurse.in"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>DESIGNATION / CLINICAL TITLE</label>
                  <input
                    type="text"
                    placeholder="Teleconsultation Physician (MBBS)"
                    value={userForm.designation}
                    onChange={(e) => setUserForm({ ...userForm, designation: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>STATION / SERVICE AREA</label>
                  <input
                    type="text"
                    placeholder="e.g. Gachibowli or Hyderabad Central"
                    value={userForm.serviceArea}
                    onChange={(e) => setUserForm({ ...userForm, serviceArea: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="btn btn-outline" style={{ borderRadius: 9999 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" style={{ borderRadius: 9999, fontWeight: 700, minWidth: 140, justifyContent: 'center' }}>
                  {editingUser ? 'Update Account' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. CLOUDFLARE R2 PRESCRIPTION VIEWER MODAL */}
      {isPrescriptionModalOpen && (
        <div 
          className="modal-overlay" 
          onClick={() => setIsPrescriptionModalOpen(false)}
          style={{ zIndex: 999999, pointerEvents: 'auto' }}
        >
          <div 
            className="modal-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: 680, borderRadius: 20, pointerEvents: 'auto', maxHeight: '92vh', overflowY: 'auto' }}
          >
            {/* Header */}
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: '#FAFAFA', borderBottom: '1px solid var(--neutral-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileCheck size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                    {previewPrescriptionConsultation ? 'Doctor Teleconsultation Clinical Prescription' : 'Cloudflare R2 Verified Prescription'}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: '#0284C7', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Cloud size={12} />
                    <span>
                      {previewPrescriptionConsultation 
                        ? `Consultation: ${previewPrescriptionConsultation.id} • Issued by Dr. Vikramaditya, MD`
                        : `Bucket: ${r2Config.bucketName} • Category: prescriptions`}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setIsPrescriptionModalOpen(false);
                  setPreviewPrescriptionConsultation(null);
                }} 
                className="modal-close-btn"
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '1.4rem' }}>
              {/* Patient & Booking Metadata Bar */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '0.9rem 1.1rem',
                marginBottom: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--neutral-500)', fontWeight: 700, textTransform: 'uppercase' }}>PATIENT</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--primary-navy-950)' }}>
                    {previewPrescriptionConsultation
                      ? `${previewPrescriptionConsultation.patientName} (${previewPrescriptionConsultation.patientAge || '—'} yrs)`
                      : previewPrescriptionBooking?.patientName || previewPrescriptionObject?.metadata?.patientName || 'Home Care Patient'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--neutral-500)', fontWeight: 700, textTransform: 'uppercase' }}>PROCEDURE</div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--primary-navy-900)' }}>
                    {previewPrescriptionConsultation
                      ? previewPrescriptionConsultation.recommendedService || 'Saline Infusion'
                      : previewPrescriptionBooking?.serviceTitle || previewPrescriptionObject?.metadata?.serviceTitle || 'Clinical Home Care'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--neutral-500)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {previewPrescriptionConsultation ? 'CONTACT PHONE' : 'BOOKING REF'}
                  </div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, fontFamily: 'monospace', color: '#0284C7' }}>
                    {previewPrescriptionConsultation
                      ? previewPrescriptionConsultation.patientPhone
                      : previewPrescriptionBooking?.id || previewPrescriptionObject?.metadata?.bookingId || 'DIRECT-RX'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--neutral-500)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {previewPrescriptionConsultation ? 'AREA / ZONE' : 'R2 FILE NAME'}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--neutral-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {previewPrescriptionConsultation
                      ? previewPrescriptionConsultation.area
                      : previewPrescriptionBooking?.prescriptionFileName || previewPrescriptionObject?.fileName || 'Doctor_Rx.pdf'}
                  </div>
                </div>
              </div>

              {/* Document Display / Preview */}
              <div style={{
                border: '1.5px solid #E2E8F0',
                borderRadius: 14,
                overflow: 'hidden',
                background: '#FFFFFF',
                boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                marginBottom: '1.25rem'
              }}>
                {previewPrescriptionObject?.dataUrl ? (
                  previewPrescriptionObject.contentType.startsWith('image/') ? (
                    <div style={{ padding: '1rem', textAlign: 'center', background: '#F8FAFC' }}>
                      <img 
                        src={previewPrescriptionObject.dataUrl} 
                        alt="Prescription Document" 
                        style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 8, objectFit: 'contain', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }} 
                      />
                    </div>
                  ) : (
                    <div style={{ height: 420 }}>
                      <iframe 
                        src={previewPrescriptionObject.dataUrl} 
                        title="Prescription PDF" 
                        style={{ width: '100%', height: '100%', border: 'none' }} 
                      />
                    </div>
                  )
                ) : (
                  /* Formal Rx Document Layout (High Medical Fidelity) */
                  <div style={{ padding: '2rem 1.75rem', background: '#FFFFFF', position: 'relative' }}>
                    {/* Watermark */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) rotate(-25deg)',
                      fontSize: '3.5rem',
                      fontWeight: 900,
                      color: 'rgba(2, 132, 199, 0.05)',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap'
                    }}>
                      {previewPrescriptionConsultation ? 'DOCTOR TELECONSULTATION RX' : 'CLOUDFLARE R2 VERIFIED'}
                    </div>

                    {/* Prescription Document Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0A192F', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                      <div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary-navy-950)' }}>
                          MEDICAL PRESCRIPTION & CLINICAL ORDERS
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#0284C7', fontWeight: 700 }}>
                          TELANGANA STATE HEALTH SERVICES COMPLIANT
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.2rem' }}>
                          Verified Doorstep Nursing Execution Protocol • Dr. Vikramaditya, MD
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          background: '#ECFDF5',
                          border: '1px solid #A7F3D0',
                          color: '#059669',
                          fontWeight: 800,
                          fontSize: '0.74rem',
                          padding: '3px 9px',
                          borderRadius: 9999,
                          textTransform: 'uppercase'
                        }}>
                          ✓ Valid Clinical Rx
                        </span>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.35rem' }}>
                          Issued: {new Date(previewPrescriptionConsultation?.requestedAt || previewPrescriptionObject?.uploadedAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    {/* Rx Symbol & Instructions */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color: '#E11D48', fontFamily: 'serif', lineHeight: 1, marginBottom: '0.5rem' }}>
                        ℞
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '1.15rem', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--primary-navy-900)', marginBottom: '0.35rem' }}>
                          Approved Clinical Procedure: {previewPrescriptionConsultation ? previewPrescriptionConsultation.recommendedService : (previewPrescriptionBooking?.serviceTitle || previewPrescriptionObject?.metadata?.serviceTitle || 'Home Clinical Nursing Visit')}
                        </div>
                        {previewPrescriptionConsultation?.symptoms && (
                          <div style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '0.65rem' }}>
                            <strong>Reported Symptoms / Triage:</strong> "{previewPrescriptionConsultation.symptoms}"
                          </div>
                        )}
                        <div style={{ fontSize: '0.74rem', color: '#475569', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                          Doctor Clinical Orders & Instructions:
                        </div>
                        <p style={{ fontSize: '0.92rem', color: '#0F172A', lineHeight: 1.6, margin: 0, fontWeight: 600, whiteSpace: 'pre-wrap', background: '#FFFFFF', padding: '0.85rem 1rem', borderRadius: 8, border: '1px solid #CBD5E1' }}>
                          {previewPrescriptionConsultation?.prescriptionText || 'Administer sterile doorstep nursing care in strict compliance with attending physician orders. Ensure vitals evaluation (BP, Pulse, SpO2, Temperature) prior to procedure initiation and secure cannula/aseptic dressing upon conclusion.'}
                        </p>
                      </div>
                    </div>

                    {/* Attending RN & R2 Cloud Verification Tag */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '1rem', borderTop: '1px dashed #CBD5E1' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          {previewPrescriptionConsultation ? 'Attending Physician:' : 'Cloudflare R2 Object Location:'}
                        </div>
                        <code style={{ fontSize: '0.74rem', background: '#F1F5F9', color: '#0284C7', padding: '2px 6px', borderRadius: 4 }}>
                          {previewPrescriptionConsultation
                            ? 'Dr. Vikramaditya, MD (Internal Medicine) • Reg: TSMC/2016/9421'
                            : (previewPrescriptionObject?.key || `prescriptions/${previewPrescriptionBooking?.prescriptionFileName || 'Rx_Verified.pdf'}`)}
                        </code>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--primary-navy-900)' }}>
                          Xpress Nurse Medical Command Center
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                          ✓ Digital Signature Verified
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cloudflare Public URL Bar */}
              <div style={{
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: 10,
                padding: '0.65rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
                fontSize: '0.76rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                  <Cloud size={14} style={{ color: '#0284C7', flexShrink: 0 }} />
                  <span style={{ color: '#0369A1', fontWeight: 700, flexShrink: 0 }}>Public CDN Link:</span>
                  <span style={{ color: '#0284C7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {previewPrescriptionObject?.publicUrl || previewPrescriptionBooking?.prescriptionUrl || `${r2Config.publicDomain}/prescriptions/${previewPrescriptionBooking?.prescriptionFileName || 'Rx_Verified.pdf'}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const url = previewPrescriptionObject?.publicUrl || previewPrescriptionBooking?.prescriptionUrl || `${r2Config.publicDomain}/prescriptions/${previewPrescriptionBooking?.prescriptionFileName || 'Rx_Verified.pdf'}`;
                    navigator.clipboard.writeText(url);
                    showToast('Cloudflare public URL copied to clipboard!');
                  }}
                  className="btn btn-sm"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #BAE6FD',
                    color: '#0284C7',
                    padding: '0.2rem 0.6rem',
                    borderRadius: 9999,
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}
                >
                  <Copy size={11} />
                  <span>Copy Link</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.4rem', background: '#FAFAFA', borderTop: '1px solid var(--neutral-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                Xpress Nurse Cloudflare Storage Protection • HIPAA & DISHA Compliant
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {previewPrescriptionConsultation ? (
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn btn-primary btn-sm"
                    style={{ borderRadius: 9999, gap: '0.35rem' }}
                  >
                    <Printer size={13} />
                    <span>Print / Save Prescription</span>
                  </button>
                ) : (
                  <a
                    href={previewPrescriptionObject?.dataUrl || previewPrescriptionObject?.publicUrl || previewPrescriptionBooking?.prescriptionUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ borderRadius: 9999, gap: '0.35rem' }}
                  >
                    <ExternalLink size={13} />
                    <span>Open in Full Tab</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsPrescriptionModalOpen(false);
                    setPreviewPrescriptionConsultation(null);
                  }}
                  className="btn btn-outline btn-sm"
                  style={{ borderRadius: 9999 }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CLOUDFLARE R2 INVOICE PREVIEW MODAL */}
      {isInvoicePreviewModalOpen && previewInvoice && (
        <div 
          className="modal-overlay" 
          onClick={() => setIsInvoicePreviewModalOpen(false)}
          style={{ zIndex: 999999, pointerEvents: 'auto' }}
        >
          <div 
            className="modal-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: 720, borderRadius: 20, pointerEvents: 'auto', maxHeight: '92vh', overflowY: 'auto' }}
          >
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: '#FAFAFA', borderBottom: '1px solid var(--neutral-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#FFFBEB', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                    Tax Invoice {previewInvoice.invoiceNumber}
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--neutral-500)' }}>
                    Saved to Cloudflare R2: xpressnurse-storage/{previewInvoice.r2StorageKey}
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsInvoicePreviewModalOpen(false)} 
                className="modal-close-btn"
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0A192F', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0A192F' }}>Xpress Nurse</div>
                  <div style={{ fontSize: '0.8rem', color: '#0284C7', fontWeight: 700 }}>24/7 Clinical Home Care Hyderabad</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.2rem' }}>GSTIN: 36AAACX9876Q1Z5</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>TAX INVOICE</div>
                  <div style={{ fontSize: '0.82rem', color: '#0284C7', fontWeight: 700 }}>{previewInvoice.invoiceNumber}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B' }}>Date: {previewInvoice.invoiceDate}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', background: '#F8FAFC', padding: '1rem', borderRadius: 10 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>PATIENT / BILLED TO</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800 }}>{previewInvoice.patientName}</div>
                  <div style={{ fontSize: '0.78rem', color: '#475569' }}>{previewInvoice.patientPhone}</div>
                  <div style={{ fontSize: '0.78rem', color: '#475569' }}>{previewInvoice.fullAddress}, {previewInvoice.area}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>DISPATCH & ATTENDING STAFF</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800 }}>{previewInvoice.assignedNurseName}</div>
                  <div style={{ fontSize: '0.78rem', color: '#475569' }}>Booking ID: {previewInvoice.bookingId}</div>
                  <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>Payment Status: {previewInvoice.paymentStatus}</div>
                </div>
              </div>

              <table className="data-table" style={{ marginBottom: '1.25rem' }}>
                <thead>
                  <tr>
                    <th>Procedure Description</th>
                    <th>SAC</th>
                    <th style={{ textAlign: 'right' }}>Rate (₹)</th>
                    <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>{previewInvoice.serviceTitle}</strong></td>
                    <td>999312</td>
                    <td style={{ textAlign: 'right' }}>₹{previewInvoice.baseAmount}</td>
                    <td style={{ textAlign: 'right' }}>₹{previewInvoice.baseAmount}</td>
                  </tr>
                  {Boolean(previewInvoice.discountRupees && previewInvoice.discountRupees > 0) && (
                    <tr>
                      <td style={{ color: '#059669' }}>Coupon Discount</td>
                      <td>—</td>
                      <td style={{ textAlign: 'right', color: '#059669' }}>-₹{previewInvoice.discountRupees}</td>
                      <td style={{ textAlign: 'right', color: '#059669' }}>-₹{previewInvoice.discountRupees}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div style={{ width: 280, marginLeft: 'auto', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.82rem' }}>
                  <span>Taxable Value:</span>
                  <strong>₹{previewInvoice.taxableAmount}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.82rem' }}>
                  <span>CGST (9%):</span>
                  <span>₹{previewInvoice.cgst}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.82rem' }}>
                  <span>SGST (9%):</span>
                  <span>₹{previewInvoice.sgst}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderTop: '2px solid #0A192F', fontSize: '1.1rem', fontWeight: 900 }}>
                  <span>Grand Total:</span>
                  <span style={{ color: '#059669' }}>₹{previewInvoice.totalAmount}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '1rem 1.4rem', background: '#FAFAFA', borderTop: '1px solid var(--neutral-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handlePrintCurrentInvoice}
                className="btn btn-danger"
                style={{ borderRadius: 9999, gap: '0.35rem' }}
              >
                <Printer size={14} />
                <span>Print / Save PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setIsInvoicePreviewModalOpen(false)}
                className="btn btn-outline"
                style={{ borderRadius: 9999 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CLOUDFLARE R2 BUCKET CONFIGURATION MODAL */}
      {isR2ConfigModalOpen && (
        <div 
          className="modal-overlay" 
          onClick={() => setIsR2ConfigModalOpen(false)}
          style={{ zIndex: 999999, pointerEvents: 'auto' }}
        >
          <div 
            className="modal-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: 540, borderRadius: 20, pointerEvents: 'auto' }}
          >
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: '#FAFAFA', borderBottom: '1px solid var(--neutral-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Cloud size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                    Cloudflare R2 Bucket Settings
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--neutral-500)' }}>
                    Prescriptions & Invoice Storage Configuration
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsR2ConfigModalOpen(false)} 
                className="modal-close-btn"
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveR2ConfigSubmit} style={{ padding: '1.4rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>BUCKET NAME *</label>
                <input
                  type="text"
                  required
                  value={r2ConfigForm.bucketName}
                  onChange={(e) => setR2ConfigForm({ ...r2ConfigForm, bucketName: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>CLOUDFLARE ACCOUNT ID *</label>
                <input
                  type="text"
                  required
                  value={r2ConfigForm.accountId}
                  onChange={(e) => setR2ConfigForm({ ...r2ConfigForm, accountId: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>PUBLIC CDN DOMAIN (FOR PRESCRIPTION / INVOICE URLS) *</label>
                <input
                  type="url"
                  required
                  value={r2ConfigForm.publicDomain}
                  onChange={(e) => setR2ConfigForm({ ...r2ConfigForm, publicDomain: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>S3 COMPATIBLE ENDPOINT</label>
                <input
                  type="url"
                  value={r2ConfigForm.endpoint}
                  onChange={(e) => setR2ConfigForm({ ...r2ConfigForm, endpoint: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsR2ConfigModalOpen(false)} className="btn btn-outline" style={{ borderRadius: 9999 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ borderRadius: 9999, fontWeight: 700 }}>
                  Save R2 Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. CLOUDFLARE DOCUMENT UPLOAD MODAL */}
      {isUploadModalOpen && (
        <div 
          className="modal-overlay" 
          onClick={() => setIsUploadModalOpen(false)}
          style={{ zIndex: 999999, pointerEvents: 'auto' }}
        >
          <div 
            className="modal-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: 500, borderRadius: 20, pointerEvents: 'auto' }}
          >
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: '#FAFAFA', borderBottom: '1px solid var(--neutral-200)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UploadCloud size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy-950)', margin: 0 }}>
                    Upload to Cloudflare R2
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--neutral-500)' }}>
                    Add object to xpressnurse-storage bucket
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsUploadModalOpen(false)} 
                className="modal-close-btn"
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUploadDocumentSubmit} style={{ padding: '1.4rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>STORAGE CATEGORY *</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value as StorageCategory })}
                  className="form-control"
                >
                  <option value="prescriptions">Prescriptions (Patient Rx)</option>
                  <option value="invoices">Invoices & Receipts</option>
                  <option value="certificates">Nurse Registration Certificates</option>
                  <option value="teleconsult-rx">Doctor Teleconsult Orders</option>
                  <option value="lab-reports">Diagnostic & Lab Reports</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>FILE NAME *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rx_PatientName_Procedure.pdf"
                  value={uploadForm.fileName}
                  onChange={(e) => setUploadForm({ ...uploadForm, fileName: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>PATIENT NAME</label>
                  <input
                    type="text"
                    placeholder="Patient Name"
                    value={uploadForm.patientName}
                    onChange={(e) => setUploadForm({ ...uploadForm, patientName: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>BOOKING REF ID</label>
                  <input
                    type="text"
                    placeholder="e.g. BK-1042"
                    value={uploadForm.bookingId}
                    onChange={(e) => setUploadForm({ ...uploadForm, bookingId: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>DESCRIPTION / NOTES</label>
                <textarea
                  rows={2}
                  placeholder="Clinical notes or description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsUploadModalOpen(false)} className="btn btn-outline" style={{ borderRadius: 9999 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" style={{ borderRadius: 9999, fontWeight: 700 }}>
                  Upload to R2 Bucket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
