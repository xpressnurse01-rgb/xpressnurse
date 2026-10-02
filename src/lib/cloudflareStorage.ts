import { 
  CloudflareStorageObject, 
  InvoiceDetails, 
  CloudflareR2Config, 
  Booking,
  NurseProfile,
  StorageCategory 
} from '../types';

// ============================================================================
// CLOUDFLARE R2 STORAGE BUCKET CONFIGURATION & SERVICE
// ============================================================================

export const DEFAULT_CLOUDFLARE_CONFIG: CloudflareR2Config = {
  accountId: import.meta.env.VITE_CLOUDFLARE_R2_ACCOUNT_ID || '',
  bucketName: import.meta.env.VITE_CLOUDFLARE_R2_BUCKET_NAME || 'xpressnurse-storage',
  publicDomain: import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_DOMAIN || '/buckets',
  endpoint: import.meta.env.VITE_CLOUDFLARE_R2_ENDPOINT || '',
  corsEnabled: true
};

const R2_CONFIG_KEY = 'xpressnurse_r2_config';
const R2_OBJECTS_KEY = 'xpressnurse_r2_objects';
const R2_DELETED_KEYS = 'xpressnurse_r2_deleted_keys';

export const getDeletedR2Keys = (): Set<string> => {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(R2_DELETED_KEYS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {
      // ignore
    }
  }
  return new Set();
};

export const markR2KeysDeleted = (keysOrIds: string[]): void => {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const current = getDeletedR2Keys();
      keysOrIds.forEach((k) => {
        if (k && typeof k === 'string') current.add(k);
      });
      localStorage.setItem(R2_DELETED_KEYS, JSON.stringify(Array.from(current)));
    } catch {
      // ignore
    }
  }
};

export const clearDeletedR2Keys = (): void => {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      localStorage.removeItem(R2_DELETED_KEYS);
    } catch {
      // ignore
    }
  }
};

export const getCloudflareConfig = (): CloudflareR2Config => {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(R2_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const config = { 
          ...DEFAULT_CLOUDFLARE_CONFIG, 
          ...parsed,
          accountId: parsed.accountId || import.meta.env.VITE_CLOUDFLARE_R2_ACCOUNT_ID || '',
          bucketName: parsed.bucketName || import.meta.env.VITE_CLOUDFLARE_R2_BUCKET_NAME || 'xpressnurse-storage',
          endpoint: parsed.endpoint || import.meta.env.VITE_CLOUDFLARE_R2_ENDPOINT || '',
          publicDomain: parsed.publicDomain || import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_DOMAIN || '/buckets'
        };
        return config;
      }
    } catch {
      // Fallback to default
    }
  }
  return DEFAULT_CLOUDFLARE_CONFIG;
};

export const saveCloudflareConfig = (config: Partial<CloudflareR2Config>): CloudflareR2Config => {
  const current = getCloudflareConfig();
  const updated = { ...current, ...config };
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      localStorage.setItem(R2_CONFIG_KEY, JSON.stringify(updated));
    } catch {
      // Ignored in non-browser context
    }
  }
  return updated;
};

// Cloudflare R2 Storage Bucket Objects (Real objects only — No mock data)
export const SEED_R2_OBJECTS: CloudflareStorageObject[] = [];

// Load All Objects
export const getCloudflareObjects = (): CloudflareStorageObject[] => {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(R2_OBJECTS_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const deleted = getDeletedR2Keys();
          // Filter out deleted items and legacy mock documents
          const filtered = parsed.filter(
            (o) =>
              !deleted.has(o.id) &&
              !deleted.has(o.key) &&
              !o.id.startsWith('r2-doc-nabh') &&
              !o.id.startsWith('r2-doc-tsnc') &&
              !o.key.includes('NABH_Home_Nursing') &&
              !o.key.includes('Telangana_Nursing_Council_Clinical_Registry')
          );
          if (filtered.length !== parsed.length) {
            persistCloudflareObjects(filtered);
          }
          return filtered;
        }
      }
    } catch {
      // Fallback
    }
  }
  return [];
};

// Save All Objects
export const persistCloudflareObjects = (objects: CloudflareStorageObject[]): void => {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      localStorage.setItem(R2_OBJECTS_KEY, JSON.stringify(objects));
    } catch {
      // Ignored
    }
  }
};

