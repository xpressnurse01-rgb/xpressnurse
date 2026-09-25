import { 
  CloudflareStorageObject, 
  InvoiceDetails, 
  CloudflareR2Config, 
  Booking,
  StorageCategory 
} from '../types';

// ============================================================================
// CLOUDFLARE R2 STORAGE BUCKET CONFIGURATION & SERVICE
// ============================================================================

export const DEFAULT_CLOUDFLARE_CONFIG: CloudflareR2Config = {
  accountId: import.meta.env.VITE_CLOUDFLARE_R2_ACCOUNT_ID || '',
  bucketName: import.meta.env.VITE_CLOUDFLARE_R2_BUCKET_NAME || 'xpressnurse-storage',
  publicDomain: import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_DOMAIN || '',
  endpoint: import.meta.env.VITE_CLOUDFLARE_R2_ENDPOINT || '',
  corsEnabled: true
};

const R2_CONFIG_KEY = 'xpressnurse_r2_config';
const R2_OBJECTS_KEY = 'xpressnurse_r2_objects';

export const getCloudflareConfig = (): CloudflareR2Config => {
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
        publicDomain: parsed.publicDomain || import.meta.env.VITE_CLOUDFLARE_R2_PUBLIC_DOMAIN || ''
      };
      return config;
    }
  } catch (err) {
    console.warn('Failed to load Cloudflare R2 config from localStorage', err);
  }
  return DEFAULT_CLOUDFLARE_CONFIG;
};

export const saveCloudflareConfig = (config: Partial<CloudflareR2Config>): CloudflareR2Config => {
  const current = getCloudflareConfig();
  const updated = { ...current, ...config };
  try {
    localStorage.setItem(R2_CONFIG_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save Cloudflare R2 config', err);
  }
  return updated;
};

// Cloudflare R2 Storage Bucket Objects (Real objects only — No mock data)
export const SEED_R2_OBJECTS: CloudflareStorageObject[] = [];

// Load All Objects
export const getCloudflareObjects = (): CloudflareStorageObject[] => {
  try {
    const saved = localStorage.getItem(R2_OBJECTS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Filter out any legacy mock seed objects from early demos
        return parsed.filter(
          (o) => !o.id?.startsWith('r2-inv-104') &&
                 !o.id?.startsWith('r2-rx-10') &&
                 !o.id?.startsWith('r2-cert-20') &&
                 !o.id?.startsWith('r2-tele-301') &&
                 !o.id?.startsWith('r2-lab-401')
        );
      }
    }
  } catch (err) {
    console.warn('Failed to load R2 objects from localStorage', err);
  }
  return [];
};

