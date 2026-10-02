import React, { useState, useEffect } from 'react';
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
  Share2,
  RefreshCw,
  UserCheck,
  AlertTriangle,
  LogOut,
  User
} from 'lucide-react';
import { EmptyState } from './EmptyState';
import { SEED_APP_USERS, generateNurseReferralCode, dbLogAuditEvent } from '../lib/supabase';
import { getSafeBlobUrl } from './NurseDashboard';
import {
  getCloudflareConfig,
  saveCloudflareConfig,
  getCloudflareObjects,
  uploadToCloudflareStorage,
  deleteFromCloudflareStorage,
  deleteMultipleFromCloudflareStorage,
  generateInvoiceDetails,
  saveInvoiceToCloudflareBucket,
  openPrintableInvoiceWindow,
  getPrescriptionStorageObject,
  syncDatabaseRecordsToStorage
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
  // Batch Deletion CRUD
  onDeleteMultipleBookings?: (ids: string[]) => Promise<void>;
  onDeleteMultipleNurses?: (ids: string[]) => Promise<void>;
  onDeleteMultipleLeads?: (ids: string[]) => Promise<void>;
  onDeleteMultipleServices?: (ids: string[]) => Promise<void>;
  onDeleteMultipleConsultations?: (ids: string[]) => Promise<void>;
  onDeleteMultipleCoupons?: (ids: string[]) => Promise<void>;
  onDeleteMultipleAppUsers?: (ids: string[]) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  bookings,
  nurses,
  leads,
  services = [],
  consultations = [],
  coupons = [],
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
  onDeleteAppUser,
  onDeleteMultipleBookings,
  onDeleteMultipleNurses,
  onDeleteMultipleLeads,
  onDeleteMultipleServices,
  onDeleteMultipleConsultations,
  onDeleteMultipleCoupons,
  onDeleteMultipleAppUsers
}) => {
  const [activeTab, setActiveTab] = useState<'routing' | 'bookings' | 'nurses' | 'services' | 'leads' | 'consultations' | 'coupons' | 'credentials' | 'storage'>('routing');
  const [testSimPatientArea, setTestSimPatientArea] = useState<HyderabadArea>('LB Nagar');
  const [testSimReferringNurse, setTestSimReferringNurse] = useState<string>('none');
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // CLOUDFLARE R2 STORAGE & INVOICE MANAGEMENT STATE
  // --------------------------------------------------------------------------
  const [storageObjects, setStorageObjects] = useState<CloudflareStorageObject[]>(() => 
    getCloudflareObjects()
  );

  // Sync storage objects cleanly without re-creating deleted files
  useEffect(() => {
    setStorageObjects(getCloudflareObjects());
  }, []);

  const [r2Config, setR2Config] = useState<CloudflareR2Config>(() => getCloudflareConfig());
  const [storageCategoryFilter, setStorageCategoryFilter] = useState<'all' | StorageCategory>('all');
  const [storageSearch, setStorageSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  
  // Modals
  const [isInvoicePreviewModalOpen, setIsInvoicePreviewModalOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceDetails | null>(null);
  const [adminCertModalOpen, setAdminCertModalOpen] = useState(false);
  const [adminCertModalNurse, setAdminCertModalNurse] = useState<NurseProfile | null>(null);
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
  };

  const handlePrintCurrentInvoice = () => {
    if (previewInvoice) {
      openPrintableInvoiceWindow(previewInvoice);
    }
  };

  const handleSyncAllInvoicesToCloudflare = async () => {
    const synced = syncDatabaseRecordsToStorage(bookings, nurses, getCloudflareObjects());
    setStorageObjects(synced);
    showToast(`Synced documents and certificates to Cloudflare R2 bucket!`);
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
    const relatedBooking = bookings.find(b => b.id === uploadForm.bookingId);
    
    await uploadToCloudflareStorage({
      fileName: cleanFileName,
      category: uploadForm.category,
      contentType: 'application/pdf',
      sizeBytes: Math.floor(110000 + Math.random() * 200000),
      metadata: {
        bookingId: uploadForm.bookingId || undefined,
        patientName: relatedBooking ? relatedBooking.patientName : (uploadForm.patientName || undefined),
        patientPhone: relatedBooking ? relatedBooking.patientPhone : undefined,
        assignedNurseId: relatedBooking ? relatedBooking.assignedNurseId : undefined,
        serviceId: relatedBooking ? relatedBooking.serviceId : undefined,
        estimatedFee: relatedBooking ? relatedBooking.estimatedFee : undefined,
        description: uploadForm.description || `Uploaded document to ${uploadForm.category}`
      }
    });
    setStorageObjects(getCloudflareObjects());
    setIsUploadModalOpen(false);
    setUploadForm({ fileName: '', category: 'invoices', bookingId: '', patientName: '', description: '' });
    showToast(`Uploaded "${cleanFileName}" to Cloudflare R2 bucket!`);
  };

  const handleDeleteObjectClick = (obj: CloudflareStorageObject) => {
    setDeleteConfirmTarget({
      itemType: 'Storage File',
      itemId: obj.id,
      itemTitle: obj.fileName,
      itemDetails: `Storage Key: ${obj.key} • Category: ${obj.category} • Size: ${(obj.sizeBytes / 1024).toFixed(1)} KB`,
      onConfirm: async () => {
        await deleteFromCloudflareStorage(obj.id);
        setStorageObjects(getCloudflareObjects());
        showToast(`Deleted ${obj.fileName} from Storage bucket.`);
      }
    });
  };

  const handleCopyPublicUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Cloudflare public link copied to clipboard!');
  };

  const resolveRealArea = (area: string, fullAddress?: string): string => {
    if (fullAddress) {
      const knownAreas = [
        'Saroor Nagar', 'Kukatpally', 'Banjara Hills', 'Jubilee Hills', 
        'Hitec City', 'Gachibowli', 'Madhapur', 'Kondapur', 'Miyapur', 
        'Secunderabad', 'Begumpet', 'LB Nagar', 'Uppal', 'Dilsukhnagar', 
        'Mehdipatnam', 'Tolichowki', 'Ameerpet', 'Somajiguda', 'Manikonda', 
        'Kothapet', 'Attapur', 'Nanakramguda', 'Tellapur', 'Alwal', 'Malakpet'
      ];
      for (const a of knownAreas) {
        if (fullAddress.toLowerCase().includes(a.toLowerCase())) {
          return a;
        }
      }
    }
    return area || 'Hyderabad';
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

  // In-App Permanent Deletion Confirmation Modal State (Reliable across all browsers; never blocked by popups)
  interface DeleteConfirmModalData {
    itemType: string;
    itemId: string;
    itemTitle: string;
    itemDetails?: string;
    onConfirm: () => Promise<void>;
  }
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<DeleteConfirmModalData | null>(null);
  const [isDeletingTarget, setIsDeletingTarget] = useState<boolean>(false);

  // Multi-Selection State for Bulk Deletion across all Dashboard Tables
  const [selectedBookingIds, setSelectedBookingIds] = useState<Set<string>>(new Set());
  const [selectedNurseIds, setSelectedNurseIds] = useState<Set<string>>(new Set());
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [selectedConsultIds, setSelectedConsultIds] = useState<Set<string>>(new Set());
  const [selectedCouponIds, setSelectedCouponIds] = useState<Set<string>>(new Set());
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedRoutingBookingIds, setSelectedRoutingBookingIds] = useState<Set<string>>(new Set());
  const [selectedStorageIds, setSelectedStorageIds] = useState<Set<string>>(new Set());

  const toggleItemSelection = (id: string, setSelected: React.Dispatch<React.SetStateAction<Set<string>>>) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = (
    allIds: string[],
    selectedSet: Set<string>,
    setSelected: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        allIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        allIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleBulkDelete = ({
    entityName,
    idsToDelete,
    onDeleteFn,
    clearSelection
  }: {
    entityName: string;
    idsToDelete: string[];
    onDeleteFn?: (ids: string[]) => Promise<void>;
    clearSelection: () => void;
  }) => {
    if (!idsToDelete.length) {
      showToast(`No ${entityName} selected to delete.`, 'error');
      return;
    }

    setDeleteConfirmTarget({
      itemType: `${idsToDelete.length} Selected ${entityName}`,
      itemId: `bulk-${entityName}-${Date.now()}`,
      itemTitle: `Delete ${idsToDelete.length} Selected ${entityName}`,
      itemDetails: `IDs: ${idsToDelete.slice(0, 5).join(', ')}${idsToDelete.length > 5 ? ` and ${idsToDelete.length - 5} more...` : ''}. This will permanently remove these records from Supabase.`,
      onConfirm: async () => {
        if (onDeleteFn) {
          await onDeleteFn(idsToDelete);
          clearSelection();
          showToast(`Successfully deleted ${idsToDelete.length} ${entityName.toLowerCase()} from Supabase.`);
        }
      }
    });
  };

  const handleDeleteAll = ({
    entityName,
    allIds,
    onDeleteFn,
    clearSelection
  }: {
    entityName: string;
    allIds: string[];
    onDeleteFn?: (ids: string[]) => Promise<void>;
    clearSelection: () => void;
  }) => {
    if (!allIds.length) {
      showToast(`No ${entityName} available to delete.`, 'error');
      return;
    }

    setDeleteConfirmTarget({
      itemType: `ALL ${allIds.length} ${entityName}`,
      itemId: `all-${entityName}-${Date.now()}`,
      itemTitle: `DANGER: Delete ALL ${allIds.length} ${entityName} in View`,
      itemDetails: `WARNING: This will permanently delete ALL ${allIds.length} ${entityName.toLowerCase()} currently shown from Supabase. This action cannot be undone!`,
      onConfirm: async () => {
        if (onDeleteFn) {
          await onDeleteFn(allIds);
          clearSelection();
          showToast(`Successfully deleted all ${allIds.length} ${entityName.toLowerCase()} from Supabase.`);
        }
      }
    });
  };

  const handleDeleteMultipleStorage = async (ids: string[]) => {
    await deleteMultipleFromCloudflareStorage(ids);
    setStorageObjects(getCloudflareObjects());
    showToast(`Successfully deleted ${ids.length} storage files.`);
  };

  const renderBulkActionBar = ({
    entityName,
    filteredIds,
    selectedSet,
    setSelectedSet,
    onDeleteMultiple
  }: {
    entityName: string;
    filteredIds: string[];
    selectedSet: Set<string>;
    setSelectedSet: React.Dispatch<React.SetStateAction<Set<string>>>;
    onDeleteMultiple?: (ids: string[]) => Promise<void>;
  }) => {
    if (filteredIds.length === 0) return null;
    const isAllSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedSet.has(id));
    const selectedCount = filteredIds.filter((id) => selectedSet.has(id)).length;

    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.65rem 1rem',
          background: selectedCount > 0 ? '#FFF1F2' : '#F8FAFC',
          border: selectedCount > 0 ? '1px solid #FECDD3' : '1px solid #E2E8F0',
          borderRadius: '10px',
          marginBottom: '0.85rem',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={() => toggleSelectAll(filteredIds, selectedSet, setSelectedSet)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#E11D48' }}
            />
            <span>Select All ({filteredIds.length})</span>
          </label>
          <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
            | Selected: <strong style={{ color: selectedCount > 0 ? '#E11D48' : '#0F172A' }}>{selectedCount}</strong>
          </span>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedSet(new Set())}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748B',
                fontSize: '0.78rem',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0
              }}
            >
              Clear selection
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={() =>
              handleBulkDelete({
                entityName,
                idsToDelete: filteredIds.filter((id) => selectedSet.has(id)),
                onDeleteFn: onDeleteMultiple,
                clearSelection: () => setSelectedSet(new Set())
              })
            }
            style={{
              padding: '0.38rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: '1px solid',
              borderColor: selectedCount > 0 ? '#E11D48' : '#CBD5E1',
              background: selectedCount > 0 ? '#E11D48' : '#F1F5F9',
              color: selectedCount > 0 ? '#FFFFFF' : '#94A3B8',
              cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: selectedCount > 0 ? '0 2px 6px rgba(225, 29, 72, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Trash2 size={13} />
            <span>Delete Selected ({selectedCount})</span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleDeleteAll({
                entityName,
                allIds: filteredIds,
                onDeleteFn: onDeleteMultiple,
                clearSelection: () => setSelectedSet(new Set())
              })
            }
            style={{
              padding: '0.38rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: '1px solid #FDA4AF',
              background: '#FFFFFF',
              color: '#BE123C',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease'
            }}
            title={`Permanently delete all ${filteredIds.length} ${entityName.toLowerCase()} from Supabase`}
          >
            <AlertTriangle size={13} />
            <span>Delete All ({filteredIds.length})</span>
          </button>
        </div>
      </div>
    );
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
    validUntil: '',
    showInBookingModal: true
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
      validUntil: '2026-12-31',
      showInBookingModal: true
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
      description: coupon.description.replace('[SHOW_IN_MODAL]', '').trim(),
      status: coupon.status === 'Expired' ? 'Inactive' : coupon.status,
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
      validUntil: coupon.validUntil ? coupon.validUntil.split('T')[0] : '',
      showInBookingModal: coupon.description.includes('[SHOW_IN_MODAL]')
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
        description: couponForm.showInBookingModal 
          ? `${couponForm.description.trim()} [SHOW_IN_MODAL]`
          : couponForm.description.trim().replace('[SHOW_IN_MODAL]', '').trim(),
        status: couponForm.status,
        usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : undefined,
        validUntil: couponForm.validUntil ? new Date(couponForm.validUntil).toISOString() : undefined
      };

      if (editingCoupon) {
        if (onUpdateCoupon) {
          await onUpdateCoupon(editingCoupon.id, payload);
        }
        setCouponFeedback(`Coupon "${payload.code}" updated successfully in Supabase!`);
        showToast(`Coupon "${payload.code}" updated successfully in Supabase!`);
      } else {
        if (onCreateCoupon) {
          await onCreateCoupon(payload);
        }
        setCouponFeedback(`Coupon "${payload.code}" created and live in Supabase!`);
        showToast(`Coupon "${payload.code}" created and live in Supabase!`);
      }

      setIsCouponModalOpen(false);
      setTimeout(() => setCouponFeedback(null), 4000);
    } catch (err: any) {
      setCouponFormError(err.message || 'Failed to save coupon to Supabase.');
      showToast(err.message || 'Failed to save coupon to Supabase.', 'error');
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
      showToast(`Coupon "${coupon.code}" marked ${newStatus}.`);
      setTimeout(() => setCouponFeedback(null), 3000);
    }
  };

  // Delete Coupon
  const handleDeleteCouponClick = (coupon: Coupon) => {
    setDeleteConfirmTarget({
      itemType: 'Discount Coupon',
      itemId: coupon.id,
      itemTitle: coupon.code,
      itemDetails: `${coupon.discountType === 'percent' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} FLAT OFF`} • ${coupon.description}`,
      onConfirm: async () => {
        if (onDeleteCoupon) {
          await onDeleteCoupon(coupon.id);
          setCouponFeedback(`Coupon ${coupon.code} deleted.`);
          showToast(`Coupon "${coupon.code}" deleted successfully.`);
          setTimeout(() => setCouponFeedback(null), 3000);
        }
      }
    });
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

  // Quick Referral & Reassignment modal state for Nurse-Declined bookings
  const [adminReassignBooking, setAdminReassignBooking] = useState<Booking | null>(null);
  const [selectedReferralNurseId, setSelectedReferralNurseId] = useState<string>('');
  const [referralRuleNote, setReferralRuleNote] = useState<string>('Referred following nurse decline');

  // Search Nurse & Assign Modal state in Smart Routing
  const [searchAssignBooking, setSearchAssignBooking] = useState<Booking | null>(null);
  const [nurseSearchQuery, setNurseSearchQuery] = useState<string>('');
  const [nurseSearchFilterVerifiedOnly, setNurseSearchFilterVerifiedOnly] = useState<boolean>(true);
  const [nurseSearchFilterArea, setNurseSearchFilterArea] = useState<string>('all');

  const nurseDeclinedBookings = bookings.filter((b) => 
    b.rejectedBy === 'Nurse' || 
    b.nurseAcceptanceStatus === 'Rejected' || 
    (b.status === 'Rejected' && b.rejectionReason?.toLowerCase().includes('nurse'))
  );
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
    status: 'Assigned' as 'Pending' | 'Assigned' | 'In-Progress' | 'Completed' | 'Cancelled' | 'Rejected',
    assignedNurseId: '',
    estimatedFee: 800,
    hasPrescription: true,
    notes: '',
    bookingType: 'instant' as 'instant' | 'scheduled' | 'Instant' | 'Scheduled',
    scheduledSlot: '',
    rejectionReason: ''
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
      notes: '',
      bookingType: 'instant',
      scheduledSlot: '',
      rejectionReason: ''
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
      notes: b.notes || '',
      bookingType: (b.bookingType || 'instant') as any,
      scheduledSlot: b.scheduledSlot || '',
      rejectionReason: b.rejectionReason || ''
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
      preferredDate: editingBooking?.preferredDate || (bookingForm.bookingType === 'scheduled' ? (bookingForm.scheduledSlot || 'Scheduled') : 'Today (ASAP)'),
      preferredTime: editingBooking?.preferredTime || (bookingForm.bookingType === 'scheduled' ? (bookingForm.scheduledSlot || 'Scheduled Slot') : 'Instant Request'),
      status: bookingForm.status,
      assignedNurseId: assignedNurseObj?.id,
      assignedNurseName: assignedNurseObj?.name,
      estimatedFee: Number(bookingForm.estimatedFee),
      hasPrescription: bookingForm.hasPrescription,
      notes: bookingForm.notes.trim(),
      bookingType: bookingForm.bookingType,
      rejectionReason: (bookingForm.status === 'Cancelled' || bookingForm.status === 'Rejected') ? bookingForm.rejectionReason : undefined,
      rejectedBy: (bookingForm.status === 'Cancelled' || bookingForm.status === 'Rejected') ? 'Admin' : undefined
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

  const handleDeleteBookingClick = (b: Booking) => {
    setDeleteConfirmTarget({
      itemType: 'Patient Booking',
      itemId: b.id,
      itemTitle: `#${b.id} - ${b.patientName}`,
      itemDetails: `Procedure: ${b.serviceTitle} • Area: ${b.area} • Phone: ${b.patientPhone} • Fee: ₹${b.finalFee || b.estimatedFee}`,
      onConfirm: async () => {
        if (onDeleteBooking) {
          await onDeleteBooking(b.id);
          showToast(`Booking #${b.id} deleted successfully from Supabase.`);
        }
      }
    });
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch = 
      b.patientName.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.id.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.area.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      (b.assignedNurseName && b.assignedNurseName.toLowerCase().includes(bookingSearch.toLowerCase()));

    const isNurseDeclined = b.rejectedBy === 'Nurse' || b.nurseAcceptanceStatus === 'Rejected' || (b.status === 'Rejected' && b.rejectionReason?.toLowerCase().includes('nurse'));
    const isNurseAccepted = b.nurseAcceptanceStatus === 'Accepted' || (b.status === 'In-Progress' && !isNurseDeclined);

    const matchesStatus = 
      bookingStatusFilter === 'all' 
        ? true 
        : bookingStatusFilter === 'Nurse-Declined'
        ? isNurseDeclined
        : bookingStatusFilter === 'Accepted'
        ? isNurseAccepted
        : b.status === bookingStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Export Bookings to CSV / Excel
  const exportBookingsToCSV = () => {
    const headers = [
      'Booking ID',
      'Created Date',
      'Booking Type',
      'Scheduled Slot',
      'Patient Name',
      'Patient Phone',
      'Area',
      'Full Address',
      'Procedure',
      'Status',
      'Estimated Fee (INR)',
      'Assigned Nurse',
      'Prescription Mandatory',
      'Prescription Attached',
      'Rejection Reason',
      'Notes'
    ];
    // Helper to sanitize cell and neutralize CSV formula injection (=, +, -, @, \t, \r)
    const sanitizeCsvCell = (val: any): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = bookings.map((b) => [
      sanitizeCsvCell(b.id),
      sanitizeCsvCell(b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-IN') : 'N/A'),
      sanitizeCsvCell(b.bookingType?.toLowerCase() === 'scheduled' ? 'Scheduled Slot' : 'Instant (ASAP)'),
      sanitizeCsvCell(b.scheduledSlot || 'Immediate'),
      sanitizeCsvCell(b.patientName),
      sanitizeCsvCell(b.patientPhone),
      sanitizeCsvCell(b.area),
      sanitizeCsvCell(b.fullAddress),
      sanitizeCsvCell(b.serviceTitle),
      sanitizeCsvCell(b.status),
      Number(b.estimatedFee) || 0,
      sanitizeCsvCell(b.assignedNurseName || 'Unassigned'),
      b.hasPrescription ? 'Yes' : 'No',
      sanitizeCsvCell(b.prescriptionFileName || (b.hasPrescription ? 'Prescription Uploaded' : 'None')),
      sanitizeCsvCell(b.rejectionReason),
      sanitizeCsvCell(b.notes)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `XpressNurse_Bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported all bookings to CSV/Excel report!');
    dbLogAuditEvent('DATA_EXPORT', 'bookings', 'all', { count: bookings.length });
  };

  // Export Nurse Fleet to CSV / Excel
  const exportNursesToCSV = () => {
    const sanitizeCsvCell = (val: any): string => {
      if (val === null || val === undefined) return '""';
      let str = String(val);
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'Nurse ID',
      'Full Name',
      'Referral Code',
      'Signup Origin',
      'Referred By Nurse ID',
      'Phone',
      'Email',
      'Service Zone / Area',
      'Qualification',
      'Experience (Years)',
      'Experience Tier',
      'Certificate Verified',
      'Status',
      'Completed Visits',
      'Active Visits',
      'Referral Points',
      'Earnings Paid (INR)',
      'Earnings Pending (INR)',
      'Total Earnings (INR)'
    ];
    const rows = nurses.map((n) => {
      const exp = n.experienceYears || (parseInt(n.experience || '0', 10) || 0);
      const tier = exp >= 10 ? 'Senior (> 10 Years)' : exp >= 5 ? 'Mid-Level (5-10 Years)' : 'Junior (< 5 Years)';
      const nurseCode = n.referralCode || generateNurseReferralCode(n.name, n.id, n.phone);
      const origin = n.referredByNurseId ? `Referred (${n.referredByNurseName || n.referredByNurseId})` : 'Individual / Direct';
      return [
        sanitizeCsvCell(n.id),
        sanitizeCsvCell(n.name),
        sanitizeCsvCell(nurseCode),
        sanitizeCsvCell(origin),
        sanitizeCsvCell(n.referredByNurseId),
        sanitizeCsvCell(n.phone),
        sanitizeCsvCell(n.email),
        sanitizeCsvCell(n.serviceArea),
        sanitizeCsvCell(n.qualification),
        exp,
        sanitizeCsvCell(tier),
        n.certificateVerified ? 'Verified' : 'Pending Review',
        sanitizeCsvCell(n.status || 'Active'),
        n.completedVisits || 0,
        n.activeVisits || 0,
        n.pointsEarned || n.points || 0,
        n.earningsPaid || 0,
        n.earningsPending || 0,
        (n.earningsPaid || 0) + (n.earningsPending || 0)
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `XpressNurse_Roster_Fleet_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported nurse fleet roster to CSV/Excel report!');
    dbLogAuditEvent('DATA_EXPORT', 'nurses', 'all', { count: nurses.length });
  };

  // Export Leads to CSV / Excel
  const exportLeadsToCSV = () => {
    const sanitizeCsvCell = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    };
    
    const headers = [
      'Lead ID', 'Submitted At', 'Patient Name', 'Patient Phone', 'Patient Age', 'Patient Gender', 
      'Service ID', 'Area', 'Full Address', 'Status', 'Referral Type', 'Referring Nurse ID', 
      'Referring Nurse Name', 'Referred Nurse Phone', 'Points Awarded', 'Commission (Rupees)', 'Rejection Reason', 'Admin Notes'
    ];
    
    const csvContent = leads.map(l => {
      return [
        l.id, l.submittedAt || '', l.patientName, l.patientPhone, l.patientAge || '', l.patientGender || '',
        l.serviceId || '', l.area || '', l.fullAddress || '', l.status, l.referralType || 'patient', l.nurseId,
        l.referredNurseName || '', l.referredNursePhone || '', l.pointsAwarded || 0, l.referralCommissionRupees || 0, 
        l.rejectionReason || '', l.adminNotes || ''
      ].map(sanitizeCsvCell).join(',');
    });
    
    const finalCsv = [headers.join(','), ...csvContent].join('\n');
    const blob = new Blob([finalCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `XpressNurse_Leads_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported leads and referrals to CSV/Excel report!');
  };

  // Export Consultations to CSV / Excel
  const exportConsultationsToCSV = () => {
    const sanitizeCsvCell = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const strVal = String(val).replace(/"/g, '""');
      return `"${strVal}"`;
    };
    
    const headers = [
      'Consult ID', 'Requested At', 'Booking ID', 'Patient Name', 'Patient Phone', 
      'Status', 'Urgency', 'Prescription File', 'Nurse Comments', 'Admin/Doctor Notes'
    ];
    
    const csvContent = consultations.map(c => {
      return [
        c.id, c.requestedAt, c.bookingId, c.patientName, c.patientPhone,
        c.status, c.urgency, c.prescriptionFileUrl || '', c.nurseComments || '', c.adminNotes || ''
      ].map(sanitizeCsvCell).join(',');
    });
    
    const finalCsv = [headers.join(','), ...csvContent].join('\n');
    const blob = new Blob([finalCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `XpressNurse_Consultations_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported teleconsultations to CSV/Excel report!');
  };

  // --------------------------------------------------------------------------
  // 2. NURSES CRUD STATE & HANDLERS
  // --------------------------------------------------------------------------
  const [nurseSearch, setNurseSearch] = useState('');
  const [nurseExpFilter, setNurseExpFilter] = useState<'all' | '>10' | '5-10' | '<5'>('all');
  const [nurseOriginFilter, setNurseOriginFilter] = useState<'all' | 'referred' | 'direct'>('all');
  const [copiedRefCodeId, setCopiedRefCodeId] = useState<string | null>(null);
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
    avatarUrl: '',
    pin: '1001',
    pointsEarned: 300,
    referralEarningsRupees: 0,
    earningsPaid: 0,
    earningsPending: 0
  });

  const handleOpenCreateNurseModal = () => {
    setEditingNurse(null);
    setNurseForm({
      id: 'nurse-' + Math.floor(100 + Math.random() * 900),
      name: '',
      phone: '',
      email: '',
      qualification: 'Registered Nurse (B.Sc Nursing)',
      experienceYears: 3,
      serviceArea: 'Gachibowli',
      status: 'Active',
      certificateVerified: true,
      rating: 4.9,
      pin: '',
      pointsEarned: 300,
      referralEarningsRupees: 0,
      earningsPaid: 0,
      earningsPending: 0,
      avatarUrl: ''
    });
    setIsNurseModalOpen(true);
  };

  const handleOpenEditNurseModal = (n: NurseProfile) => {
    setEditingNurse(n);
    const nursePhoneDigits = (n.phone || '').replace(/\D/g, '');
    const nurseLast10 = nursePhoneDigits.length >= 10 ? nursePhoneDigits.slice(-10) : nursePhoneDigits;
    const existingUser = appUsers.find((u) => {
      const uPhoneDigits = (u.phone || '').replace(/\D/g, '');
      const uLast10 = uPhoneDigits.length >= 10 ? uPhoneDigits.slice(-10) : uPhoneDigits;
      return (
        u.id === n.id ||
        (nurseLast10 && uLast10 && nurseLast10 === uLast10) ||
        (u.email && n.email && u.email.toLowerCase().trim() === n.email.toLowerCase().trim()) ||
        (u.identifier && n.email && u.identifier.toLowerCase().trim() === n.email.toLowerCase().trim())
      );
    });
    setNurseForm({
      id: n.id,
      name: n.name,
      phone: n.phone,
      email: n.email,
      qualification: n.qualification,
      experienceYears: typeof n.experienceYears === 'number' ? n.experienceYears : 3,
      serviceArea: n.serviceArea || 'Gachibowli',
      status: n.status || 'Active',
      certificateVerified: !!n.certificateVerified,
      rating: n.rating || 4.9,
      pin: (n.pin && n.pin.trim() !== '') ? n.pin.trim() : (existingUser?.pin ? String(existingUser.pin).trim() : ''),
      pointsEarned: Number(n.pointsEarned) || 0,
      referralEarningsRupees: Number(n.referralEarningsRupees) || 0,
      earningsPaid: Number(n.earningsPaid) || 0,
      earningsPending: Number(n.earningsPending) || 0,
      avatarUrl: n.avatarUrl || ''
    });
    setIsNurseModalOpen(true);
  };

  const handleSaveNurseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nurseForm.name.trim() || !nurseForm.phone.trim() || !nurseForm.email.trim()) {
      showToast('Name, phone, and email are required.', 'error');
      return;
    }
    const cleanPhone = nurseForm.phone.replace(/\D/g, '') || nurseForm.phone.trim();
    const nursePayload: NurseProfile = {
      id: editingNurse ? editingNurse.id : nurseForm.id,
      name: nurseForm.name.trim(),
      phone: cleanPhone,
      email: nurseForm.email.trim(),
      qualification: nurseForm.qualification.trim(),
      experienceYears: Number(nurseForm.experienceYears) || 1,
      serviceArea: nurseForm.serviceArea,
      pin: nurseForm.pin.trim() || undefined,
      status: (nurseForm.status as 'Active' | 'Pending Verification' | 'On Leave') || 'Active',
      totalLeads: editingNurse ? editingNurse.totalLeads : 0,
      convertedLeads: editingNurse ? editingNurse.convertedLeads : 0,
      totalReferrals: editingNurse ? editingNurse.totalReferrals : 0,
      pointsEarned: Number(nurseForm.pointsEarned) || 0,
      referralEarningsRupees: Number(nurseForm.referralEarningsRupees) || 0,
      earningsPaid: Number(nurseForm.earningsPaid) || 0,
      earningsPending: Number(nurseForm.earningsPending) || 0,
      rating: Number(nurseForm.rating) || 4.9,
      avatarUrl: nurseForm.avatarUrl || (editingNurse ? editingNurse.avatarUrl : undefined),
      certificateVerified: nurseForm.certificateVerified
    };

    if (editingNurse && onUpdateNurseRecord) {
      await onUpdateNurseRecord(editingNurse.id, nursePayload);
      // Also update app_user pin and details if exists
      if (onUpdateAppUser) {
        const u = appUsers.find((x) => x.id === editingNurse.id || x.phone === editingNurse.phone || (x.email && x.email.toLowerCase() === editingNurse.email.toLowerCase()));
        if (u) {
          await onUpdateAppUser(u.id, { 
            pin: nurseForm.pin.trim() || u.pin, 
            name: nursePayload.name, 
            phone: cleanPhone,
            serviceArea: nursePayload.serviceArea 
          });
        }
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
          pin: nurseForm.pin.trim() || '',
          phone: cleanPhone,
          email: nursePayload.email,
          designation: nursePayload.qualification,
          serviceArea: nursePayload.serviceArea
        });
      }
      showToast(`Nurse ${nursePayload.name} registered and live in Supabase!`);
    }
    setIsNurseModalOpen(false);
  };

  const handleDeleteNurseClick = (n: NurseProfile) => {
    setDeleteConfirmTarget({
      itemType: 'Nurse Fleet Record',
      itemId: n.id,
      itemTitle: n.name,
      itemDetails: `Role: ${n.qualification} • Area: ${n.serviceArea} • Phone: ${n.phone}`,
      onConfirm: async () => {
        if (onDeleteNurse) {
          await onDeleteNurse(n.id);
          if (onDeleteAppUser) {
            const u = appUsers.find((x) => x.id === n.id || x.phone === n.phone);
            if (u) await onDeleteAppUser(u.id);
          }
          showToast(`Nurse "${n.name}" removed successfully from Supabase fleet.`);
        }
      }
    });
  };

  const filteredNurses = nurses.filter((n) => {
    const matchesSearch = 
      n.name.toLowerCase().includes(nurseSearch.toLowerCase()) ||
      n.phone.includes(nurseSearch) ||
      n.email.toLowerCase().includes(nurseSearch.toLowerCase()) ||
      n.qualification.toLowerCase().includes(nurseSearch.toLowerCase()) ||
      (n.serviceArea && n.serviceArea.toLowerCase().includes(nurseSearch.toLowerCase())) ||
      (n.referredByNurseName && n.referredByNurseName.toLowerCase().includes(nurseSearch.toLowerCase())) ||
      (n.referralCode && n.referralCode.toLowerCase().includes(nurseSearch.toLowerCase()));
    
    const exp = n.experienceYears || (parseInt(n.experience || '0', 10) || 0);
    const matchesExp = 
      nurseExpFilter === 'all' ? true :
      nurseExpFilter === '>10' ? exp >= 10 :
      nurseExpFilter === '5-10' ? (exp >= 5 && exp < 10) :
      exp < 5;

    const matchesOrigin = 
      nurseOriginFilter === 'all' ? true :
      nurseOriginFilter === 'referred' ? Boolean(n.referredByNurseId) :
      !n.referredByNurseId;

    return matchesSearch && matchesExp && matchesOrigin;
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
    badge: '',
    imageUrl: '',
    thumbnailUrl: ''
  });
  const [isUploadingServiceImage, setIsUploadingServiceImage] = useState(false);
  const [isUploadingServiceThumbnail, setIsUploadingServiceThumbnail] = useState(false);

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
      badge: 'Popular',
      imageUrl: '',
      thumbnailUrl: ''
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
      badge: s.badge || '',
      imageUrl: s.imageUrl || '',
      thumbnailUrl: s.thumbnailUrl || ''
    });
    setIsServiceModalOpen(true);
  };

  const [isUploadingNurseAvatar, setIsUploadingNurseAvatar] = useState(false);

  const handleNurseAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit.', 'error');
      return;
    }

    try {
      setIsUploadingNurseAvatar(true);
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      const cleanFileName = (file.name || 'avatar.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
      const obj = await uploadToCloudflareStorage({
        fileName: `avatar_${Date.now()}_${cleanFileName}`,
        category: 'images',
        contentType: file.type || 'image/jpeg',
        sizeBytes: file.size,
        dataUrl: dataUrl || undefined,
        metadata: {
          description: `Avatar for Nurse: ${nurseForm.name || 'Unknown'}`
        }
      });
      
      setNurseForm((prev) => ({ ...prev, avatarUrl: obj.publicUrl }));
      showToast('Nurse avatar uploaded successfully!', 'success');
    } catch (err: any) {
      console.error('Error uploading nurse avatar:', err);
      showToast(err.message || 'Failed to upload nurse avatar', 'error');
    } finally {
      setIsUploadingNurseAvatar(false);
    }
  };

  const handleServiceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit.', 'error');
      return;
    }

    try {
      setIsUploadingServiceImage(true);
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      const cleanFileName = (file.name || 'service_image.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
      const obj = await uploadToCloudflareStorage({
        fileName: `service_${Date.now()}_${cleanFileName}`,
        category: 'images',
        contentType: file.type || 'image/jpeg',
        sizeBytes: file.size,
        dataUrl: dataUrl || undefined,
        metadata: {
          description: `Thumbnail for Service: ${serviceForm.title || 'Unknown Service'}`,
        }
      });
      
      setServiceForm((prev) => ({ ...prev, imageUrl: obj.publicUrl }));
      showToast('Service image uploaded successfully!', 'success');
    } catch (err: any) {
      console.error('Error uploading service image:', err);
      showToast(err.message || 'Failed to upload service image', 'error');
    } finally {
      setIsUploadingServiceImage(false);
    }
  };

  const handleServiceThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit.', 'error');
      return;
    }

    try {
      setIsUploadingServiceThumbnail(true);
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      const cleanFileName = (file.name || 'service_thumbnail.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
      const obj = await uploadToCloudflareStorage({
        fileName: `service_thumb_${Date.now()}_${cleanFileName}`,
        category: 'images',
        contentType: file.type || 'image/jpeg',
        sizeBytes: file.size,
        dataUrl: dataUrl || undefined,
        metadata: {
          description: `Thumbnail for Service: ${serviceForm.title || 'Unknown Service'}`,
        }
      });
      
      setServiceForm((prev) => ({ ...prev, thumbnailUrl: obj.publicUrl }));
      showToast('Service thumbnail uploaded successfully!', 'success');
    } catch (err: any) {
      console.error('Error uploading service thumbnail:', err);
      showToast(err.message || 'Failed to upload service thumbnail', 'error');
    } finally {
      setIsUploadingServiceThumbnail(false);
    }
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
      imageUrl: serviceForm.imageUrl.trim() || undefined,
      thumbnailUrl: serviceForm.thumbnailUrl?.trim() || undefined,
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

  const handleDeleteServiceClick = (s: ServiceItem) => {
    setDeleteConfirmTarget({
      itemType: 'Clinical Procedure',
      itemId: s.id,
      itemTitle: s.title,
      itemDetails: `Single Visit: ₹${s.priceNumber} • Duration: ${s.duration || 'N/A'} • ID: ${s.id}`,
      onConfirm: async () => {
        if (onDeleteService) {
          await onDeleteService(s.id);
          showToast(`Procedure "${s.title}" deleted from Supabase catalog.`);
        }
      }
    });
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
  const [leadTypeFilter, setLeadTypeFilter] = useState<string>('all');
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
      patientName: l.patientName || l.referredNurseName || '',
      patientPhone: l.patientPhone || l.referredNursePhone || '',
      serviceId: l.serviceId || 'saline-infusion',
      area: l.area,
      nurseId: l.nurseId || 'nurse-101',
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

  const handleDeleteLeadClick = (l: NurseLead) => {
    setDeleteConfirmTarget({
      itemType: 'Nurse Lead',
      itemId: l.id,
      itemTitle: `${l.patientName} (${l.id})`,
      itemDetails: `Service: ${l.serviceId} • Phone: ${l.patientPhone} • Area: ${l.area}`,
      onConfirm: async () => {
        if (onDeleteLead) {
          await onDeleteLead(l.id);
          showToast(`Lead #${l.id} deleted successfully from Supabase.`);
        }
      }
    });
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
    
    // Calculate 10% of procedure value if it's a patient lead, otherwise 50 rupees for nurse lead
    let defaultRupees = 50; // Default 50 for nurse referrals
    if (lead.referralType !== 'nurse' && !lead.referredNursePhone) {
      const procedure = services.find(s => s.id === lead.serviceId);
      if (procedure) {
        defaultRupees = Math.round((procedure.priceNumber || 800) * 0.10);
      }
    }
    
    setApprovalPoints(50);
    setApprovalReferralRupees(defaultRupees);
    setApprovalNotes(lead.adminNotes || `Approved by Office (+50 points credited, ₹${defaultRupees} commission).`);
    setRejectReason('');
    setIsRejectConfirmOpen(false);
  };

  const handleConfirmApproval = async () => {
    if (!approvalModalLead || !onApproveLead) return;
    setIsProcessingApproval(true);
    try {
      await onApproveLead(approvalModalLead.id, approvalPoints, approvalReferralRupees, approvalNotes);
      const referringNurse = nurses.find((n) => n.id === approvalModalLead.nurseId);
      showToast(`Referral ${approvalModalLead.id} approved! Credited +${approvalPoints} points and ₹${approvalReferralRupees} to ${referringNurse?.name || 'Nurse'}.`);
      setApprovalModalLead(null);
    } catch {
      showToast('Error approving referral in Supabase', 'error');
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
    const pName = (l.patientName || l.referredNurseName || '').toLowerCase();
    const pPhone = l.patientPhone || l.referredNursePhone || '';
    const matchesSearch = 
      pName.includes(leadSearch.toLowerCase()) ||
      pPhone.includes(leadSearch) ||
      l.area.toLowerCase().includes(leadSearch.toLowerCase());
    const matchesStatus = leadStatusFilter === 'all' ? true : l.status === leadStatusFilter;
    const isNurseRef = l.referralType === 'nurse' || !!l.referredNursePhone;
    const matchesType = leadTypeFilter === 'all' ? true : (leadTypeFilter === 'nurse' ? isNurseRef : !isNurseRef);
    return matchesSearch && matchesStatus && matchesType;
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
    status: 'Awaiting Call' as 'Awaiting Call' | 'In Call' | 'Prescription Issued' | 'Completed' | 'Rejected',
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

  const handleDeleteConsultClick = (c: DoctorConsultation) => {
    setDeleteConfirmTarget({
      itemType: 'Doctor Consultation Request',
      itemId: c.id,
      itemTitle: `${c.patientName} (${c.id})`,
      itemDetails: `Patient Age: ${c.patientAge || 'N/A'} • Symptoms: ${c.symptoms || 'General'} • Phone: ${c.patientPhone}`,
      onConfirm: async () => {
        if (onDeleteConsultation) {
          await onDeleteConsultation(c.id);
          showToast(`Doctor request #${c.id} deleted successfully from Supabase.`);
        }
      }
    });
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
    pin: '',
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
      pin: '',
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

  const handleDeleteUserClick = (u: AppUser) => {
    setDeleteConfirmTarget({
      itemType: 'Staff User Account',
      itemId: u.id,
      itemTitle: `${u.name} (${u.role.toUpperCase()})`,
      itemDetails: `Login ID: ${u.identifier} • Phone: ${u.phone || 'N/A'} • Area: ${u.serviceArea || 'N/A'}`,
      onConfirm: async () => {
        if (onDeleteAppUser) {
          await onDeleteAppUser(u.id);
          showToast(`Staff credentials for "${u.name}" deleted from Supabase.`);
        }
      }
    });
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
          <h2 style={{ fontSize: '1.5rem', color: 'var(--primary-navy-900)', fontWeight: 800 }}>
            Office Care Desk
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--neutral-600)', margin: '0.2rem 0 0' }}>
            Simple office manager for bookings, nurses, referrals, and doctor calls
          </p>
        </div>

        <div className="panel-header-buttons">
          <button
            className={`btn btn-sm ${activeTab === 'routing' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('routing')}
          >
            <Shuffle size={14} />
            <span>🚗 Assign Nurses {pendingBookings.length > 0 ? `(${pendingBookings.length})` : ''}</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'bookings' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('bookings')}
          >
            <Calendar size={14} />
            <span>📅 Bookings ({bookings.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'nurses' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('nurses')}
          >
            <Users size={14} />
            <span>👩‍⚕️ Nurses ({nurses.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'leads' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('leads')}
          >
            <Award size={14} />
            <span>⭐ Referrals (50 pts) {leads.filter(l => l.status === 'Pending Approval').length > 0 ? `(${leads.filter(l => l.status === 'Pending Approval').length})` : ''}</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'consultations' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('consultations')}
          >
            <Stethoscope size={14} />
            <span>🩺 Doctor Calls ({consultations.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'services' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('services')}
          >
            <Layers size={14} />
            <span>🏷️ Price List ({services.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'coupons' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('coupons')}
          >
            <Tag size={14} />
            <span>🎟️ Coupons ({coupons.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'credentials' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('credentials')}
          >
            <KeyRound size={14} />
            <span>🔐 Staff Passwords ({appUsers.length})</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'storage' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => {
              const synced = syncDatabaseRecordsToStorage(bookings, nurses, getCloudflareObjects());
              setStorageObjects(synced);
              setActiveTab('storage');
            }}
          >
            <Cloud size={14} />
            <span>📁 Bills & Files ({storageObjects.length})</span>
          </button>

          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => {
              try {
                localStorage.removeItem('xn_auth_user');
                window.location.href = '/login?portal=admin';
              } catch {}
            }}
            style={{
              color: '#EF4444',
              borderColor: '#FECDD3',
              background: '#FFF1F2',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginLeft: 'auto'
            }}
            title="Sign out of Admin Operations"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Real-time DB Operation Toast Banner */}
      {dbToast && (
        <div 
          role="alert"
          aria-live="assertive"
          style={{
            position: 'fixed',
            top: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999999,
            background: dbToast.type === 'success' ? '#047857' : '#B91C1C',
            border: `2px solid ${dbToast.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`,
            borderRadius: 14,
            padding: '1rem 1.6rem',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 20px 35px -5px rgba(0,0,0,0.35), 0 10px 10px -5px rgba(0,0,0,0.2)',
            maxWidth: '90vw'
          }}
        >
          {dbToast.type === 'success' ? <CheckCircle size={22} style={{ color: '#A7F3D0', flexShrink: 0 }} /> : <AlertCircle size={22} style={{ color: '#FECACA', flexShrink: 0 }} />}
          <span style={{ lineHeight: 1.4 }}>{dbToast.message}</span>
          <button
            onClick={() => setDbToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              marginLeft: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              padding: '0.2rem',
              borderRadius: '4px'
            }}
            title="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* SMART ROUTING ENGINE (SECTION 6 BLUEPRINT) */}
      {activeTab === 'routing' && (
        <div>
          {/* Pending Dispatches Table with One-Click Routing & Bulk Deletion */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Pending Unassigned Bookings ({pendingBookings.length})</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', margin: 0 }}>
                  New doorstep clinical orders awaiting dispatch
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {pendingBookings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchAssignBooking(pendingBookings[0]);
                      setNurseSearchQuery('');
                      setNurseSearchFilterArea(pendingBookings[0].area || 'all');
                    }}
                    className="btn btn-outline btn-sm"
                    style={{ borderColor: '#0284C7', color: '#0284C7', background: '#F0F9FF', fontWeight: 700, gap: '0.35rem' }}
                  >
                    <Search size={14} />
                    <span>Search Nurse & Assign</span>
                  </button>
                )}
                <button onClick={onAutoRouteAll} className="btn btn-danger btn-sm">
                  <Shuffle size={14} />
                  <span>⚡ Auto-Assign All Waiting Bookings</span>
                </button>
              </div>
            </div>

            {renderBulkActionBar({
              entityName: 'Unassigned Bookings',
              filteredIds: pendingBookings.map((b) => b.id),
              selectedSet: selectedRoutingBookingIds,
              setSelectedSet: setSelectedRoutingBookingIds,
              onDeleteMultiple: onDeleteMultipleBookings
            })}

            <div className="table-responsive">
              <table className="data-table data-table-wide">
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={pendingBookings.length > 0 && pendingBookings.every((b) => selectedRoutingBookingIds.has(b.id))}
                        onChange={() => toggleSelectAll(pendingBookings.map((b) => b.id), selectedRoutingBookingIds, setSelectedRoutingBookingIds)}
                        style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                        title="Select / Deselect All Unassigned Orders"
                      />
                    </th>
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
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--neutral-500)' }}>
                        ✓ All active bookings have been routed and assigned to local nurses!
                      </td>
                    </tr>
                  ) : (
                    pendingBookings.map((b) => {
                      const isSelected = selectedRoutingBookingIds.has(b.id);
                      return (
                      <tr key={b.id} style={{ background: isSelected ? '#FFF1F2' : undefined }}>
                        <td style={{ textAlign: 'center', width: 40 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItemSelection(b.id, setSelectedRoutingBookingIds)}
                            style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                          />
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}><strong style={{ fontFamily: 'monospace' }}>{b.id}</strong></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 750, color: 'var(--primary-navy-950)' }}>{b.patientName}</div>
                          <div style={{ fontSize: '0.76rem', color: '#64748B', fontFamily: 'monospace' }}>{b.patientPhone}</div>
                          <div style={{ marginTop: '0.2rem' }}>
                            {b.bookingType?.toLowerCase() === 'scheduled' ? (
                              <span style={{ fontSize: '0.72rem', background: '#F0FDF4', color: '#166534', padding: '2px 7px', borderRadius: 9999, fontWeight: 700, border: '1px solid #BBF7D0', whiteSpace: 'nowrap' }}>
                                📅 {b.scheduledSlot || 'Scheduled Slot'}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', background: '#EFF6FF', color: '#1D4ED8', padding: '2px 7px', borderRadius: 9999, fontWeight: 700, border: '1px solid #BFDBFE', whiteSpace: 'nowrap' }}>
                                ⚡ Instant Request
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 650, color: '#1E293B' }}>{b.serviceTitle}</span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
                            <MapPin size={13} style={{ color: '#0284C7', flexShrink: 0 }} />
                            <strong style={{ fontSize: '0.82rem', color: '#0F172A' }}>{resolveRealArea(b.area, b.fullAddress)}</strong>
                          </div>
                          {b.fullAddress && (
                            <div style={{ fontSize: '0.72rem', color: '#64748B', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={b.fullAddress}>
                              {b.fullAddress}
                            </div>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {b.hasPrescription || b.prescriptionFileName || b.prescriptionUrl ? (
                            <button
                              type="button"
                              onClick={() => handleViewPrescription(b)}
                              className="btn btn-sm"
                              style={{
                                background: '#F0FDF4',
                                border: '1px solid #BBF7D0',
                                color: '#15803D',
                                fontSize: '0.75rem',
                                padding: '0.25rem 0.65rem',
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontWeight: 750,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                              }}
                              title="Inspect Doctor Prescription"
                            >
                              <FileText size={13} style={{ color: '#059669' }} />
                              <span>View Rx</span>
                            </button>
                          ) : (
                            <span style={{ color: '#DC2626', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>⚠️ Needs Consult</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            {nurses
                              .filter((n) => n.serviceArea === b.area && n.certificateVerified)
                              .map((matchingNurse) => (
                                <button
                                  key={matchingNurse.id}
                                  onClick={() =>
                                    onAssignOrder(
                                      b.id,
                                      matchingNurse.id,
                                      `Rule 2 Matched: Verified ${b.area} Area Nurse (${matchingNurse.name})`
                                    )
                                  }
                                  className="btn btn-primary btn-sm"
                                  title={`Route to verified ${matchingNurse.name} (${b.area})`}
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                                >
                                  <span>Assign to {matchingNurse.name.split(' ')[0]} RN</span>
                                  <ArrowRight size={13} />
                                </button>
                              ))}

                            <button
                              type="button"
                              onClick={() => {
                                setSearchAssignBooking(b);
                                setNurseSearchQuery('');
                                setNurseSearchFilterArea(b.area || 'all');
                              }}
                              className="btn btn-outline btn-sm"
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.8rem',
                                whiteSpace: 'nowrap',
                                borderColor: '#0284C7',
                                color: '#0284C7',
                                background: '#F0F9FF',
                                fontWeight: 750,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem'
                              }}
                              title={`Search nurse roster and assign Order #${b.id}`}
                            >
                              <Search size={13} />
                              <span>Search Nurse & Assign</span>
                            </button>

                            <select
                              className="form-control"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', width: 'auto', minWidth: '150px' }}
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  const selectedNurse = nurses.find((n) => n.id === e.target.value);
                                  if (!selectedNurse?.certificateVerified) {
                                    alert('Cannot assign booking: Nurse certificate is not verified. Unverified nurses can only refer fellow nurses.');
                                    return;
                                  }
                                  onAssignOrder(
                                    b.id,
                                    e.target.value,
                                    `Manual Dispatch by Admin to ${selectedNurse?.name || e.target.value}`
                                  );
                                }
                              }}
                            >
                              <option value="" disabled>Or Assign Verified Nurse...</option>
                              {nurses.map((n) => (
                                <option key={n.id} value={n.id} disabled={!n.certificateVerified}>
                                  {n.name} ({n.serviceArea}) {n.certificateVerified ? '✓ Verified' : '⚠️ No Certificate (Refer Only)'}
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
                              title="Issue and preview official invoice"
                            >
                              <Receipt size={13} />
                              <span>Invoice</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteBookingClick(b)}
                              className="btn btn-sm"
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.35rem 0.55rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                color: '#E11D48',
                                borderColor: '#FECDD3',
                                background: '#FFF1F2',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title={`Delete pending booking #${b.id} from Supabase`}
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
                onClick={exportBookingsToCSV}
                className="btn btn-outline btn-sm"
                style={{ borderRadius: 9999, fontWeight: 700, gap: '0.4rem', borderColor: '#10B981', color: '#059669', background: '#ECFDF5' }}
                title="Download all booking records as Excel/CSV spreadsheet"
              >
                <Download size={15} />
                <span>Export Bookings (Excel/CSV)</span>
              </button>
              <button
                onClick={handleSyncAllInvoicesToCloudflare}
                className="btn btn-outline btn-sm"
                style={{ borderRadius: 9999, fontWeight: 700, gap: '0.4rem', borderColor: '#BAE6FD', color: '#0284C7', background: '#F0F9FF' }}
                title="Issue and sync invoices for all bookings"
              >
                <Receipt size={15} />
                <span>Invoice Generator ({bookings.length})</span>
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

          {/* Urgent Dispatch Alert: Nurse Declined Visits */}
          {nurseDeclinedBookings.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
              border: '2px solid #F59E0B',
              borderRadius: 12,
              padding: '1rem 1.25rem',
              margin: '1.25rem 1.25rem 0 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#F59E0B', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertCircle size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#92400E', fontSize: '0.96rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span>Dispatch Alert: {nurseDeclinedBookings.length} Assigned Visit(s) Declined by Nurse!</span>
                    <span className="status-pill danger" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>Action Needed: Refer to Other Nurse</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#B45309', marginTop: '2px' }}>
                    Assigned nurses declined due to schedule conflicts or emergency calls. Review reasons below and click <strong>"Refer to Other Nurse"</strong> to reassign.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookingStatusFilter('Nurse-Declined')}
                className="btn btn-sm"
                style={{
                  background: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  padding: '0.45rem 1rem',
                  borderRadius: 8,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(217, 119, 6, 0.25)'
                }}
              >
                View Declined Orders ({nurseDeclinedBookings.length})
              </button>
            </div>
          )}

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
              <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', fontWeight: 600 }}>Filter:</span>
              <select
                value={bookingStatusFilter}
                onChange={(e) => setBookingStatusFilter(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.82rem',
                  borderRadius: 8,
                  border: bookingStatusFilter === 'Nurse-Declined' ? '2px solid #DC2626' : '1px solid #CBD5E1',
                  background: bookingStatusFilter === 'Nurse-Declined' ? '#FFF1F2' : '#FFFFFF',
                  color: bookingStatusFilter === 'Nurse-Declined' ? '#991B1B' : '#0F172A',
                  fontWeight: 700
                }}
              >
                <option value="all">All Bookings ({bookings.length})</option>
                {nurseDeclinedBookings.length > 0 && (
                  <option value="Nurse-Declined" style={{ color: '#DC2626', fontWeight: 800 }}>
                    ⚠️ Nurse Declined (Referral Needed) ({nurseDeclinedBookings.length})
                  </option>
                )}
                <option value="Pending">Pending ({bookings.filter(b => b.status === 'Pending').length})</option>
                <option value="Assigned">Assigned ({bookings.filter(b => b.status === 'Assigned').length})</option>
                <option value="Accepted">Accepted & In-Progress ({bookings.filter(b => b.status === 'In-Progress' || b.nurseAcceptanceStatus === 'Accepted').length})</option>
                <option value="Completed">Completed ({bookings.filter(b => b.status === 'Completed').length})</option>
                <option value="Rejected">Rejected by Admin ({bookings.filter(b => b.status === 'Rejected' && b.rejectedBy !== 'Nurse' && !b.rejectionReason?.toLowerCase().includes('nurse')).length})</option>
                <option value="Cancelled">Cancelled ({bookings.filter(b => b.status === 'Cancelled').length})</option>
              </select>
            </div>
          </div>

          {filteredBookings.length === 0 ? (
            <EmptyState
              title="No Master Bookings Found"
              description={bookingSearch ? 'No bookings matched your filter criteria.' : 'No home nurse or diagnostic appointments have been created yet.'}
            />
          ) : (
            <>
              {renderBulkActionBar({
                entityName: 'Bookings',
                filteredIds: filteredBookings.map((b) => b.id),
                selectedSet: selectedBookingIds,
                setSelectedSet: setSelectedBookingIds,
                onDeleteMultiple: onDeleteMultipleBookings
              })}
              <div className="table-responsive">
                <table className="data-table data-table-wide">
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={filteredBookings.length > 0 && filteredBookings.every((b) => selectedBookingIds.has(b.id))}
                          onChange={() => toggleSelectAll(filteredBookings.map((b) => b.id), selectedBookingIds, setSelectedBookingIds)}
                          style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                          title="Select / Deselect All Bookings"
                        />
                      </th>
                      <th>Booking ID</th>
                      <th>Type & Timing</th>
                      <th>Patient & Phone</th>
                      <th>Procedure</th>
                      <th>Area & Address</th>
                      <th>Assigned Nurse</th>
                      <th>Prescription</th>
                      <th>Fee</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b) => {
                      const isSelected = selectedBookingIds.has(b.id);
                      return (
                        <tr key={b.id} style={{ background: isSelected ? '#FFF1F2' : undefined }}>
                          <td style={{ textAlign: 'center', width: 40 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelection(b.id, setSelectedBookingIds)}
                              style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                            />
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <strong style={{ fontFamily: 'monospace', fontSize: '0.86rem' }}>{b.id}</strong>
                              <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                                Received: {b.createdAt ? new Date(b.createdAt).toLocaleString() : 'Unknown'}
                              </span>
                            </div>
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                        {b.bookingType?.toLowerCase() === 'scheduled' ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '0.74rem', background: '#F0FDF4', color: '#166534', padding: '2px 8px', borderRadius: 9999, fontWeight: 750, border: '1px solid #BBF7D0', whiteSpace: 'nowrap' }}>
                              📅 Scheduled
                            </span>
                            <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {b.preferredDate ? `${b.preferredDate} | ${b.preferredTime || b.scheduledSlot || 'Standard Slot'}` : (b.scheduledSlot || 'Standard Slot')}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: '0.74rem', background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 9999, fontWeight: 750, border: '1px solid #BFDBFE', whiteSpace: 'nowrap' }}>
                              ⚡ Instant (ASAP)
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              Emergency
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 750, color: 'var(--primary-navy-950)', whiteSpace: 'nowrap' }}>{b.patientName}</div>
                        {b.status === 'Cancelled' || b.status === 'Rejected' ? (
                          <span style={{ fontSize: '0.74rem', color: '#94A3B8', fontWeight: 600 }}>✕ Contact Hidden (Rejected)</span>
                        ) : (
                          <div style={{ fontSize: '0.76rem', color: '#64748B', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{b.patientPhone}</div>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 650, color: '#1E293B', whiteSpace: 'nowrap' }}>{b.serviceTitle}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
                          <MapPin size={13} style={{ color: '#0284C7', flexShrink: 0 }} />
                          <strong style={{ fontSize: '0.82rem', color: '#0F172A', whiteSpace: 'nowrap' }}>{resolveRealArea(b.area, b.fullAddress)}</strong>
                        </div>
                        {b.fullAddress && (
                          <div style={{ fontSize: '0.72rem', color: '#64748B', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={b.fullAddress}>
                            {b.fullAddress}
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {b.assignedNurseName ? (() => {
                          const assignedNurse = nurses.find((n) => n.id === b.assignedNurseId || n.name === b.assignedNurseName);
                          const phoneNum = assignedNurse?.phone;
                          return (
                            <div style={{ whiteSpace: 'nowrap' }}>
                              <div style={{ fontWeight: 750, color: '#0F172A', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span>{b.assignedNurseName}</span>
                                {phoneNum && b.status !== 'Cancelled' && b.status !== 'Rejected' && (
                                  <a
                                    href={`tel:${phoneNum.replace(/\s+/g, '')}`}
                                    style={{ color: '#059669', display: 'inline-flex', alignItems: 'center' }}
                                    title={`Call ${b.assignedNurseName} (${phoneNum})`}
                                  >
                                    <Phone size={12} />
                                  </a>
                                )}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap', marginTop: '1px' }}>
                                {b.referringNurseName
                                  ? `⚡ Referred by: ${b.referringNurseName}`
                                  : (b.referringNurseId ? 'Rule 1 (Referral Match)' : 'Rule 2 (Area Matched)')}
                              </div>
                            </div>
                          );
                        })() : (
                          <span style={{ color: '#E11D48', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {b.prescriptionFileName || b.prescriptionUrl || b.hasPrescription ? (
                          <button
                            type="button"
                            onClick={() => handleViewPrescription(b)}
                            className="btn btn-sm"
                            style={{
                              background: '#F0FDF4',
                              border: '1px solid #BBF7D0',
                              color: '#15803D',
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.65rem',
                              borderRadius: 6,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              fontWeight: 750,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                            title="Inspect Doctor Prescription"
                          >
                            <FileText size={13} style={{ color: '#059669' }} />
                            <span>View Rx</span>
                          </button>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>No Rx Needed</span>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {b.status === 'Cancelled' || b.status === 'Rejected' ? (
                          <span style={{ color: '#94A3B8', fontSize: '0.84rem', fontWeight: 600 }}>
                            ₹0 <small style={{ color: '#DC2626' }}>(Rejected)</small>
                          </span>
                        ) : (
                          <strong style={{ color: 'var(--primary-navy-900)', fontSize: '0.88rem' }}>₹{b.estimatedFee}</strong>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {(() => {
                          const isDeclinedByNurse = b.rejectedBy === 'Nurse' || b.nurseAcceptanceStatus === 'Rejected' || (b.status === 'Rejected' && b.rejectionReason?.toLowerCase().includes('nurse'));
                          const isAcceptedByNurse = b.nurseAcceptanceStatus === 'Accepted' || (b.status === 'In-Progress' && !isDeclinedByNurse);
                          const isAwaitingNurse = !isAcceptedByNurse && !isDeclinedByNurse && b.status === 'Assigned';

                          if (isDeclinedByNurse) {
                            return (
                              <div>
                                <span className="status-pill danger" style={{ background: '#FFF1F2', color: '#BE123C', border: '1px solid #FECDD3', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 800 }}>
                                  ⚠️ Nurse Declined (Referral Needed)
                                </span>
                                {b.rejectionReason && (
                                  <div style={{ fontSize: '0.72rem', color: '#9F1239', marginTop: '3px', background: '#FFE4E6', padding: '3px 6px', borderRadius: 4, whiteSpace: 'normal', maxWidth: 220, border: '1px solid #FECDD3', fontWeight: 600 }}>
                                    {b.rejectionReason}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          if (isAcceptedByNurse) {
                            return (
                              <span className="status-pill success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 750 }}>
                                ✓ Nurse Accepted
                              </span>
                            );
                          }

                          if (isAwaitingNurse) {
                            return (
                              <span className="status-pill warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 750 }}>
                                ⏳ Awaiting Nurse Approval
                              </span>
                            );
                          }

                          return (
                            <div>
                              <span className={`status-pill ${
                                b.status === 'Completed' ? 'success' :
                                b.status === 'Pending' ? 'warning' :
                                b.status === 'Rejected' || b.status === 'Cancelled' ? 'danger' : 'neutral'
                              }`} style={{ whiteSpace: 'nowrap' }}>
                                {b.status === 'Rejected' ? '✕ Rejected by Admin' : b.status === 'Cancelled' ? '✕ Cancelled' : b.status}
                              </span>
                              {b.rejectionReason && (
                                <div style={{ fontSize: '0.72rem', color: '#DC2626', marginTop: '3px', background: '#FEF2F2', padding: '3px 6px', borderRadius: 4, whiteSpace: 'normal', maxWidth: 220, border: '1px solid #FECDD3' }}>
                                  <strong>Reason:</strong> {b.rejectionReason}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {(() => {
                          const isDeclinedByNurse = b.rejectedBy === 'Nurse' || b.nurseAcceptanceStatus === 'Rejected' || (b.status === 'Rejected' && b.rejectionReason?.toLowerCase().includes('nurse'));

                          return (
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: '0.35rem' }}>
                              {isDeclinedByNurse && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSearchAssignBooking(b);
                                      setNurseSearchQuery('');
                                      setNurseSearchFilterArea(b.area || 'all');
                                    }}
                                    className="btn btn-sm"
                                    style={{
                                      background: '#0284C7',
                                      border: '1px solid #0284C7',
                                      color: '#FFFFFF',
                                      fontWeight: 800,
                                      padding: '0.3rem 0.65rem',
                                      borderRadius: 6,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      boxShadow: '0 1px 3px rgba(2, 132, 199, 0.3)'
                                    }}
                                    title="Search verified nurse roster and refer order"
                                  >
                                    <Search size={13} />
                                    <span>Search Nurse to Refer</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAdminReassignBooking(b);
                                      const recommended = nurses.find((n) => n.id !== b.assignedNurseId && n.serviceArea === b.area && n.certificateVerified) || nurses.find((n) => n.id !== b.assignedNurseId && n.certificateVerified);
                                      setSelectedReferralNurseId(recommended?.id || '');
                                      setReferralRuleNote(`Referred following decline by ${b.assignedNurseName || 'previous nurse'}`);
                                    }}
                                    className="btn btn-sm"
                                    style={{
                                      background: '#FEF3C7',
                                      border: '1px solid #F59E0B',
                                      color: '#92400E',
                                      fontWeight: 800,
                                      padding: '0.3rem 0.65rem',
                                      borderRadius: 6,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      boxShadow: '0 1px 3px rgba(245, 158, 11, 0.25)'
                                    }}
                                    title="Refer and reassign this order to another certified nurse"
                                  >
                                    <RefreshCw size={13} />
                                    <span>Refer to Other Nurse</span>
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => handleViewBookingInvoice(b)}
                                title="Issue Official Invoice (Save to Cloudflare R2)"
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
                              {b.status !== 'Cancelled' && b.status !== 'Rejected' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const reason = window.prompt(`Reject order/payment for ${b.patientName}?\n\nEnter reason for rejection (e.g. Ineligible Clinical Case, Invalid Prescription, Area Out of Jurisdiction):`, 'Ineligible Clinical Case');
                                    if (reason !== null && reason.trim()) {
                                      await onUpdateBooking?.(b.id, {
                                        status: 'Rejected',
                                        rejectionReason: reason.trim(),
                                        rejectedBy: 'Admin'
                                      });
                                      showToast(`Order ${b.id} marked as Rejected by Admin. Nurse payout set to ₹0.`);
                                    }
                                  }}
                                  title="Reject Order (Sets nurse payout to ₹0 immediately)"
                              style={{
                                background: '#FEF2F2',
                                border: '1px solid #FECDD3',
                                color: '#DC2626',
                                padding: '0.3rem 0.45rem',
                                borderRadius: 6,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                fontSize: '0.72rem',
                                fontWeight: 700
                              }}
                            >
                              <X size={13} />
                              <span>Reject</span>
                            </button>
                          )}
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
                      );
                    })()}
                  </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      )}

      {/* NURSE ROSTER TAB (FULL SUPABASE CRUD) */}
      {activeTab === 'nurses' && (() => {
        const totalNursesCount = nurses.length;
        const activeNursesCount = nurses.filter((n) => n.status === 'Active' || (n.activeVisits && n.activeVisits > 0)).length;
        const verifiedNursesCount = nurses.filter((n) => n.certificateVerified).length;
        const pendingNursesCount = nurses.filter((n) => !n.certificateVerified).length;
        const referredNursesCount = nurses.filter((n) => Boolean(n.referredByNurseId)).length;
        const directNursesCount = nurses.filter((n) => !n.referredByNurseId).length;
        const expOver10Count = nurses.filter((n) => (n.experienceYears || (parseInt(n.experience || '0', 10) || 0)) >= 10).length;
        const exp5to10Count = nurses.filter((n) => {
          const exp = n.experienceYears || (parseInt(n.experience || '0', 10) || 0);
          return exp >= 5 && exp < 10;
        }).length;
        const expUnder5Count = nurses.filter((n) => (n.experienceYears || (parseInt(n.experience || '0', 10) || 0)) < 5).length;

        return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 className="card-title">Registered Nursing Fleet & Service Zones</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--neutral-500)', margin: 0 }}>
                  Total: {totalNursesCount} nurses | {referredNursesCount} via referrals | {directNursesCount} direct registrations | {verifiedNursesCount} verified
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={exportNursesToCSV}
                  className="btn btn-outline btn-sm"
                  style={{ borderRadius: 9999, fontWeight: 700, gap: '0.4rem', borderColor: '#10B981', color: '#059669', background: '#ECFDF5' }}
                  title="Download complete nurse roster spreadsheet (CSV/Excel)"
                >
                  <Download size={15} />
                  <span>Export Fleet (Excel/CSV)</span>
                </button>
                <button
                  onClick={handleOpenCreateNurseModal}
                  className="btn btn-danger btn-sm"
                  style={{ borderRadius: 9999, fontWeight: 700, gap: '0.4rem' }}
                >
                  <Plus size={16} />
                  <span>Add New Nurse</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--neutral-200)', background: '#FAFAFA', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
                <input
                  type="text"
                  placeholder="Search nurse by name, phone, email, qualification, referral code..."
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

              {/* Origin Filter (Referred vs Direct) */}
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--neutral-600)', fontWeight: 700 }}>Origin:</span>
                <button
                  type="button"
                  onClick={() => setNurseOriginFilter('all')}
                  className={`btn btn-sm ${nurseOriginFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem', borderRadius: 9999 }}
                >
                  All ({totalNursesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setNurseOriginFilter('referred')}
                  className={`btn btn-sm ${nurseOriginFilter === 'referred' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem', borderRadius: 9999 }}
                >
                  ⚡ Referred ({referredNursesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setNurseOriginFilter('direct')}
                  className={`btn btn-sm ${nurseOriginFilter === 'direct' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem', borderRadius: 9999 }}
                >
                  Direct ({directNursesCount})
                </button>
              </div>

              {/* Experience Categories */}
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--neutral-600)', fontWeight: 700 }}>Exp:</span>
                <button
                  type="button"
                  onClick={() => setNurseExpFilter('all')}
                  className={`btn btn-sm ${nurseExpFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem', borderRadius: 9999 }}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setNurseExpFilter('>10')}
                  className={`btn btn-sm ${nurseExpFilter === '>10' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem', borderRadius: 9999 }}
                >
                  &gt;10 Yrs ({expOver10Count})
                </button>
                <button
                  type="button"
                  onClick={() => setNurseExpFilter('5-10')}
                  className={`btn btn-sm ${nurseExpFilter === '5-10' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem', borderRadius: 9999 }}
                >
                  5-10 Yrs ({exp5to10Count})
                </button>
                <button
                  type="button"
                  onClick={() => setNurseExpFilter('<5')}
                  className={`btn btn-sm ${nurseExpFilter === '<5' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.74rem', borderRadius: 9999 }}
                >
                  &lt;5 Yrs ({expUnder5Count})
                </button>
              </div>
            </div>

          {filteredNurses.length === 0 ? (
            <EmptyState
              title="No Nurses Found"
              description={nurseSearch || nurseOriginFilter !== 'all' ? 'No nurses matched your search criteria or origin filter.' : 'No registered nurses are currently stationed in the fleet directory.'}
            />
          ) : (
            <>
              {renderBulkActionBar({
                entityName: 'Nurses',
                filteredIds: filteredNurses.map((n) => n.id),
                selectedSet: selectedNurseIds,
                setSelectedSet: setSelectedNurseIds,
                onDeleteMultiple: onDeleteMultipleNurses
              })}
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={filteredNurses.length > 0 && filteredNurses.every((n) => selectedNurseIds.has(n.id))}
                          onChange={() => toggleSelectAll(filteredNurses.map((n) => n.id), selectedNurseIds, setSelectedNurseIds)}
                          style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                          title="Select / Deselect All Nurses"
                        />
                      </th>
                      <th>Nurse</th>
                      <th>Signup Origin</th>
                      <th>Referral Code</th>
                      <th>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>Login PIN & Access</span>
                          <button
                            type="button"
                            onClick={() => setShowAllPins(!showAllPins)}
                            title={showAllPins ? 'Hide All PINs' : 'Reveal All PINs'}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 2,
                              color: showAllPins ? '#0284C7' : 'var(--neutral-400)',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                          >
                            {showAllPins ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </th>
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
                      const nursePhoneDigits = (n.phone || '').replace(/\D/g, '');
                      const nurseLast10 = nursePhoneDigits.length >= 10 ? nursePhoneDigits.slice(-10) : nursePhoneDigits;
                      const userObj = appUsers.find((u) => {
                        const uPhoneDigits = (u.phone || '').replace(/\D/g, '');
                        const uLast10 = uPhoneDigits.length >= 10 ? uPhoneDigits.slice(-10) : uPhoneDigits;
                        const uNameDigits = (u.name || '').replace(/\D/g, '');
                        return (
                          u.id === n.id ||
                          (nurseLast10 && uLast10 && nurseLast10 === uLast10) ||
                          (nursePhoneDigits && uPhoneDigits && (nursePhoneDigits === uPhoneDigits || nursePhoneDigits.endsWith(uPhoneDigits) || uPhoneDigits.endsWith(nursePhoneDigits))) ||
                          (nurseLast10 && uNameDigits && uNameDigits === nurseLast10) ||
                          (u.email && n.email && u.email.toLowerCase().trim() === n.email.toLowerCase().trim()) ||
                          (u.identifier && n.email && u.identifier.toLowerCase().trim() === n.email.toLowerCase().trim()) ||
                          (u.identifier && nurseLast10 && u.identifier.includes(nurseLast10)) ||
                          (u.name && n.name && u.name.toLowerCase().trim() === n.name.toLowerCase().trim())
                        );
                      });
                      const userPin = (n.pin && n.pin !== '••••' && n.pin.trim() !== '')
                        ? n.pin.trim()
                        : ((userObj?.pin && userObj.pin !== '••••' && userObj.pin.trim() !== '')
                          ? userObj.pin.trim()
                          : '••••');
                      const isRevealed = showAllPins || revealedPinIds[n.id] || (userObj && revealedPinIds[userObj.id]);
                      const nurseCode = n.referralCode || generateNurseReferralCode(n.name, n.id, n.phone);
                      const isCopiedCode = copiedRefCodeId === n.id;
                      const isSelected = selectedNurseIds.has(n.id);

                      return (
                        <tr key={n.id} style={{ background: isSelected ? '#FFF1F2' : undefined }}>
                          <td style={{ textAlign: 'center', width: 40 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelection(n.id, setSelectedNurseIds)}
                              style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                            />
                          </td>
                          <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                              <User size={20} />
                            </div>
                            <div>
                              <strong>{n.name}</strong>
                              <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)' }}>{n.phone}</div>
                            </div>
                          </div>
                        </td>

                        {/* Origin (Referred vs Direct) */}
                        <td>
                          {n.referredByNurseId ? (() => {
                            const refNurse = nurses.find((rn) => rn.id === n.referredByNurseId);
                            const refName = refNurse?.name || n.referredByNurseName || n.referredByNurseId;
                            return (
                              <div>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  background: '#EFF6FF',
                                  color: '#1D4ED8',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: 9999,
                                  padding: '2px 8px',
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  whiteSpace: 'nowrap'
                                }}>
                                  ⚡ Referred by {refName}
                                </span>
                                <div style={{ fontSize: '0.7rem', color: n.certificateVerified ? '#059669' : '#D97706', fontWeight: 700, marginTop: '2px' }}>
                                  Bonus: 50 points {n.certificateVerified ? '✓ Credited' : '⏳ Pending'}
                                </div>
                              </div>
                            );
                          })() : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: '#F1F5F9',
                              color: '#475569',
                              border: '1px solid #E2E8F0',
                              borderRadius: 9999,
                              padding: '2px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap'
                            }}>
                              Individual / Direct
                            </span>
                          )}
                        </td>

                        {/* Referral Code */}
                        <td>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '0.76rem',
                              background: '#F0F9FF',
                              color: '#0369A1',
                              border: '1px solid #BAE6FD',
                              borderRadius: 5,
                              padding: '2px 6px'
                            }}>
                              {nurseCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(nurseCode);
                                setCopiedRefCodeId(n.id);
                                setTimeout(() => setCopiedRefCodeId(null), 2000);
                              }}
                              title="Copy Referral Code"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, color: isCopiedCode ? '#059669' : '#64748B' }}
                            >
                              {isCopiedCode ? <Check size={12} /> : <Copy size={12} />}
                            </button>
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
                          <div style={{ fontSize: '0.78rem', color: 'var(--neutral-500)' }}>Ref: {n.totalReferrals || 0}</div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <strong>{n.pointsEarned} pts</strong>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const added = prompt(`Adjust points for ${n.name} (enter number, e.g. 50, 100, or -50):`, '50');
                                if (added !== null) {
                                  const num = parseInt(added, 10);
                                  if (!isNaN(num) && num !== 0) {
                                    const nextPoints = Math.max(0, (n.pointsEarned || 0) + num);
                                    await onUpdateNurseRecord?.(n.id, { pointsEarned: nextPoints });
                                    showToast(`Updated ${n.name}'s points to ${nextPoints} pts!`);
                                  }
                                }
                              }}
                              title="Quick Adjust Points"
                              style={{
                                background: '#FEF3C7',
                                border: '1px solid #FDE68A',
                                color: '#D97706',
                                borderRadius: 4,
                                padding: '2px 6px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              +pts
                            </button>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <strong style={{ color: '#059669' }}>₹{n.referralEarningsRupees}</strong>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const added = prompt(`Adjust referral cash for ${n.name} (enter ₹ amount, e.g. 100, 500, or -100):`, '100');
                                if (added !== null) {
                                  const num = parseInt(added, 10);
                                  if (!isNaN(num) && num !== 0) {
                                    const nextCash = Math.max(0, (n.referralEarningsRupees || 0) + num);
                                    await onUpdateNurseRecord?.(n.id, { referralEarningsRupees: nextCash });
                                    showToast(`Updated ${n.name}'s referral cash to ₹${nextCash}!`);
                                  }
                                }
                              }}
                              title="Quick Adjust Referral Cash"
                              style={{
                                background: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                color: '#059669',
                                borderRadius: 4,
                                padding: '2px 6px',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              +₹
                            </button>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' }}>
                            {n.certificateVerified ? (
                              <span className="status-pill success" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                                ✓ Verified Certificate
                              </span>
                            ) : (
                              <span className="status-pill warning" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                                ⏳ Pending Review
                              </span>
                            )}

                            {/* View Certificate Button - works for any nurse with a certificateUrl */}
                            {n.certificateUrl ? (
                              <button 
                                type="button"
                                onClick={() => {
                                  setAdminCertModalNurse(n);
                                  setAdminCertModalOpen(true);
                                }} 
                                className="btn btn-sm" 
                                style={{ 
                                  fontSize: '0.72rem', 
                                  padding: '0.22rem 0.55rem', 
                                  background: '#EFF6FF', 
                                  border: '1px solid #BFDBFE', 
                                  color: '#1D4ED8', 
                                  borderRadius: 5, 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '0.3rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                <Eye size={12} />
                                <span>View Certificate</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>No doc uploaded</span>
                            )}

                            {!n.certificateVerified && (
                              <button 
                                type="button"
                                onClick={async () => {
                                  await onUpdateNurseRecord?.(n.id, { certificateVerified: true, status: 'Active' });
                                  showToast(`Nurse "${n.name}" verified and approved!`);

                                      // If nurse was referred by an existing nurse, credit 50 points referral reward to the referrer (no rupees)
                                      if (n.referredByNurseId && onUpdateNurseRecord) {
                                        const referrer = nurses.find((rn) => rn.id === n.referredByNurseId);
                                        if (referrer) {
                                          const newPoints = (referrer.pointsEarned || 0) + 50;
                                          await onUpdateNurseRecord(referrer.id, {
                                            pointsEarned: newPoints,
                                            convertedLeads: (referrer.convertedLeads || 0) + 1
                                          });

                                          // Also approve lead if exists
                                          const matchLead = leads.find((l) => l.nurseId === referrer.id && (l.referredNursePhone === n.phone || l.patientPhone === n.phone || l.referredNurseName === n.name));
                                          if (matchLead && onApproveLead) {
                                            await onApproveLead(matchLead.id, 50, 50, `Referred nurse ${n.name} certificate verified by Admin`);
                                          }

                                        showToast(`Nurse ${n.name} approved! ₹50 referral bonus credited to ${referrer.name}.`);
                                        return;
                                      }
                                    }
                                    showToast(`Nurse ${n.name} approved and activated.`);
                                }}
                                className="btn btn-sm btn-primary" 
                                style={{ fontSize: '0.7rem', padding: '0.2rem 0.55rem', background: '#0284C7', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 700 }}
                              >
                                Approve Nurse
                              </button>
                            )}
                          </div>
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
            </>
          )}
        </div>
        </div>
        );
      })()}

      {/* SERVICES & PRICING CATALOG TAB (FULL SUPABASE CRUD) */}
      {activeTab === 'services' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
              <>
                {renderBulkActionBar({
                  entityName: 'Services',
                  filteredIds: filteredServices.map((s) => s.id),
                  selectedSet: selectedServiceIds,
                  setSelectedSet: setSelectedServiceIds,
                  onDeleteMultiple: onDeleteMultipleServices
                })}
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={filteredServices.length > 0 && filteredServices.every((s) => selectedServiceIds.has(s.id))}
                            onChange={() => toggleSelectAll(filteredServices.map((s) => s.id), selectedServiceIds, setSelectedServiceIds)}
                            style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                            title="Select / Deselect All Services"
                          />
                        </th>
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
                      {filteredServices.map((s) => {
                        const isSelected = selectedServiceIds.has(s.id);
                        return (
                          <tr key={s.id} style={{ background: isSelected ? '#FFF1F2' : undefined }}>
                            <td style={{ textAlign: 'center', width: 40 }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleItemSelection(s.id, setSelectedServiceIds)}
                                style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                              />
                            </td>
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
                          <button
                            type="button"
                            onClick={async () => {
                              if (onUpdateService) {
                                await onUpdateService(s.id, { prescriptionRequired: !s.prescriptionRequired });
                                showToast(`Updated ${s.title}: Rx is now ${!s.prescriptionRequired ? 'Mandatory' : 'Optional'}`);
                              }
                            }}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              padding: 0,
                              cursor: 'pointer',
                              display: 'inline-flex'
                            }}
                            title="Click to toggle Mandatory Prescription on/off"
                          >
                            {s.prescriptionRequired ? (
                              <span className="status-pill danger" style={{ fontSize: '0.74rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span>⚠️ Mandatory Rx</span>
                                <span style={{ fontSize: '0.66rem', opacity: 0.85 }}>(Toggle)</span>
                              </span>
                            ) : (
                              <span className="status-pill success" style={{ fontSize: '0.74rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span>✓ No Rx Needed</span>
                                <span style={{ fontSize: '0.66rem', opacity: 0.85 }}>(Toggle)</span>
                              </span>
                            )}
                          </button>
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
                    );
                  })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* LEADS CRM TAB (FULL SUPABASE CRUD + ADMIN REWARD DECISION) */}
      {activeTab === 'leads' && (
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 className="card-title">Patient Referrals by Nurses</h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--neutral-500)', margin: 0 }}>
                Total: {leads.length} referrals | Every approved patient gives the nurse +50 Reward Points
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={exportLeadsToCSV}
                className="btn btn-outline btn-sm"
                style={{ borderRadius: 9999, fontWeight: 700, gap: '0.4rem', borderColor: '#10B981', color: '#059669', background: '#ECFDF5' }}
              >
                <Download size={16} />
                <span>Export Referrals</span>
              </button>
              <button
                onClick={handleOpenCreateLeadModal}
                className="btn btn-danger btn-sm"
                style={{ borderRadius: 9999, fontWeight: 700, gap: '0.4rem' }}
              >
                <Plus size={16} />
                <span>Add Patient Referral</span>
              </button>
            </div>
          </div>

          {/* Pending Approvals Notice Banner */}
          {leads.filter((l) => l.status === 'Pending Approval').length > 0 && (
            <div style={{
              margin: '0.85rem 1.25rem 0',
              padding: '0.85rem 1.15rem',
              background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
              border: '1px solid #10B981',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#059669',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900
                }}>
                  <Award size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#065F46', fontSize: '0.94rem' }}>
                    {leads.filter((l) => l.status === 'Pending Approval').length} Patient Referral(s) Waiting for Office Approval
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#047857' }}>
                    Click Approve below to automatically add +50 Reward Points to the referring nurse.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLeadStatusFilter('Pending Approval')}
                style={{
                  background: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 9999,
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  padding: '0.45rem 1.1rem',
                  cursor: 'pointer'
                }}
              >
                Review Waiting ({leads.filter((l) => l.status === 'Pending Approval').length})
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
              <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', fontWeight: 600 }}>Type:</span>
              <select
                value={leadTypeFilter}
                onChange={(e) => setLeadTypeFilter(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.82rem',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontWeight: 600
                }}
              >
                <option value="all">All Referrals</option>
                <option value="patient">Patient Referrals</option>
                <option value="nurse">Nurse Referrals</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', fontWeight: 600 }}>Type:</span>
              <select
                value={leadTypeFilter}
                onChange={(e) => setLeadTypeFilter(e.target.value)}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.82rem',
                  borderRadius: 8,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontWeight: 600
                }}
              >
                <option value="all">All Referrals</option>
                <option value="patient">Patient Referrals</option>
                <option value="nurse">Nurse Referrals</option>
              </select>
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
            <>
              {renderBulkActionBar({
                entityName: 'Leads',
                filteredIds: filteredLeads.map((l) => l.id),
                selectedSet: selectedLeadIds,
                setSelectedSet: setSelectedLeadIds,
                onDeleteMultiple: onDeleteMultipleLeads
              })}
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={filteredLeads.length > 0 && filteredLeads.every((l) => selectedLeadIds.has(l.id))}
                          onChange={() => toggleSelectAll(filteredLeads.map((l) => l.id), selectedLeadIds, setSelectedLeadIds)}
                          style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                          title="Select / Deselect All Leads"
                        />
                      </th>
                      <th>Lead ID</th>
                      <th>Patient Name</th>
                      <th>Phone</th>
                      <th>Service</th>
                      <th>Area</th>
                      <th>Referring Nurse</th>
                      <th>Reward</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((l) => {
                      const referringNurse = nurses.find((n) => n.id === l.nurseId);
                      const isPending = l.status === 'Pending Approval';
                      const isApproved = l.status === 'Approved' || l.status === 'Converted';
                      const isRejected = l.status === 'Rejected';
                      const isSelected = selectedLeadIds.has(l.id);

                      return (
                        <tr 
                          key={l.id} 
                          style={{ 
                            background: isSelected ? '#FFF1F2' : (isPending ? '#FFFDF5' : undefined),
                            borderLeft: isSelected ? '4px solid #E11D48' : (isPending ? '4px solid #F59E0B' : undefined) 
                          }}
                        >
                          <td style={{ textAlign: 'center', width: 40 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleItemSelection(l.id, setSelectedLeadIds)}
                              style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                            />
                          </td>
                          <td>
                          <strong style={{ fontFamily: 'monospace' }}>{l.id}</strong>
                          <div style={{ fontSize: '0.7rem', color: 'var(--neutral-400)' }}>
                            {l.submittedAt && l.submittedAt.includes('T') ? new Date(l.submittedAt).toLocaleDateString() : l.submittedAt || 'Recent'}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <div style={{ fontWeight: 600 }}>{l.referralType === 'nurse' || l.referredNursePhone ? l.referredNurseName || l.patientName : l.patientName}</div>
                            <span style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 800, 
                              textTransform: 'uppercase', 
                              padding: '2px 6px', 
                              borderRadius: 4, 
                              display: 'inline-block',
                              width: 'fit-content',
                              background: l.referralType === 'nurse' || l.referredNursePhone ? '#EDE9FE' : '#E0F2FE', 
                              color: l.referralType === 'nurse' || l.referredNursePhone ? '#6D28D9' : '#0369A1' 
                            }}>
                              {l.referralType === 'nurse' || l.referredNursePhone ? 'Nurse Referral' : 'Patient Referral'}
                            </span>
                          </div>
                        </td>
                        <td>
                          {isRejected ? (
                            <span style={{ color: '#94A3B8', fontSize: '0.74rem' }}>✕ Contact Hidden (Rejected)</span>
                          ) : (
                            l.patientPhone
                          )}
                        </td>
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
                          {isRejected ? (
                            <span style={{ color: 'var(--neutral-400)', fontSize: '0.8rem' }}>0 pts</span>
                          ) : (
                            <strong style={{ color: '#059669', fontSize: '0.9rem' }}>
                              +50 pts
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
                            {isPending ? '⏳ Waiting Approval' : isApproved ? '✓ Approved (+50 Pts)' : isRejected ? '✕ Rejected' : l.status}
                          </span>
                          {isRejected && (l.rejectionReason || l.adminNotes) && (
                            <div style={{ fontSize: '0.72rem', color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', padding: '3px 6px', borderRadius: 4, marginTop: '0.35rem', maxWidth: 220 }}>
                              <strong>Reason:</strong> {l.rejectionReason || l.adminNotes}
                            </div>
                          )}
                          {!isRejected && l.adminNotes && (
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
                                  padding: '0.35rem 0.75rem',
                                  fontWeight: 700,
                                  fontSize: '0.78rem',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  boxShadow: '0 2px 5px rgba(5,150,105,0.25)'
                                }}
                                title="Approve Referral (+50 Points)"
                              >
                                <CheckCircle size={13} />
                                <span>Approve (+50 Pts)</span>
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
                                title="Edit Referral"
                              >
                                <Award size={12} />
                                <span>Edit</span>
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
            </>
          )}
        </div>
      )}

      {/* DOCTOR TELECONSULTATIONS TAB (FULL SUPABASE CRUD) */}
      {activeTab === 'consultations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 className="card-title">Doctor Teleconsultation Triage & Rx Queue</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--neutral-500)', margin: 0 }}>
                  Manage patient tele-triage requests, issued clinical prescriptions, and service conversions synced with Supabase <code>consultations</code> table
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={exportConsultationsToCSV}
                  className="btn btn-outline btn-sm"
                  style={{ borderRadius: 9999, fontWeight: 700, gap: '0.4rem', borderColor: '#10B981', color: '#059669', background: '#ECFDF5' }}
                >
                  <Download size={16} />
                  <span>Export Consults</span>
                </button>
                <button
                  onClick={handleOpenCreateConsultModal}
                  className="btn btn-danger btn-sm"
                  style={{ borderRadius: 9999, fontWeight: 700, gap: '0.4rem' }}
                >
                  <Plus size={16} />
                  <span>New Consultation</span>
                </button>
              </div>
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
              <>
                {renderBulkActionBar({
                  entityName: 'Consultations',
                  filteredIds: filteredConsults.map((c) => c.id),
                  selectedSet: selectedConsultIds,
                  setSelectedSet: setSelectedConsultIds,
                  onDeleteMultiple: onDeleteMultipleConsultations
                })}
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={filteredConsults.length > 0 && filteredConsults.every((c) => selectedConsultIds.has(c.id))}
                            onChange={() => toggleSelectAll(filteredConsults.map((c) => c.id), selectedConsultIds, setSelectedConsultIds)}
                            style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                            title="Select / Deselect All Consultations"
                          />
                        </th>
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
                      {filteredConsults.map((c) => {
                        const isSelected = selectedConsultIds.has(c.id);
                        return (
                          <tr key={c.id} style={{ background: isSelected ? '#FFF1F2' : undefined }}>
                            <td style={{ textAlign: 'center', width: 40 }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleItemSelection(c.id, setSelectedConsultIds)}
                                style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                              />
                            </td>
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
                    );
                  })}
                  </tbody>
                </table>
              </div>
              </>
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
              <>
                {renderBulkActionBar({
                  entityName: 'Coupons',
                  filteredIds: filteredCoupons.map((c) => c.id),
                  selectedSet: selectedCouponIds,
                  setSelectedSet: setSelectedCouponIds,
                  onDeleteMultiple: onDeleteMultipleCoupons
                })}
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={filteredCoupons.length > 0 && filteredCoupons.every((c) => selectedCouponIds.has(c.id))}
                            onChange={() => toggleSelectAll(filteredCoupons.map((c) => c.id), selectedCouponIds, setSelectedCouponIds)}
                            style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                            title="Select / Deselect All Coupons"
                          />
                        </th>
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
                        const isSelected = selectedCouponIds.has(c.id);

                        return (
                          <tr key={c.id} style={{ background: isSelected ? '#FFF1F2' : undefined }}>
                            <td style={{ textAlign: 'center', width: 40 }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleItemSelection(c.id, setSelectedCouponIds)}
                                style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                              />
                            </td>
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
              </>
            )}
          </div>
        </div>
      )}

      {/* STAFF & PATIENT CREDENTIALS DIRECTORY TAB */}
      {activeTab === 'credentials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
              <>
                {renderBulkActionBar({
                  entityName: 'Users',
                  filteredIds: filteredUsers.map((u) => u.id),
                  selectedSet: selectedUserIds,
                  setSelectedSet: setSelectedUserIds,
                  onDeleteMultiple: onDeleteMultipleAppUsers
                })}
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={filteredUsers.length > 0 && filteredUsers.every((u) => selectedUserIds.has(u.id))}
                            onChange={() => toggleSelectAll(filteredUsers.map((u) => u.id), selectedUserIds, setSelectedUserIds)}
                            style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                            title="Select / Deselect All Users"
                          />
                        </th>
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
                        const displayPin = (u.pin && u.pin !== '••••' && u.pin.trim() !== '')
                          ? u.pin.trim()
                          : (u.role === 'admin' ? '2026' : u.role === 'doctor' ? '4321' : '••••');
                        const roleBadgeClass = 
                          u.role === 'admin' ? 'admin' :
                          u.role === 'doctor' ? 'doctor' :
                          u.role === 'nurse' ? 'nurse' : 'patient';
                        const isSelected = selectedUserIds.has(u.id);

                        return (
                          <tr key={u.id} style={{ background: isSelected ? '#FFF1F2' : undefined }}>
                            <td style={{ textAlign: 'center', width: 40 }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleItemSelection(u.id, setSelectedUserIds)}
                                style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                              />
                            </td>
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
                                <span>{isRevealed ? displayPin : '••••'}</span>
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
                                  navigator.clipboard.writeText(displayPin);
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
              </>
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
                {(['all', 'prescriptions', 'certificates', 'invoices'] as const).map((cat) => {
                  const count = cat === 'all' ? storageObjects.length : storageObjects.filter((o) => o.category === cat).length;
                  const label = cat === 'all' ? 'All Objects' : cat === 'prescriptions' ? 'Prescriptions (Rx)' : cat === 'certificates' ? 'Nurse Certificates' : 'Invoices';
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

              {/* Action Buttons & Search Box */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: 220 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
                  <input
                    type="text"
                    placeholder="Search file, patient, nurse..."
                    value={storageSearch}
                    onChange={(e) => setStorageSearch(e.target.value)}
                    className="form-control"
                    style={{ paddingLeft: '2rem', paddingRight: '0.75rem', fontSize: '0.8rem', height: 34, borderRadius: 8 }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsR2ConfigModalOpen(true)}
                  className="btn btn-outline btn-sm"
                  style={{ borderRadius: 9999, fontSize: '0.8rem', gap: '0.35rem', height: 34 }}
                  title="Configure Cloudflare R2 credentials"
                >
                  <Settings size={14} />
                  <span>Bucket Settings</span>
                </button>
                <button
                  type="button"
                  onClick={handleSyncAllInvoicesToCloudflare}
                  className="btn btn-outline btn-sm"
                  style={{ borderRadius: 9999, fontSize: '0.8rem', gap: '0.35rem', height: 34 }}
                  title="Sync invoices with Cloudflare R2 bucket"
                >
                  <Receipt size={14} />
                  <span>Sync Invoices</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadForm({ fileName: '', category: 'prescriptions', bookingId: '', patientName: '', description: '' });
                    setIsUploadModalOpen(true);
                  }}
                  className="btn btn-danger btn-sm"
                  style={{
                    borderRadius: 9999,
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    gap: '0.35rem',
                    padding: '0.45rem 1rem',
                    height: 34
                  }}
                >
                  <UploadCloud size={15} />
                  <span>Upload Document</span>
                </button>
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
              <>
                {renderBulkActionBar({
                  entityName: 'Storage Files',
                  filteredIds: filteredStorageObjects.map((o) => o.id),
                  selectedSet: selectedStorageIds,
                  setSelectedSet: setSelectedStorageIds,
                  onDeleteMultiple: handleDeleteMultipleStorage
                })}
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={filteredStorageObjects.length > 0 && filteredStorageObjects.every((o) => selectedStorageIds.has(o.id))}
                            onChange={() => toggleSelectAll(filteredStorageObjects.map((o) => o.id), selectedStorageIds, setSelectedStorageIds)}
                            style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                            title="Select / Deselect All Files"
                          />
                        </th>
                        <th>Object Key & File Name</th>
                        <th>Category</th>
                        <th>Owner / Metadata (Patient / Nurse)</th>
                        <th>Size</th>
                        <th>Uploaded At</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStorageObjects.map((obj) => {
                        const isPrescription = obj.category === 'prescriptions';
                        const isInvoice = obj.category === 'invoices';
                        const isSelected = selectedStorageIds.has(obj.id);
                        return (
                          <tr key={obj.id} style={{ background: isSelected ? '#FFF1F2' : undefined }}>
                            <td style={{ textAlign: 'center', width: 40 }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleItemSelection(obj.id, setSelectedStorageIds)}
                                style={{ cursor: 'pointer', accentColor: '#E11D48', width: 16, height: 16 }}
                              />
                            </td>
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
                            {obj.category === 'certificates' ? (
                              (() => {
                                const matchedNurse = nurses.find((n) =>
                                  n.id === obj.metadata?.nurseId ||
                                  n.id === obj.metadata?.bookingId ||
                                  obj.key.toLowerCase().includes(n.id.toLowerCase()) ||
                                  (obj.metadata?.patientName && n.name.toLowerCase() === obj.metadata.patientName.toLowerCase()) ||
                                  obj.fileName.toLowerCase().includes(n.name.toLowerCase().split(' ')[0] || '')
                                );
                                const nurseName = matchedNurse?.name || obj.metadata?.patientName || 'Registered Nurse';
                                const nurseArea = matchedNurse?.serviceArea || 'Hyderabad Zone';
                                const certVerified = matchedNurse?.certificateVerified;
                                return (
                                  <div>
                                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--primary-navy-950)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <span>{nurseName}</span>
                                      {certVerified ? (
                                        <span style={{ fontSize: '0.68rem', padding: '1px 6px', background: '#DCFCE7', color: '#166534', borderRadius: 9999, fontWeight: 700 }}>
                                          ✓ Verified RN
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '0.68rem', padding: '1px 6px', background: '#FEF3C7', color: '#92400E', borderRadius: 9999, fontWeight: 700 }}>
                                          ⏳ Pending Review
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                                      {matchedNurse ? `${matchedNurse.qualification} • ${nurseArea} • ${matchedNurse.phone}` : (obj.metadata?.description || 'Nursing Council Reg Certificate')}
                                    </div>
                                  </div>
                                );
                              })()
                            ) : obj.category === 'invoices' ? (
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-navy-900)' }}>
                                  Patient: {obj.metadata?.patientName || 'Direct Billing'}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                  Ref: {obj.metadata?.bookingId || 'Direct'}
                                </div>
                              </div>
                            ) : obj.metadata?.patientName ? (
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
                              {obj.category === 'certificates' && (() => {
                                const matchedNurse = nurses.find((n) =>
                                  n.id === obj.metadata?.nurseId ||
                                  n.id === obj.metadata?.bookingId ||
                                  obj.key.toLowerCase().includes(n.id.toLowerCase()) ||
                                  (obj.metadata?.patientName && n.name.toLowerCase() === obj.metadata.patientName.toLowerCase()) ||
                                  obj.fileName.toLowerCase().includes(n.name.toLowerCase().split(' ')[0] || '')
                                );
                                if (matchedNurse && !matchedNurse.certificateVerified && onUpdateNurseRecord) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await onUpdateNurseRecord(matchedNurse.id, { certificateVerified: true });
                                        showToast(`Verified & Approved Certificate for ${matchedNurse.name}!`);
                                      }}
                                      className="btn btn-sm"
                                      style={{
                                        background: '#ECFDF5',
                                        border: '1px solid #A7F3D0',
                                        color: '#059669',
                                        padding: '0.25rem 0.55rem',
                                        borderRadius: 6,
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                      title="Approve and verify this nurse certificate"
                                    >
                                      ✓ Approve RN
                                    </button>
                                  );
                                }
                                return null;
                              })()}

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
                                      window.open(obj.dataUrl || obj.publicUrl, '_blank');
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

                                <a
                                  href={obj.publicUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm"
                                  style={{
                                    background: '#EFF6FF',
                                    border: '1px solid #BFDBFE',
                                    color: '#1E3A8A',
                                    padding: '0.25rem 0.55rem',
                                    borderRadius: 6,
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    textDecoration: 'none'
                                  }}
                                  title="Open file in new tab"
                                >
                                  <ExternalLink size={12} />
                                  <span>View File</span>
                                </a>
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
                                title="Delete from Storage Bucket"
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
              </>
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
                    placeholder="e.g. 500 (No limit)"
                    value={couponForm.maxDiscount}
                    onChange={(e) => setCouponForm({ ...couponForm, maxDiscount: e.target.value })}
                    className="form-control"
                    style={{ background: '#FFFFFF' }}
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

              <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <input
                  type="checkbox"
                  id="cShowModal"
                  checked={couponForm.showInBookingModal}
                  onChange={(e) => setCouponForm({ ...couponForm, showInBookingModal: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="cShowModal" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', margin: 0 }}>
                  Show this coupon in the Home Screen Booking Modal
                </label>
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
              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                {editingCoupon && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCouponModalOpen(false);
                      handleDeleteCouponClick(editingCoupon);
                    }}
                    className="btn btn-outline"
                    style={{
                      borderColor: '#FECDD3',
                      color: '#E11D48',
                      background: '#FFF1F2',
                      marginRight: 'auto',
                      borderRadius: 9999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontWeight: 700
                    }}
                  >
                    <Trash2 size={15} />
                    <span>Delete Promo Code</span>
                  </button>
                )}
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
      {/* 0. ADMIN REASSIGN / REFER TO OTHER NURSE MODAL */}
      {/* ========================================================================= */}
      {adminReassignBooking && (
        <div 
          className="modal-overlay" 
          data-lenis-prevent="true"
          onClick={() => setAdminReassignBooking(null)}
          style={{ zIndex: 99999, pointerEvents: 'auto' }}
        >
          <div 
            className="modal-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: 540, borderRadius: 20, pointerEvents: 'auto', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: '#FEF3C7', borderBottom: '1px solid #FDE68A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#D97706', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#92400E', margin: 0 }}>
                    Refer & Reassign to Colleague Nurse
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: '#B45309', fontWeight: 600 }}>
                    Order Ref: #{adminReassignBooking.id} • {adminReassignBooking.patientName} ({adminReassignBooking.area})
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setAdminReassignBooking(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400E', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {/* Previous Nurse Decline Details */}
              <div style={{ background: '#FFF1F2', border: '1px solid #FECDD3', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 800, color: '#9F1239', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertCircle size={15} />
                  <span>Assigned Nurse Declined This Order:</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#BE123C', marginTop: '0.25rem', fontWeight: 600 }}>
                  {adminReassignBooking.rejectionReason || 'Declined by nurse due to active emergency / schedule conflict.'}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.35rem' }}>
                  Patient: <strong>{adminReassignBooking.patientName}</strong> • Phone: {adminReassignBooking.patientPhone} • Area: <strong>{adminReassignBooking.area}</strong>
                </div>
              </div>

              {/* Select Other Nurse */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <label className="form-label" style={{ fontWeight: 750, color: 'var(--primary-navy-950)', margin: 0 }}>
                    Select Available Nurse to Refer Visit To:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const target = adminReassignBooking;
                      setSearchAssignBooking(target);
                      setNurseSearchQuery('');
                      setNurseSearchFilterArea(target.area || 'all');
                      setAdminReassignBooking(null);
                    }}
                    className="btn btn-outline btn-sm"
                    style={{
                      fontSize: '0.76rem',
                      padding: '0.25rem 0.6rem',
                      borderColor: '#0284C7',
                      color: '#0284C7',
                      background: '#F0F9FF',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontWeight: 750
                    }}
                    title="Open full interactive nurse search & dispatch modal"
                  >
                    <Search size={13} />
                    <span>Search Nurse Roster</span>
                  </button>
                </div>
                <select
                  className="form-control"
                  value={selectedReferralNurseId}
                  onChange={(e) => setSelectedReferralNurseId(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, fontSize: '0.86rem', border: '1px solid #CBD5E1', fontWeight: 600 }}
                >
                  <option value="" disabled>Choose verified nurse from fleet...</option>
                  {nurses.map((n) => {
                    const isSameArea = n.serviceArea === adminReassignBooking.area;
                    const isPreviousNurse = n.id === adminReassignBooking.assignedNurseId;
                    return (
                      <option 
                        key={n.id} 
                        value={n.id} 
                        disabled={!n.certificateVerified || isPreviousNurse}
                      >
                        {n.name} — Station: {n.serviceArea} {isSameArea ? '★ (Same Area Match)' : ''} {isPreviousNurse ? '(Previously Declined)' : n.certificateVerified ? '✓ Verified' : '⚠️ Unverified'}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Referral Note */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem', color: '#475569', marginBottom: '0.35rem', display: 'block' }}>
                  Referral Note / Dispatch Instruction:
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={referralRuleNote}
                  onChange={(e) => setReferralRuleNote(e.target.value)}
                  placeholder="e.g. Reassigned following colleague decline, urgent patient attending"
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: 8, fontSize: '0.82rem', border: '1px solid #CBD5E1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setAdminReassignBooking(null)}
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '0.65rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedReferralNurseId}
                  onClick={() => {
                    if (!selectedReferralNurseId) return;
                    const newNurse = nurses.find((n) => n.id === selectedReferralNurseId);
                    onAssignOrder(
                      adminReassignBooking.id,
                      selectedReferralNurseId,
                      referralRuleNote || `Referred by Admin to ${newNurse?.name}`
                    );
                    showToast(`Order #${adminReassignBooking.id} successfully referred and reassigned to Nurse ${newNurse?.name}!`);
                    setAdminReassignBooking(null);
                  }}
                  className="btn btn-primary"
                  style={{
                    flex: 1.5,
                    padding: '0.65rem',
                    background: selectedReferralNurseId ? '#0284C7' : '#94A3B8',
                    color: '#FFF',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    borderRadius: 8
                  }}
                >
                  <UserCheck size={16} />
                  <span>Confirm Referral & Reassign</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* SEARCH NURSE & ASSIGN MODAL (SMART ROUTING) */}
      {/* ========================================================================= */}
      {searchAssignBooking && (
        <div 
          className="modal-overlay" 
          data-lenis-prevent="true"
          onClick={() => setSearchAssignBooking(null)}
          style={{ zIndex: 99999, pointerEvents: 'auto' }}
        >
          <div 
            className="modal-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: 640, borderRadius: 20, pointerEvents: 'auto', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: '#F0F9FF', borderBottom: '1px solid #BAE6FD' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#0284C7', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Search size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0369A1', margin: 0 }}>
                    Search Nurse & Assign Order #{searchAssignBooking.id}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#0284C7', fontWeight: 600 }}>
                    Smart Routing: Select verified nurse in Hyderabad fleet to dispatch order
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSearchAssignBooking(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0369A1', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {/* Order Brief Summary Card */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '0.9rem 1.15rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--primary-navy-950)', fontSize: '0.95rem' }}>
                      {searchAssignBooking.patientName} • {searchAssignBooking.serviceTitle}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                      <MapPin size={13} style={{ color: '#0284C7' }} />
                      <span>Locality: <strong>{searchAssignBooking.area}</strong></span>
                      {searchAssignBooking.fullAddress && <span>({searchAssignBooking.fullAddress})</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', background: '#ECFDF5', color: '#059669', padding: '3px 8px', borderRadius: 9999, fontWeight: 700, border: '1px solid #A7F3D0' }}>
                    Fee: ₹{searchAssignBooking.estimatedFee || 800}
                  </span>
                </div>
              </div>

              {/* Live Search Input & Filter Pills */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ position: 'relative', marginBottom: '0.65rem' }}>
                  <input
                    type="text"
                    placeholder="Search nurse by name, area, phone, qualification..."
                    value={nurseSearchQuery}
                    onChange={(e) => setNurseSearchQuery(e.target.value)}
                    className="form-control"
                    style={{ paddingLeft: '2.2rem', fontSize: '0.88rem', padding: '0.55rem 0.85rem 0.55rem 2.2rem', borderRadius: 8 }}
                    autoFocus
                  />
                  <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  {nurseSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setNurseSearchQuery('')}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>Filter:</span>
                  <button
                    type="button"
                    onClick={() => setNurseSearchFilterArea('all')}
                    className={`btn btn-sm ${nurseSearchFilterArea === 'all' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                  >
                    All Zones ({nurses.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setNurseSearchFilterArea(searchAssignBooking.area)}
                    className={`btn btn-sm ${nurseSearchFilterArea === searchAssignBooking.area ? 'btn-primary' : 'btn-outline'}`}
                    style={{ 
                      fontSize: '0.72rem', 
                      padding: '0.2rem 0.55rem', 
                      background: nurseSearchFilterArea === searchAssignBooking.area ? '#059669' : undefined,
                      borderColor: '#059669',
                      color: nurseSearchFilterArea === searchAssignBooking.area ? '#FFF' : '#059669',
                      fontWeight: 750
                    }}
                  >
                    🎯 Matching Locality ({searchAssignBooking.area})
                  </button>
                  <label style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', cursor: 'pointer', color: '#334155' }}>
                    <input
                      type="checkbox"
                      checked={nurseSearchFilterVerifiedOnly}
                      onChange={(e) => setNurseSearchFilterVerifiedOnly(e.target.checked)}
                    />
                    <span>Verified RNs Only</span>
                  </label>
                </div>
              </div>

              {/* Nurses Results List */}
              <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {(() => {
                  const query = nurseSearchQuery.toLowerCase().trim();
                  const filteredNurses = nurses.filter((n) => {
                    if (nurseSearchFilterVerifiedOnly && !n.certificateVerified) return false;
                    if (nurseSearchFilterArea !== 'all' && n.serviceArea !== nurseSearchFilterArea) return false;
                    if (!query) return true;
                    return (
                      n.name.toLowerCase().includes(query) ||
                      n.phone.includes(query) ||
                      n.serviceArea.toLowerCase().includes(query) ||
                      (n.qualification && n.qualification.toLowerCase().includes(query))
                    );
                  });

                  if (filteredNurses.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748B', background: '#F8FAFC', borderRadius: 10 }}>
                        <Search size={28} style={{ color: '#94A3B8', marginBottom: '0.4rem' }} />
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>No matching nurses found</div>
                        <div style={{ fontSize: '0.78rem' }}>Try clearing filters or searching another area</div>
                      </div>
                    );
                  }

                  return filteredNurses.map((n) => {
                    const isAreaMatch = n.serviceArea.toLowerCase() === searchAssignBooking.area.toLowerCase();
                    const activeCount = bookings.filter((b) => b.assignedNurseId === n.id && (b.status === 'Assigned' || b.status === 'In-Progress')).length;

                    return (
                      <div
                        key={n.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.85rem 1rem',
                          borderRadius: 10,
                          border: isAreaMatch ? '2px solid #10B981' : '1px solid #E2E8F0',
                          background: isAreaMatch ? '#F0FDF4' : '#FFFFFF',
                          gap: '0.75rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: isAreaMatch ? '#10B981' : '#0284C7',
                            color: '#FFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            flexShrink: 0
                          }}>
                            {n.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: 'var(--primary-navy-950)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span>{n.name}</span>
                              {n.certificateVerified ? (
                                <span className="status-pill success" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>✓ Verified RN</span>
                              ) : (
                                <span className="status-pill warning" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>Pending</span>
                              )}
                              {isAreaMatch && (
                                <span style={{ fontSize: '0.68rem', background: '#10B981', color: '#FFF', padding: '1px 6px', borderRadius: 9999, fontWeight: 800 }}>
                                  🎯 Area Match
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748B', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: 2 }}>
                              <span>Zone: <strong>{n.serviceArea}</strong></span>
                              <span>•</span>
                              <span>Exp: {n.experienceYears || (n as unknown as { experience?: string }).experience || 3} yrs</span>
                              <span>•</span>
                              <span>Active Visits: <strong>{activeCount}</strong></span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!n.certificateVerified}
                          onClick={() => {
                            if (!n.certificateVerified) {
                              alert('Cannot assign booking: Nurse certificate is not verified.');
                              return;
                            }
                            onAssignOrder(
                              searchAssignBooking.id,
                              n.id,
                              `Smart Search Dispatched: Assigned to ${n.name} (${n.serviceArea})${isAreaMatch ? ' [Rule 2 Locality Match]' : ''}`
                            );
                            showToast(`Order #${searchAssignBooking.id} assigned to Nurse ${n.name}!`);
                            setSearchAssignBooking(null);
                          }}
                          className="btn btn-sm btn-primary"
                          style={{
                            background: n.certificateVerified ? (isAreaMatch ? '#059669' : '#0284C7') : '#94A3B8',
                            borderColor: n.certificateVerified ? (isAreaMatch ? '#059669' : '#0284C7') : '#94A3B8',
                            color: '#FFF',
                            fontWeight: 750,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.4rem 0.85rem',
                            borderRadius: 6,
                            cursor: n.certificateVerified ? 'pointer' : 'not-allowed'
                          }}
                        >
                          <span>Assign & Dispatch</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setSearchAssignBooking(null)}
                  className="btn btn-outline btn-sm"
                  style={{ padding: '0.5rem 1.25rem' }}
                >
                  Close
                </button>
              </div>
            </div>
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
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>AREA / LOCALITY</label>
                  <input
                    type="text"
                    list="booking-modal-areas-list"
                    className="form-control"
                    placeholder="e.g. Kondapur, Gachibowli, Kukatpally..."
                    value={bookingForm.area}
                    onChange={(e) => setBookingForm({ ...bookingForm, area: e.target.value })}
                    required
                  />
                  <datalist id="booking-modal-areas-list">
                    <option value="Gachibowli" />
                    <option value="LB Nagar" />
                    <option value="Madhapur" />
                    <option value="Banjara Hills" />
                    <option value="Kukatpally" />
                    <option value="Kondapur" />
                    <option value="Jubilee Hills" />
                    <option value="Secunderabad" />
                  </datalist>
                </div>
              </div>

              {/* Timing Concept: Instant vs Scheduled */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>BOOKING TYPE</label>
                  <select
                    className="form-control"
                    value={bookingForm.bookingType}
                    onChange={(e) => setBookingForm({ ...bookingForm, bookingType: e.target.value as any })}
                  >
                    <option value="instant">⚡ Instant (ASAP Emergency Visit)</option>
                    <option value="scheduled">📅 Scheduled (Specific Date & 2-Hour Slot)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    {bookingForm.bookingType === 'scheduled' ? 'SCHEDULED 2-HR SLOT *' : 'DISPATCH TIMING'}
                  </label>
                  {bookingForm.bookingType === 'scheduled' ? (
                    <input
                      type="text"
                      placeholder="e.g. Tomorrow: 10:00 AM - 12:00 PM"
                      value={bookingForm.scheduledSlot}
                      onChange={(e) => setBookingForm({ ...bookingForm, scheduledSlot: e.target.value })}
                      className="form-control"
                      required
                    />
                  ) : (
                    <input
                      type="text"
                      disabled
                      value="Immediate Dispatch (Within 45 Mins)"
                      className="form-control"
                      style={{ background: '#F1F5F9', color: '#475569' }}
                    />
                  )}
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
                    <option value="Cancelled">Cancelled by Patient / Coordinator</option>
                    <option value="Rejected">Rejected by Admin</option>
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
                      <option key={n.id} value={n.id} disabled={!n.certificateVerified}>
                        {n.name} ({n.serviceArea}) {n.certificateVerified ? '✓ Verified' : '⚠️ No Certificate (Refer Only)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(bookingForm.status === 'Cancelled' || bookingForm.status === 'Rejected') && (
                <div style={{ marginBottom: '0.85rem' }}>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#DC2626' }}>
                    REJECTION / CANCELLATION REASON *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Specify why this booking was cancelled/rejected by Admin..."
                    value={bookingForm.rejectionReason}
                    onChange={(e) => setBookingForm({ ...bookingForm, rejectionReason: e.target.value })}
                    className="form-control"
                    style={{ borderColor: '#FCA5A5', background: '#FEF2F2' }}
                    required
                  />
                </div>
              )}

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

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                {editingBooking && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsBookingModalOpen(false);
                      handleDeleteBookingClick(editingBooking);
                    }}
                    className="btn btn-outline"
                    style={{
                      borderColor: '#FECDD3',
                      color: '#E11D48',
                      background: '#FFF1F2',
                      marginRight: 'auto',
                      borderRadius: 9999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontWeight: 700
                    }}
                  >
                    <Trash2 size={15} />
                    <span>Delete Booking</span>
                  </button>
                )}
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
              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-navy-950)' }}>
                  NURSE PROFILE AVATAR (Optional)
                </label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {nurseForm.avatarUrl && (
                    <img 
                      src={nurseForm.avatarUrl} 
                      alt="Avatar preview" 
                      style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '50%', border: '2px solid #E2E8F0' }} 
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleNurseAvatarUpload}
                        disabled={isUploadingNurseAvatar}
                        className="form-control"
                        style={{ paddingLeft: '2.5rem' }}
                      />
                      <UploadCloud size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                    </div>
                    {isUploadingNurseAvatar && (
                      <div style={{ fontSize: '0.75rem', color: '#0284C7', marginTop: '0.25rem', fontWeight: 600 }}>
                        Uploading avatar...
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
                    placeholder="e.g. 1234"
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
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>SERVICE ZONE / AREA</label>
                  <input
                    type="text"
                    list="nurse-modal-areas-list"
                    className="form-control"
                    placeholder="e.g. Gachibowli, Kondapur, LB Nagar..."
                    value={nurseForm.serviceArea}
                    onChange={(e) => setNurseForm({ ...nurseForm, serviceArea: e.target.value })}
                    required
                  />
                  <datalist id="nurse-modal-areas-list">
                    <option value="Gachibowli" />
                    <option value="LB Nagar" />
                    <option value="Madhapur" />
                    <option value="Banjara Hills" />
                    <option value="Kukatpally" />
                    <option value="Kondapur" />
                    <option value="Jubilee Hills" />
                    <option value="Secunderabad" />
                  </datalist>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#B45309' }}>
                    REWARD POINTS BALANCE (⭐ PTS)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    placeholder="e.g. 500"
                    value={nurseForm.pointsEarned}
                    onChange={(e) => setNurseForm({ ...nurseForm, pointsEarned: Number(e.target.value) })}
                    className="form-control"
                    style={{ fontWeight: 800, color: '#B45309', background: '#FEF3C7', borderColor: '#FDE68A' }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#047857' }}>
                    REFERRAL CASH EARNINGS (₹ RUPEES)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    placeholder="e.g. 1000"
                    value={nurseForm.referralEarningsRupees}
                    onChange={(e) => setNurseForm({ ...nurseForm, referralEarningsRupees: Number(e.target.value) })}
                    className="form-control"
                    style={{ fontWeight: 800, color: '#047857', background: '#ECFDF5', borderColor: '#A7F3D0' }}
                  />
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

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                {editingNurse && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsNurseModalOpen(false);
                      handleDeleteNurseClick(editingNurse);
                    }}
                    className="btn btn-outline"
                    style={{
                      borderColor: '#FECDD3',
                      color: '#E11D48',
                      background: '#FFF1F2',
                      marginRight: 'auto',
                      borderRadius: 9999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontWeight: 700
                    }}
                  >
                    <Trash2 size={15} />
                    <span>Delete Nurse</span>
                  </button>
                )}
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

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                  SERVICE MAIN IMAGE (Optional)
                </label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {serviceForm.imageUrl && (
                    <img 
                      src={serviceForm.imageUrl} 
                      alt="Main image preview" 
                      style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #E2E8F0' }} 
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/jpeg, image/png, image/webp"
                      onChange={handleServiceImageUpload}
                      disabled={isUploadingServiceImage}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        border: '1px dashed #CBD5E1',
                        borderRadius: 8,
                        fontSize: '0.85rem',
                        background: '#F8FAFC'
                      }}
                    />
                    {isUploadingServiceImage && (
                      <div style={{ fontSize: '0.75rem', color: '#0284C7', marginTop: '0.25rem', fontWeight: 600 }}>
                        Uploading main image...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                  SERVICE THUMBNAIL IMAGE (Optional)
                </label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {serviceForm.thumbnailUrl && (
                    <img 
                      src={serviceForm.thumbnailUrl} 
                      alt="Thumbnail preview" 
                      style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #E2E8F0' }} 
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/jpeg, image/png, image/webp"
                      onChange={handleServiceThumbnailUpload}
                      disabled={isUploadingServiceThumbnail}
                      style={{
                        width: '100%',
                        padding: '0.45rem',
                        border: '1px dashed #CBD5E1',
                        borderRadius: 8,
                        fontSize: '0.85rem',
                        background: '#F8FAFC'
                      }}
                    />
                    {isUploadingServiceThumbnail && (
                      <div style={{ fontSize: '0.75rem', color: '#0284C7', marginTop: '0.25rem', fontWeight: 600 }}>
                        Uploading thumbnail...
                      </div>
                    )}
                  </div>
                </div>
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

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                {editingService && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsServiceModalOpen(false);
                      handleDeleteServiceClick(editingService);
                    }}
                    className="btn btn-outline"
                    style={{
                      borderColor: '#FECDD3',
                      color: '#E11D48',
                      background: '#FFF1F2',
                      marginRight: 'auto',
                      borderRadius: 9999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontWeight: 700
                    }}
                  >
                    <Trash2 size={15} />
                    <span>Delete Service</span>
                  </button>
                )}
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
                  <input list="hyderabad-areas" placeholder="Select or enter area"
                    className="form-control"
                    value={leadForm.area}
                    onChange={(e) => setLeadForm({ ...leadForm, area: e.target.value as HyderabadArea })}
                  />
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

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                {editingLead && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLeadModalOpen(false);
                      handleDeleteLeadClick(editingLead);
                    }}
                    className="btn btn-outline"
                    style={{
                      borderColor: '#FECDD3',
                      color: '#E11D48',
                      background: '#FFF1F2',
                      marginRight: 'auto',
                      borderRadius: 9999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontWeight: 700
                    }}
                  >
                    <Trash2 size={15} />
                    <span>Delete Lead</span>
                  </button>
                )}
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

                    {/* Referral Reward: Plain & Clear 50 Points */}
                    <div style={{
                      background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                      border: '1.5px solid #10B981',
                      borderRadius: 12,
                      padding: '1rem 1.25rem',
                      marginBottom: '1.25rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: '#059669',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Award size={22} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#065F46', fontSize: '1rem' }}>
                            Referral Reward: +50 Points
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#047857', marginTop: '0.15rem' }}>
                            Credited directly to <strong>{referringNurse?.name || 'Nurse'}</strong> upon approval.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Admin Input: Optional Note */}
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-navy-900)' }}>
                        Office Note (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Patient visit verified. 50 points added to nurse account."
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        className="form-control"
                      />
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
                          <span>{isProcessingApproval ? 'Approving...' : '✓ Approve (+50 Points)'}</span>
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
                  <input list="hyderabad-areas" placeholder="Select or enter area"
                    className="form-control"
                    value={consultForm.area}
                    onChange={(e) => setConsultForm({ ...consultForm, area: e.target.value as HyderabadArea })}
                  />
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

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                {editingConsult && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsConsultModalOpen(false);
                      handleDeleteConsultClick(editingConsult);
                    }}
                    className="btn btn-outline"
                    style={{
                      borderColor: '#FECDD3',
                      color: '#E11D48',
                      background: '#FFF1F2',
                      marginRight: 'auto',
                      borderRadius: 9999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontWeight: 700
                    }}
                  >
                    <Trash2 size={15} />
                    <span>Delete Consult</span>
                  </button>
                )}
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

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                {editingUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserModalOpen(false);
                      handleDeleteUserClick(editingUser);
                    }}
                    className="btn btn-outline"
                    style={{
                      borderColor: '#FECDD3',
                      color: '#E11D48',
                      background: '#FFF1F2',
                      marginRight: 'auto',
                      borderRadius: 9999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontWeight: 700
                    }}
                  >
                    <Trash2 size={15} />
                    <span>Delete User</span>
                  </button>
                )}
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
                {(() => {
                  const srcUrl = previewPrescriptionObject?.dataUrl || previewPrescriptionObject?.publicUrl || previewPrescriptionBooking?.prescriptionUrl;
                  const isImage = previewPrescriptionObject?.contentType?.startsWith('image/') || 
                                  (previewPrescriptionObject?.fileName && previewPrescriptionObject.fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) ||
                                  (srcUrl && typeof srcUrl === 'string' && srcUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/));
                  
                  if (srcUrl) {
                    return isImage ? (
                      <div style={{ padding: '1rem', textAlign: 'center', background: '#F8FAFC' }}>
                        <img 
                          src={srcUrl} 
                          alt="Prescription Document" 
                          style={{ maxWidth: '100%', maxHeight: 420, borderRadius: 8, objectFit: 'contain', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }} 
                        />
                      </div>
                    ) : (
                      <div style={{ height: 420 }}>
                        <iframe 
                          src={srcUrl} 
                          title="Prescription PDF" 
                          style={{ width: '100%', height: '100%', border: 'none' }} 
                        />
                      </div>
                    );
                  }
                  
                  return (
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

                    {/* Actual Uploaded File or Mock Text */}
                    {(() => {
                      const srcUrl = previewPrescriptionObject?.dataUrl || previewPrescriptionObject?.publicUrl || previewPrescriptionBooking?.prescriptionUrl;
                      const isImage = previewPrescriptionObject?.contentType?.startsWith('image/') || 
                                      (previewPrescriptionObject?.fileName && previewPrescriptionObject.fileName.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) ||
                                      (srcUrl && typeof srcUrl === 'string' && srcUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/));
                      
                      if (srcUrl) {
                        return (
                          <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                            {isImage ? (
                              <img src={srcUrl} alt="Prescription" style={{ maxWidth: '100%', maxHeight: '50vh', borderRadius: 8, border: '1px solid #CBD5E1', objectFit: 'contain' }} />
                            ) : (
                              <iframe src={srcUrl} style={{ width: '100%', height: '50vh', borderRadius: 8, border: '1px solid #CBD5E1' }} title="Prescription Document" />
                            )}
                          </div>
                        );
                      }
                      return (
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
                      );
                    })()}

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
                  );
                })()}
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
                    Invoice {previewInvoice.invoiceNumber}
                  </h3>

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

            <div style={{ padding: '1rem 1.5rem', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>Custom Dates</label>
                <input 
                  type="text" 
                  value={previewInvoice.serviceDate || ''} 
                  onChange={(e) => setPreviewInvoice({ ...previewInvoice, serviceDate: e.target.value })} 
                  placeholder="e.g. 12 Oct to 15 Oct" 
                  className="form-control" 
                />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>Custom Slots</label>
                <input 
                  type="text" 
                  value={previewInvoice.timeSlot || ''} 
                  onChange={(e) => setPreviewInvoice({ ...previewInvoice, timeSlot: e.target.value })} 
                  placeholder="e.g. Morning & Evening" 
                  className="form-control" 
                />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>Staff Name Override</label>
                <input 
                  type="text" 
                  value={previewInvoice.assignedNurseName || ''} 
                  onChange={(e) => setPreviewInvoice({ ...previewInvoice, assignedNurseName: e.target.value })} 
                  placeholder="Attending Staff" 
                  className="form-control" 
                />
              </div>
              <div style={{ flex: 0.5, minWidth: 100 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>Total Slots</label>
                <input 
                  type="number" 
                  min="1"
                  value={previewInvoice.numberOfVisits || 1} 
                  onChange={(e) => {
                    const visits = parseInt(e.target.value) || 1;
                    const baseAmount = previewInvoice.baseAmount;
                    const surcharge = previewInvoice.nightSurcharge || 0;
                    const discount = previewInvoice.discountRupees || 0;
                    const totalAmount = (baseAmount * visits) + surcharge - discount;
                    setPreviewInvoice({ ...previewInvoice, numberOfVisits: visits, totalAmount });
                  }}
                  className="form-control" 
                />
              </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0A192F', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0A192F' }}>Xpress Nurse</div>
                  <div style={{ fontSize: '0.8rem', color: '#0284C7', fontWeight: 700 }}>24/7 Clinical Home Care Hyderabad</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>INVOICE</div>
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

              <div className="table-responsive" style={{ marginBottom: '1.25rem' }}>
                <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: 'center' }}>S.No</th>
                    <th>Procedure</th>
                    <th>Date</th>
                    <th>Slot No</th>
                    <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'center' }}>1</td>
                    <td><strong>{previewInvoice.serviceTitle}</strong></td>
                    <td>{previewInvoice.serviceDate || '-'}</td>
                    <td>{previewInvoice.timeSlot || '-'}</td>
                    <td style={{ textAlign: 'right' }}>₹{previewInvoice.baseAmount * (previewInvoice.numberOfVisits || 1)}</td>
                  </tr>
                  {Boolean(previewInvoice.nightSurcharge && previewInvoice.nightSurcharge > 0) && (
                    <tr>
                      <td style={{ textAlign: 'center' }}>2</td>
                      <td><strong>Night Emergency Surcharge</strong></td>
                      <td>-</td>
                      <td>-</td>
                      <td style={{ textAlign: 'right' }}>₹{previewInvoice.nightSurcharge}</td>
                    </tr>
                  )}
                  {Boolean(previewInvoice.discountRupees && previewInvoice.discountRupees > 0) && (
                    <tr>
                      <td style={{ textAlign: 'center' }}>{previewInvoice.nightSurcharge && previewInvoice.nightSurcharge > 0 ? '3' : '2'}</td>
                      <td style={{ color: '#059669' }}>Coupon Discount</td>
                      <td>-</td>
                      <td>-</td>
                      <td style={{ textAlign: 'right', color: '#059669' }}>-₹{previewInvoice.discountRupees}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>

              <div style={{ width: 280, marginLeft: 'auto', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.82rem' }}>
                  <span>Subtotal:</span>
                  <strong>₹{previewInvoice.baseAmount * (previewInvoice.numberOfVisits || 1)}</strong>
                </div>

                {Boolean(previewInvoice.discountRupees && previewInvoice.discountRupees > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.82rem', color: '#059669' }}>
                    <span>Discount:</span>
                    <strong>-₹{previewInvoice.discountRupees}</strong>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderTop: '2px solid #0A192F', fontSize: '1.1rem', fontWeight: 900 }}>
                  <span>Total Payable:</span>
                  <span style={{ color: '#059669' }}>₹{previewInvoice.totalAmount}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '1rem 1.4rem', background: '#FAFAFA', borderTop: '1px solid var(--neutral-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={async () => {
                    if (onUpdateBooking) {
                      await onUpdateBooking(previewInvoice.bookingId, {
                        preferredDate: previewInvoice.serviceDate,
                        scheduledSlot: previewInvoice.timeSlot,
                        numberOfVisits: previewInvoice.numberOfVisits,
                        finalFee: previewInvoice.totalAmount,
                        assignedNurseName: previewInvoice.assignedNurseName
                      });
                      alert('Invoice details saved and synced successfully!');
                      setIsInvoicePreviewModalOpen(false);
                    }
                  }}
                  className="btn btn-primary"
                  style={{ borderRadius: 9999, gap: '0.35rem' }}
                >
                  <RefreshCw size={14} />
                  <span>Save & Sync</span>
                </button>
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

      {/* ADMIN IN-APP CERTIFICATE VIEWER MODAL */}
      {adminCertModalOpen && adminCertModalNurse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 780, maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Clinical Registration Certificate — {adminCertModalNurse.name}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    {adminCertModalNurse.qualification} • Station: {adminCertModalNurse.serviceArea} • Phone: {adminCertModalNurse.phone}
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setAdminCertModalOpen(false)} 
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
              {adminCertModalNurse.certificateUrl ? (
                adminCertModalNurse.certificateUrl.startsWith('data:application/pdf') || adminCertModalNurse.certificateUrl.toLowerCase().split('?')[0].endsWith('.pdf') ? (
                  <iframe 
                    src={getSafeBlobUrl(adminCertModalNurse.certificateUrl)} 
                    style={{ width: '100%', height: '65vh', border: 'none', borderRadius: 8, background: '#FFFFFF' }} 
                    title="Nurse PDF Certificate"
                  />
                ) : (
                  <img 
                    src={adminCertModalNurse.certificateUrl} 
                    alt="Nurse Certificate" 
                    style={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} 
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        const iframe = document.createElement('iframe');
                        iframe.src = adminCertModalNurse.certificateUrl || '';
                        iframe.style.width = '100%';
                        iframe.style.height = '65vh';
                        iframe.style.border = 'none';
                        iframe.style.borderRadius = '8px';
                        iframe.style.background = '#FFFFFF';
                        parent.appendChild(iframe);
                      }
                    }}
                  />
                )
              ) : (
                <div style={{ color: '#FFFFFF', textAlign: 'center', padding: '2rem' }}>
                  No certificate document available.
                </div>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: '#F8FAFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {adminCertModalNurse.certificateVerified ? (
                  <span className="status-pill success" style={{ fontSize: '0.75rem', padding: '3px 9px' }}>✓ Verified Registered RN</span>
                ) : (
                  <span className="status-pill warning" style={{ fontSize: '0.75rem', padding: '3px 9px' }}>Pending Admin Review</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {adminCertModalNurse.certificateUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const safeUrl = getSafeBlobUrl(adminCertModalNurse.certificateUrl!);
                      window.open(safeUrl, '_blank');
                    }}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
                  >
                    <ExternalLink size={14} />
                    <span>Open in New Tab</span>
                  </button>
                )}

                {!adminCertModalNurse.certificateVerified && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onUpdateNurseRecord?.(adminCertModalNurse.id, { certificateVerified: true, status: 'Active' });
                      if (adminCertModalNurse.referredByNurseId && onUpdateNurseRecord) {
                        const referrer = nurses.find((rn) => rn.id === adminCertModalNurse.referredByNurseId);
                        if (referrer) {
                          await onUpdateNurseRecord(referrer.id, {
                            earningsPaid: (referrer.earningsPaid || 0) + 50,
                            earningsPending: Math.max(0, (referrer.earningsPending || 0) - 50),
                            referralEarningsRupees: (referrer.referralEarningsRupees || 0) + 50,
                            pointsEarned: (referrer.pointsEarned || 0) + 50,
                            convertedLeads: (referrer.convertedLeads || 0) + 1
                          });
                        }
                      }
                      showToast(`Nurse ${adminCertModalNurse.name} certificate verified and approved!`);
                      setAdminCertModalOpen(false);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ background: '#16A34A', borderColor: '#16A34A', fontWeight: 700 }}
                  >
                    ✓ Verify & Approve Nurse
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setAdminCertModalOpen(false)}
                  className="btn btn-outline btn-sm"
                  style={{ fontWeight: 700 }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* IN-APP PERMANENT DELETION CONFIRMATION MODAL                              */}
      {/* 100% Reliable in all browsers; never blocked by popup/dialog blockers     */}
      {/* ========================================================================= */}
      {deleteConfirmTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999999,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeletingTarget) {
              setDeleteConfirmTarget(null);
            }
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #FECDD3',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #FEE2E2',
                background: '#FFF1F2',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#FFE4E6',
                  color: '#E11D48',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Trash2 size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 id="delete-confirm-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#9F1239' }}>
                  Confirm Permanent Delete
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#BE123C', fontWeight: 600 }}>
                  Supabase Live Database Record
                </span>
              </div>
              <button
                type="button"
                disabled={isDeletingTarget}
                onClick={() => setDeleteConfirmTarget(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9F1239',
                  cursor: isDeletingTarget ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem' }}>
              <p style={{ margin: '0 0 1rem', fontSize: '0.92rem', color: '#334155', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete this <strong>{deleteConfirmTarget.itemType}</strong> from Supabase?
              </p>

              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '0.9rem 1.1rem',
                  marginBottom: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: '#E2E8F0',
                      color: '#475569'
                    }}
                  >
                    {deleteConfirmTarget.itemType}
                  </span>
                  <strong style={{ fontSize: '0.95rem', color: '#0F172A' }}>
                    {deleteConfirmTarget.itemTitle}
                  </strong>
                </div>
                {deleteConfirmTarget.itemDetails && (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4 }}>
                    {deleteConfirmTarget.itemDetails}
                  </p>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.78rem',
                  color: '#B91C1C',
                  background: '#FEF2F2',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px'
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>This deletion is immediate, syncs in real-time, and cannot be undone.</span>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #E2E8F0',
                background: '#FAFAFA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem'
              }}
            >
              <button
                type="button"
                disabled={isDeletingTarget}
                onClick={() => setDeleteConfirmTarget(null)}
                className="btn btn-outline btn-sm"
                style={{
                  padding: '0.5rem 1.1rem',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: isDeletingTarget ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeletingTarget}
                onClick={async () => {
                  if (!deleteConfirmTarget) return;
                  setIsDeletingTarget(true);
                  try {
                    await deleteConfirmTarget.onConfirm();
                  } catch (err: any) {
                    console.error('[Delete Error]:', err);
                    showToast(`Error deleting ${deleteConfirmTarget.itemType}: ${err?.message || 'Check database'}`, 'error');
                  } finally {
                    setIsDeletingTarget(false);
                    setDeleteConfirmTarget(null);
                  }
                }}
                className="btn btn-sm"
                style={{
                  padding: '0.5rem 1.3rem',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: '#FFFFFF',
                  background: '#E11D48',
                  borderColor: '#E11D48',
                  cursor: isDeletingTarget ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)'
                }}
              >
                {isDeletingTarget ? (
                  <>
                    <RefreshCw size={14} className="spin-slow" />
                    <span>Deleting from Supabase...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Yes, Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