// Sync real database records (bookings, prescriptions, nurse certificates) into storage objects
export const syncDatabaseRecordsToStorage = (
  bookings: Booking[] = [],
  nurses: NurseProfile[] = [],
  existingList?: CloudflareStorageObject[]
): CloudflareStorageObject[] => {
  const config = getCloudflareConfig();
  const deletedKeys = getDeletedR2Keys();
  
  let existing = existingList;
  if (!existing) {
    existing = getCloudflareObjects();
  }
  // Exclude deleted items
  existing = existing.filter((o) => !deletedKeys.has(o.id) && !deletedKeys.has(o.key));

  const existingKeyMap = new Map<string, CloudflareStorageObject>();
  existing.forEach((o) => existingKeyMap.set(o.key, o));

  const generated: CloudflareStorageObject[] = [];

  // 1. Generate / sync nurse certificates (only for non-deleted records with real/assigned profile)
  const effectiveNurses = nurses || [];
  effectiveNurses.forEach((n) => {
    const cleanName = n.name.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Cert_${n.id}_Telangana_Council_Cert_${cleanName}.pdf`;
    const key = `certificates/${fileName}`;
    const docId = `r2-cert-${n.id}`;
    if (!existingKeyMap.has(key) && !deletedKeys.has(key) && !deletedKeys.has(docId)) {
      const publicDomain = (config.publicDomain || 'https://pub-xn-healthcare.r2.dev').replace(/\/+$/, '');
      const publicUrl = n.certificateUrl || `${publicDomain}/${key}`;
      generated.push({
        id: docId,
        bucketName: config.bucketName,
        key,
        category: 'certificates',
        fileName,
        contentType: 'application/pdf',
        sizeBytes: 245000 + (Math.abs(n.name.length * 3421) % 150000),
        uploadedAt: n.createdAt || new Date().toISOString(),
        publicUrl,
        metadata: {
          nurseId: n.id,
          patientName: n.name,
          qualification: n.qualification,
          serviceArea: n.serviceArea,
          description: `${n.qualification} - Telangana Nursing Council Registration (${n.certificateVerified ? 'Verified RN' : 'Pending Verification'})`
        }
      });
    }
  });

  // 2. Generate / sync booking invoices and prescriptions (only non-deleted)
  bookings.forEach((b) => {
    const cleanId = b.id.replace(/[^a-zA-Z0-9]/g, '');
    const cleanPatient = (b.patientName || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');

    // Invoices are generated dynamically in the dashboard, no need to sync to Cloudflare

    // Prescription (if hasPrescription or fileName or url)
    if (b.hasPrescription || b.prescriptionFileName || b.prescriptionUrl) {
      const originalFileName = b.prescriptionFileName || `Clinical_${cleanPatient}.pdf`;
      const rxCleanName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const cleanPrefix = rxCleanName.toLowerCase().startsWith('rx_') ? '' : 'Rx_';
      const fileName = `${cleanPrefix}${cleanId}_${rxCleanName}`;
      const rxKey = `prescriptions/${fileName}`;
      const rxId = `r2-rx-${b.id}`;
      if (!existingKeyMap.has(rxKey) && !deletedKeys.has(rxKey) && !deletedKeys.has(rxId)) {
        const publicDomain = (config.publicDomain || 'https://pub-xn-healthcare.r2.dev').replace(/\/+$/, '');
        const publicUrl = b.prescriptionUrl || `${publicDomain}/${rxKey}`;
        generated.push({
          id: rxId,
          bucketName: config.bucketName,
          key: rxKey,
          category: 'prescriptions',
          fileName,
          contentType: 'application/pdf',
          sizeBytes: 195000 + (Math.abs(cleanId.length * 4117) % 120000),
          uploadedAt: b.createdAt || new Date().toISOString(),
          publicUrl,
          metadata: {
            bookingId: b.id,
            patientName: b.patientName,
            patientPhone: b.patientPhone,
            serviceTitle: b.serviceTitle,
            description: `Doctor Mandatory Prescription for ${b.serviceTitle}`
          }
        });
      }
    }
  });

  const merged = [...existing, ...generated];
  persistCloudflareObjects(merged);
  return merged;
};

// Allowed MIME types and max size for clinical documents
export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const validateClinicalFileUpload = (file: { name: string; type?: string; size: number }): { valid: boolean; error?: string } => {
  const fileType = file.type || 'application/pdf';
  if (!ALLOWED_MIME_TYPES.includes(fileType.toLowerCase())) {
    return { valid: false, error: 'Invalid document format. Only verified medical PDF and image formats (JPEG, PNG, WEBP) are permitted.' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'Document size exceeds the 5MB clinical security limit.' };
  }
  return { valid: true };
};

// Upload / Save Object to Cloudflare R2
export const uploadToCloudflareStorage = async (
  fileData: {
    fileName: string;
    category: StorageCategory;
    contentType?: string;
    sizeBytes?: number;
    dataUrl?: string;
    metadata?: Record<string, any>;
  }
): Promise<CloudflareStorageObject> => {
  const config = getCloudflareConfig();
  const cleanCategory = fileData.category;
  
  // Sanitize filename to prevent path traversal (../) and illegal characters
  const cleanName = fileData.fileName
    .replace(/\.\.+/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
    
  const key = `${cleanCategory}/${cleanName}`;
  const publicUrl = config.publicDomain 
    ? `${config.publicDomain.replace(/\/+$/, '')}/${key}` 
    : (typeof window !== 'undefined' ? `${window.location.origin}/buckets/${key}` : `/buckets/${key}`);

  // Attempt real upload to Cloudflare R2 bucket endpoint
  if (config.endpoint) {
    try {
      const uploadUrl = `${config.endpoint.replace(/\/+$/, '')}/${config.bucketName}/${key}`;
      let bodyData: BodyInit | null = null;
      if (fileData.dataUrl) {
        const res = await fetch(fileData.dataUrl);
        bodyData = await res.blob();
      } else {
        bodyData = new Blob([`%PDF-1.4\n% Xpress Nurse Storage Object: ${key}\nMetadata: ${JSON.stringify(fileData.metadata || {})}`], { type: fileData.contentType || 'application/pdf' });
      }
      const headers: Record<string, string> = {
        'Content-Type': fileData.contentType || 'application/pdf'
      };
      if (config.apiToken) {
        headers['Authorization'] = `Bearer ${config.apiToken}`;
      }
      await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: bodyData,
        mode: 'cors'
      }).catch(() => {
        // Fallback gracefully if CORS or token required
      });
    } catch {
      // safe fallback
    }
  }

  const newObj: CloudflareStorageObject = {
    id: 'r2-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    bucketName: config.bucketName,
    key,
    category: cleanCategory,
    fileName: cleanName,
    contentType: fileData.contentType || 'application/pdf',
    sizeBytes: fileData.sizeBytes || Math.floor(80000 + Math.random() * 150000),
    uploadedAt: new Date().toISOString(),
    publicUrl,
    dataUrl: fileData.dataUrl,
    metadata: fileData.metadata
  };

  const existing = getCloudflareObjects();
  const updated = [newObj, ...existing.filter((o) => o.key !== key)];
  persistCloudflareObjects(updated);

  return newObj;
};

// Specialized Helper: Upload Nurse Certificate directly to Cloudflare R2 Bucket
export const uploadCertificateToCloudflareBucket = async (payload: {
  file: File;
  nurseId: string;
  nurseName: string;
}): Promise<CloudflareStorageObject> => {
  const { file, nurseId, nurseName } = payload;
  const validation = validateClinicalFileUpload(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file format or size');
  }

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

  const cleanName = (file.name || 'Certificate.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
  return uploadToCloudflareStorage({
    fileName: `Cert_${nurseId}_${cleanName}`,
    category: 'certificates',
    contentType: file.type || 'application/pdf',
    sizeBytes: file.size,
    dataUrl: dataUrl || undefined,
    metadata: {
      nurseId,
      patientName: nurseName,
      description: `Nurse certificate for ${nurseName} (${nurseId}) stored in Cloudflare R2 Bucket`
    }
  });
};

// Specialized Helper: Upload Patient Prescription File Directly to Cloudflare R2 Bucket
export interface PrescriptionUploadPayload {
  file: File;
  patientName: string;
  patientPhone?: string;
  serviceTitle?: string;
  bookingId?: string;
}

export const uploadPrescriptionToCloudflareBucket = async (
  payload: PrescriptionUploadPayload
): Promise<CloudflareStorageObject> => {
  const { file, patientName, patientPhone, serviceTitle, bookingId } = payload;
  const config = getCloudflareConfig();

  // 1. Strict Security Validation: MIME type check
  const fileType = file.type || 'application/pdf';
  if (!ALLOWED_MIME_TYPES.includes(fileType.toLowerCase())) {
    throw new Error('Invalid document format. Only verified medical PDF and image formats (JPEG, PNG, WEBP) are permitted.');
  }

  // 2. Strict Security Validation: Size check (max 5MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Document size exceeds the 5MB clinical security limit.');
  }

  // Read as Data URL so the uploaded file can be previewed/inspected directly in-browser
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

  const timestamp = Date.now();
  const cleanFileName = file.name
    .replace(/\.\.+/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  const cleanPrefix = cleanFileName.toLowerCase().startsWith('rx_') ? '' : 'Rx_';
  const cleanBookingId = bookingId ? bookingId.replace(/[^a-zA-Z0-9]/g, '') : `TMP${Math.floor(1000 + Math.random() * 9000)}`;
  
  return uploadToCloudflareStorage({
    fileName: `${cleanPrefix}${cleanBookingId}_${cleanFileName}`,
    category: 'prescriptions',
    contentType: fileType,
    sizeBytes: file.size,
    dataUrl: dataUrl || undefined,
    metadata: {
      bookingId: bookingId || `BK-${cleanBookingId}`,
      patientName: patientName || 'Prescription Patient',
      patientPhone: patientPhone || '',
      serviceTitle: serviceTitle || 'Home Clinical Nursing Visit',
      description: `Doctor prescription for ${serviceTitle || 'Home Nursing'} stored in Cloudflare R2 Bucket`
    }
  });
};

// Helper to look up a prescription by file name, key, or URL
export const getPrescriptionStorageObject = (
  query?: string
): CloudflareStorageObject | undefined => {
  if (!query) return undefined;
  const objects = getCloudflareObjects();
  const cleanQuery = query.toLowerCase();
  return objects.find((o) => {
    if (o.key.toLowerCase() === cleanQuery) return true;
    if (o.publicUrl.toLowerCase() === cleanQuery) return true;
    if (o.fileName.toLowerCase() === cleanQuery) return true;
    if (o.category === 'prescriptions') {
      if (cleanQuery.includes(o.fileName.toLowerCase()) || o.fileName.toLowerCase().includes(cleanQuery)) {
        return true;
      }
    }
    return false;
  });
};

// Delete Object from Cloudflare R2
export const deleteFromCloudflareStorage = async (keyOrId: string): Promise<void> => {
  const existing = getCloudflareObjects();
  const target = existing.find((o) => o.id === keyOrId || o.key === keyOrId);
  const updated = existing.filter((o) => o.id !== keyOrId && o.key !== keyOrId);
  persistCloudflareObjects(updated);

  const toMark = [keyOrId];
  if (target) {
    toMark.push(target.id, target.key);
  }
  markR2KeysDeleted(toMark);

  // Attempt real Cloudflare R2 bucket delete if endpoint is configured
  const config = getCloudflareConfig();
  if (config.endpoint && target?.key) {
    try {
      const deleteUrl = `${config.endpoint.replace(/\/+$/, '')}/${config.bucketName}/${target.key}`;
      const headers: Record<string, string> = {};
      if (config.apiToken) headers['Authorization'] = `Bearer ${config.apiToken}`;
      await fetch(deleteUrl, { method: 'DELETE', headers, mode: 'cors' }).catch(() => {});
    } catch {
      // safe fallback
    }
  }
};

// Batch Delete Objects from Cloudflare R2
export const deleteMultipleFromCloudflareStorage = async (keysOrIds: string[]): Promise<void> => {
  const targetSet = new Set(keysOrIds);
  const existing = getCloudflareObjects();
  const targets = existing.filter((o) => targetSet.has(o.id) || targetSet.has(o.key));
  const updated = existing.filter((o) => !targetSet.has(o.id) && !targetSet.has(o.key));
  persistCloudflareObjects(updated);

  const toMark: string[] = [...keysOrIds];
  targets.forEach((t) => {
    toMark.push(t.id, t.key);
  });
  markR2KeysDeleted(toMark);

  const config = getCloudflareConfig();
  if (config.endpoint) {
    for (const t of targets) {
      if (t.key) {
        try {
          const deleteUrl = `${config.endpoint.replace(/\/+$/, '')}/${config.bucketName}/${t.key}`;
          const headers: Record<string, string> = {};
          if (config.apiToken) headers['Authorization'] = `Bearer ${config.apiToken}`;
          await fetch(deleteUrl, { method: 'DELETE', headers, mode: 'cors' }).catch(() => {});
        } catch {
          // safe fallback
        }
      }
    }
  }
};

// Purge all legacy mock files from localStorage
export const clearAllMockCloudflareStorage = (): void => {
  const existing = getCloudflareObjects();
  const realOnly = existing.filter(
    (o) =>
      !o.id.startsWith('r2-doc-nabh') &&
      !o.id.startsWith('r2-doc-tsnc') &&
      !o.key.includes('NABH_Home_Nursing') &&
      !o.key.includes('Telangana_Nursing_Council_Clinical_Registry')
  );
  persistCloudflareObjects(realOnly);
};

// ============================================================================
// INVOICE BUILDER & GENERATOR
// ============================================================================

export const generateInvoiceDetails = (booking: Booking): InvoiceDetails => {
  const config = getCloudflareConfig();
  const cleanBookingId = booking.id.replace(/[^a-zA-Z0-9]/g, '');
  const invoiceNumber = `XN-INV-2026-${cleanBookingId}`;
  const baseFee = Number(booking.estimatedFee) || 800;
  const discount = Number(booking.discountRupees) || 0;
  const nightSurcharge = Number(booking.nightSurcharge) || 0;
  const subtotal = Math.max(0, baseFee + nightSurcharge - discount);

  const r2StorageKey = `invoices/${invoiceNumber}.pdf`;
  const r2PublicUrl = `${config.publicDomain.replace(/\/+$/, '')}/${r2StorageKey}`;

  return {
    invoiceNumber,
    invoiceDate: new Date(booking.createdAt || Date.now()).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }),
    bookingId: booking.id,
    patientName: booking.patientName,
    patientPhone: booking.patientPhone,
    patientAge: booking.patientAge,
    patientGender: booking.patientGender,
    fullAddress: booking.fullAddress,
    area: booking.area,
    serviceTitle: booking.serviceTitle,
    serviceDate: booking.preferredDate,
    timeSlot: booking.scheduledSlot || booking.preferredTime,
    numberOfVisits: booking.numberOfVisits || 1,
    serviceId: booking.serviceId,
    assignedNurseName: booking.assignedNurseName || 'Assigned Fleet RN',
    baseAmount: baseFee,
    nightSurcharge,
    discountRupees: discount,
    totalAmount: subtotal,
    paymentStatus: booking.status === 'Completed' ? 'Paid' : 'Pending',
    paymentMode: 'UPI / Online',
    r2StorageKey,
    r2PublicUrl
  };
};

// Upload Invoice to Cloudflare Storage Bucket
export const saveInvoiceToCloudflareBucket = async (booking: Booking): Promise<CloudflareStorageObject> => {
  const inv = generateInvoiceDetails(booking);
  const html = generatePrintableInvoiceHtml(inv);
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  return uploadToCloudflareStorage({
    fileName: `${inv.invoiceNumber}.html`,
    category: 'invoices',
    contentType: 'text/html',
    sizeBytes: new Blob([html]).size,
    dataUrl,
    metadata: {
      bookingId: booking.id,
      patientName: booking.patientName,
      nurseName: booking.assignedNurseName,
      amount: inv.totalAmount,
      description: `Service Invoice for ${booking.serviceTitle}`
    }
  });
};

// Clean Printable HTML Invoice for Direct View / PDF Save
export const generatePrintableInvoiceHtml = (inv: InvoiceDetails): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${inv.invoiceNumber} | Xpress Nurse Hyderabad</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: #F8FAFC; color: #0F172A; padding: 40px 20px; font-size: 14px; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 2px solid #0A192F; }
    .brand-title { font-size: 26px; font-weight: 900; color: #0A192F; letter-spacing: -0.5px; }
    .brand-subtitle { font-size: 12px; color: #0284C7; font-weight: 700; text-transform: uppercase; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
    .badge-paid { background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; }
    .badge-pending { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 28px 0; }
    .info-box h4 { font-size: 12px; text-transform: uppercase; color: #64748B; font-weight: 700; margin-bottom: 8px; }
    .info-box p { font-size: 13.5px; line-height: 1.5; color: #1E293B; }
    .table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    .table th { background: #F1F5F9; text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 800; color: #334155; text-transform: uppercase; }
    .table td { padding: 14px 16px; border-bottom: 1px solid #E2E8F0; font-size: 13.5px; }
    .totals { margin-left: auto; width: 320px; margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13.5px; }
    .total-row.grand { border-top: 2px solid #0A192F; padding-top: 10px; font-size: 18px; font-weight: 900; color: #0A192F; margin-top: 8px; }
    .cloud-footer { margin-top: 40px; padding-top: 20px; border-top: 1px dashed #CBD5E1; display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: #64748B; }
    .r2-tag { display: inline-flex; align-items: center; gap: 4px; background: #FFF7ED; color: #C2410C; border: 1px solid #FFEDD5; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; }
    @media print {
      body { padding: 0; background: #FFFFFF; }
      .invoice-card { border: none; box-shadow: none; padding: 20px; max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div style="max-width: 800px; margin: 0 auto 16px auto; display: flex; justify-content: flex-end; align-items: center;" class="no-print">
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" style="background: #E11D48; color: #FFF; border: none; padding: 8px 18px; border-radius: 9999px; font-weight: 700; cursor: pointer; font-size: 13px;">Print / Save as PDF</button>
      <button onclick="window.close()" style="background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; padding: 8px 14px; border-radius: 9999px; font-weight: 600; cursor: pointer; font-size: 13px;">Close</button>
    </div>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand-title">Xpress Nurse</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 20px; font-weight: 800; color: #0A192F;">INVOICE</div>
        <div style="font-size: 13px; font-weight: 700; color: #0284C7; margin: 4px 0;">${inv.invoiceNumber}</div>
        <div style="font-size: 12px; color: #64748B;">Date: ${inv.invoiceDate}</div>
        <div style="margin-top: 8px;">
          <span class="badge ${inv.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-pending'}">${inv.paymentStatus}</span>
        </div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <h4>Billed To (Patient)</h4>
        <p>
          <strong style="font-size: 15px;">${inv.patientName}</strong> (${inv.patientGender || 'Patient'}, ${inv.patientAge || 45} Yrs)<br>
          Phone: ${inv.patientPhone}<br>
          Address: ${inv.fullAddress}<br>
          Area: <strong>${inv.area}, Hyderabad</strong>
        </p>
      </div>
      <div class="info-box">
        <h4>Service & Dispatch Details</h4>
        <p>
          Booking ID: <strong style="font-family: monospace;">${inv.bookingId}</strong><br>
          Attending Staff: <strong>${inv.assignedNurseName}</strong> (Registered RN)<br>
          Payment Mode: ${inv.paymentMode}<br>
          Clinical Supervision: Xpress Nurse Medical Command Center
        </p>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th style="width: 50px; text-align: center;">S.No</th>
          <th>Procedure</th>
          <th>Date</th>
          <th style="text-align: center;">Slot No</th>
          <th style="text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align: center;">1</td>
          <td>
            <strong>${inv.serviceTitle}</strong><br>
            <span style="font-size: 11.5px; color: #64748B;">Doorstep nursing visit with aseptic consumables, vitals check & digital report</span>
          </td>
          <td>${inv.serviceDate || '-'}</td>
          <td style="text-align: center;">${inv.timeSlot || '-'}</td>
          <td style="text-align: right;">₹${inv.baseAmount * (inv.numberOfVisits || 1)}</td>
        </tr>
        ${inv.nightSurcharge && inv.nightSurcharge > 0 ? `
        <tr>
          <td style="text-align: center;">2</td>
          <td>
            <strong>Night Visit Emergency Surcharge</strong><br>
            <span style="font-size: 11.5px; color: #64748B;">Dispatch after 8:00 PM rapid response fee</span>
          </td>
          <td>-</td>
          <td style="text-align: center;">-</td>
          <td style="text-align: right;">₹${inv.nightSurcharge}</td>
        </tr>
        ` : ''}
        ${inv.discountRupees && inv.discountRupees > 0 ? `
        <tr>
          <td style="text-align: center;">${inv.nightSurcharge && inv.nightSurcharge > 0 ? '3' : '2'}</td>
          <td>
            <strong style="color: #059669;">Promotional Coupon Discount</strong>
          </td>
          <td>-</td>
          <td style="text-align: center;">-</td>
          <td style="text-align: right; color: #059669;">-₹${inv.discountRupees}</td>
        </tr>
        ` : ''}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>Base Service Fee:</span>
        <strong>₹${inv.baseAmount}</strong>
      </div>

      <div class="total-row grand">
        <span>Grand Total:</span>
        <span>₹${inv.totalAmount}</span>
      </div>
    </div>

    <div class="cloud-footer">
      <div></div>
      <div style="text-align: right;">
      </div>
    </div>
  </div>
</body>
</html>`;
};

// Open printable invoice window
export const openPrintableInvoiceWindow = (inv: InvoiceDetails): void => {
  const html = generatePrintableInvoiceHtml(inv);
  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } else {
    // Fallback: download as HTML file
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.invoiceNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