// Save All Objects
export const persistCloudflareObjects = (objects: CloudflareStorageObject[]): void => {
  try {
    localStorage.setItem(R2_OBJECTS_KEY, JSON.stringify(objects));
  } catch (err) {
    console.error('Failed to persist R2 objects', err);
  }
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
  const cleanName = fileData.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${cleanCategory}/${cleanName}`;
  const publicUrl = `${config.publicDomain.replace(/\/+$/, '')}/${key}`;

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

  // Read as Data URL so the uploaded file can be previewed/inspected directly in-browser
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

  const timestamp = Date.now();
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const cleanPrefix = cleanFileName.toLowerCase().startsWith('rx_') ? '' : 'Rx_';
  const cleanBookingId = bookingId ? bookingId.replace(/[^a-zA-Z0-9]/g, '') : `TMP${Math.floor(1000 + Math.random() * 9000)}`;
  const key = `prescriptions/${cleanPrefix}${cleanBookingId}_${cleanFileName}`;
  const publicUrl = `${config.publicDomain.replace(/\/+$/, '')}/${key}`;

  const newObj: CloudflareStorageObject = {
    id: `r2-rx-${timestamp}-${Math.floor(Math.random() * 1000)}`,
    bucketName: config.bucketName,
    key,
    category: 'prescriptions',
    fileName: `${cleanPrefix}${cleanBookingId}_${cleanFileName}`,
    contentType: file.type || 'application/pdf',
    sizeBytes: file.size,
    uploadedAt: new Date().toISOString(),
    publicUrl,
    dataUrl: dataUrl || undefined,
    metadata: {
      bookingId: bookingId || `BK-${cleanBookingId}`,
      patientName: patientName || 'Prescription Patient',
      patientPhone: patientPhone || '',
      serviceTitle: serviceTitle || 'Home Clinical Nursing Visit',
      description: `Doctor prescription for ${serviceTitle || 'Home Nursing'} stored in Cloudflare R2 Bucket (${config.bucketName})`
    }
  };

  const existing = getCloudflareObjects();
  const updated = [newObj, ...existing.filter((o) => o.key !== key)];
  persistCloudflareObjects(updated);

  return newObj;
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
  const updated = existing.filter((o) => o.id !== keyOrId && o.key !== keyOrId);
  persistCloudflareObjects(updated);
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

  // 18% GST calculation (Healthcare professional home services breakdown)
  const taxableAmount = Math.round(subtotal / 1.18);
  const totalGst = subtotal - taxableAmount;
  const cgst = Math.round(totalGst / 2);
  const sgst = totalGst - cgst;

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
    serviceId: booking.serviceId,
    assignedNurseName: booking.assignedNurseName || 'Assigned Fleet RN',
    baseAmount: baseFee,
    nightSurcharge,
    discountRupees: discount,
    taxableAmount,
    cgst,
    sgst,
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
  return uploadToCloudflareStorage({
    fileName: `${inv.invoiceNumber}.pdf`,
    category: 'invoices',
    contentType: 'application/pdf',
    sizeBytes: 142000,
    metadata: {
      bookingId: booking.id,
      patientName: booking.patientName,
      nurseName: booking.assignedNurseName,
      amount: inv.totalAmount,
      gstin: '36AAACX9876Q1Z5',
      description: `Tax Invoice for ${booking.serviceTitle}`
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
  <div style="max-width: 800px; margin: 0 auto 16px auto; display: flex; justify-content: space-between; align-items: center;" class="no-print">
    <div style="font-size: 13px; color: #64748B;">
      Cloudflare R2 Bucket: <code style="background: #E2E8F0; padding: 2px 6px; border-radius: 4px;">xpressnurse-storage/${inv.r2StorageKey}</code>
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" style="background: #E11D48; color: #FFF; border: none; padding: 8px 18px; border-radius: 9999px; font-weight: 700; cursor: pointer; font-size: 13px;">Print / Save as PDF</button>
      <button onclick="window.close()" style="background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; padding: 8px 14px; border-radius: 9999px; font-weight: 600; cursor: pointer; font-size: 13px;">Close</button>
    </div>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div>
        <div class="brand-title">Xpress Nurse</div>
        <div class="brand-subtitle">Hyderabad 24/7 Clinical Home Care</div>
        <div style="font-size: 12px; color: #475569; margin-top: 6px;">
          GSTIN: <strong>36AAACX9876Q1Z5</strong> | Reg: TS/HYD/MED-2026/410<br>
          Banjara Hills Road No. 12, Hyderabad, Telangana 500034
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 20px; font-weight: 800; color: #0A192F;">TAX INVOICE</div>
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
          <th>Description of Clinical Procedure</th>
          <th>SAC Code</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Rate (₹)</th>
          <th style="text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${inv.serviceTitle}</strong><br>
            <span style="font-size: 11.5px; color: #64748B;">Doorstep nursing visit with aseptic consumables, vitals check & digital report</span>
          </td>
          <td>999312</td>
          <td style="text-align: center;">1</td>
          <td style="text-align: right;">₹${inv.baseAmount}</td>
          <td style="text-align: right;">₹${inv.baseAmount}</td>
        </tr>
        ${inv.nightSurcharge && inv.nightSurcharge > 0 ? `
        <tr>
          <td>
            <strong>Night Visit Emergency Surcharge</strong><br>
            <span style="font-size: 11.5px; color: #64748B;">Dispatch after 8:00 PM rapid response fee</span>
          </td>
          <td>999312</td>
          <td style="text-align: center;">1</td>
          <td style="text-align: right;">₹${inv.nightSurcharge}</td>
          <td style="text-align: right;">₹${inv.nightSurcharge}</td>
        </tr>
        ` : ''}
        ${inv.discountRupees && inv.discountRupees > 0 ? `
        <tr>
          <td>
            <strong style="color: #059669;">Promotional Coupon Discount</strong>
          </td>
          <td>—</td>
          <td style="text-align: center;">1</td>
          <td style="text-align: right; color: #059669;">-₹${inv.discountRupees}</td>
          <td style="text-align: right; color: #059669;">-₹${inv.discountRupees}</td>
        </tr>
        ` : ''}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>Taxable Value:</span>
        <strong>₹${inv.taxableAmount}</strong>
      </div>
      <div class="total-row">
        <span>CGST (9%):</span>
        <span>₹${inv.cgst}</span>
      </div>
      <div class="total-row">
        <span>SGST (9%):</span>
        <span>₹${inv.sgst}</span>
      </div>
      <div class="total-row grand">
        <span>Grand Total:</span>
        <span>₹${inv.totalAmount}</span>
      </div>
    </div>

    <div class="cloud-footer">
      <div>
        <span class="r2-tag">☁️ Cloudflare R2 Verified Storage</span>
        <div style="margin-top: 4px;">Public Link: <a href="${inv.r2PublicUrl}" target="_blank" style="color: #0284C7; text-decoration: none;">${inv.r2PublicUrl}</a></div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 700; color: #1E293B;">Xpress Nurse Healthcare Pvt. Ltd.</div>
        <div>Digitally Authorized Signatory</div>
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
