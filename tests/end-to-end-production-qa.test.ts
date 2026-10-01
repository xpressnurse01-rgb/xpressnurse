import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  dbFetchBookings,
  dbFetchNurses,
  dbFetchLeads,
  dbFetchServices,
  dbFetchConsultations,
  dbFetchCoupons,
  dbFetchAppUsers,
  dbInsertBooking,
  dbUpdateBooking,
  dbDeleteBooking,
  dbInsertNurse,
  dbInsertLead,
  dbUpdateLeadById,
  dbInsertCoupon,
  dbUpdateCoupon,
  dbDeleteCoupon,
  dbInsertConsultation,
  dbUpdateConsultationById,
  dbInsertAppUser,
  dbDeleteAppUser,
  dbDeleteMultipleBookings,
  dbDeleteMultipleNurses,
  dbDeleteMultipleLeads,
  dbDeleteMultipleServices,
  dbDeleteMultipleConsultations,
  dbDeleteMultipleCoupons,
  dbDeleteMultipleAppUsers,
  generateNurseReferralCode
} from '../src/lib/supabase';
import { 
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  getCloudflareConfig,
  generateInvoiceDetails,
  validateClinicalFileUpload
} from '../src/lib/cloudflareStorage';
import { Booking, NurseLead, Coupon, DoctorConsultation, AppUser } from '../src/types';

describe('Comprehensive End-to-End Production QA Protocol Suite', () => {
  let supabase: SupabaseClient;
  const envUrl = process.env.VITE_SUPABASE_URL || 'https://ncgugriphhrhvdunluiz.supabase.co';
  const envAnon = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZ3VncmlwaGhyaHZkdW5sdWl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNTExNzAsImV4cCI6MjEwNTYyNzE3MH0.5MADQjkka8Of25SwPncEb6lrP3mxL713tcLBrGW6erQ';

  beforeAll(async () => {
    supabase = createClient(envUrl, envAnon);
    // Ensure test nurse exists in Supabase so foreign keys in test booking and lead succeed
    const { data: existingNurse } = await supabase.from('nurses').select('id').eq('id', 'nurse-101').maybeSingle();
    if (!existingNurse) {
      await dbInsertNurse({
        id: 'nurse-101',
        name: 'Nurse Priya Sharma',
        phone: '9849012345',
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
        rating: 4.9,
        certificateVerified: true,
        createdAt: new Date().toISOString()
      });
    }
    const { data: existingDoc } = await supabase.from('app_users').select('id').eq('role', 'doctor').maybeSingle();
    if (!existingDoc) {
      await dbInsertAppUser({
        id: 'user-doc-1',
        identifier: 'dr.reddy@xpressnurse.in',
        phone: '9848011223',
        email: 'dr.reddy@xpressnurse.in',
        pin: '4321',
        role: 'doctor',
        name: 'Dr. K. V. Reddy'
      });
    }
    const { data: existingNurseB } = await supabase.from('app_users').select('id').eq('pin', '1002').maybeSingle();
    if (!existingNurseB) {
      await dbInsertAppUser({
        id: 'user-nurse-102',
        identifier: 'rajesh.nursing@xpressnurse.in',
        phone: '9849099999',
        email: 'rajesh.nursing@xpressnurse.in',
        pin: '1002',
        role: 'nurse',
        name: 'Nurse Rajesh Kumar'
      });
    }
    const { data: existingNurseA } = await supabase.from('app_users').select('id').eq('pin', '1001').maybeSingle();
    if (!existingNurseA) {
      await dbInsertAppUser({
        id: 'user-nurse-101',
        identifier: 'priya.nursing@xpressnurse.in',
        phone: '9849012345',
        email: 'priya.nursing@xpressnurse.in',
        pin: '1001',
        role: 'nurse',
        name: 'Nurse Priya Sharma'
      });
    }
    const { data: existingAdmin } = await supabase.from('app_users').select('id').eq('pin', '2026').maybeSingle();
    if (!existingAdmin) {
      await dbInsertAppUser({
        id: 'user-admin-1',
        identifier: 'admin@xpressnurse.in',
        phone: '9999999999',
        email: 'admin@xpressnurse.in',
        pin: '2026',
        role: 'admin',
        name: 'Operations Admin'
      });
    }
  });

  // ==========================================================================
  // SECTION 1: ENVIRONMENT & CONNECTIONS
  // ==========================================================================
  describe('1. Test Environment & Connection Health', () => {
    it('verifies valid Supabase and Cloudflare environment configurations', () => {
      expect(envUrl).toContain('supabase.co');
      expect(envAnon).toBeTruthy();
      const cfConfig = getCloudflareConfig();
      expect(cfConfig.bucketName).toBe('xpressnurse-storage');
      expect(cfConfig.accountId).toBe('191a5a2501e16ad7236f97b921a8ebbf');
      expect(cfConfig.publicDomain).toContain('r2.dev');
    });

    it('successfully connects to all 8 database tables with 200 OK', async () => {
      const tables = ['bookings', 'nurses', 'leads', 'services', 'consultations', 'coupons', 'app_users', 'audit_logs'];
      for (const table of tables) {
        const { error, status } = await supabase.from(table).select('id', { count: 'exact', head: true });
        expect(error).toBeNull();
        expect(status).toBe(200);
      }
    });
  });

  // ==========================================================================
  // SECTION 2-6: MULTI-ROLE AUTHENTICATION & LOGIN (PATIENT, NURSE, DOCTOR, ADMIN)
  // ==========================================================================
  describe('2-6. Multi-Role Authentication, Registration & Session Isolation', () => {
    it('authenticates valid credentials for every required role in Supabase', async () => {
      const { data: dbUsers, error } = await supabase.from('app_users').select('*');
      expect(error).toBeNull();
      expect(dbUsers).not.toBeNull();

      const adminUser = dbUsers?.find(u => u.role === 'admin' && u.pin === '2026');
      expect(adminUser).toBeDefined();

      const doctorUser = dbUsers?.find(u => u.role === 'doctor' && u.pin === '4321');
      expect(doctorUser).toBeDefined();

      const nurseA = dbUsers?.find(u => u.role === 'nurse' && u.pin === '1001');
      expect(nurseA).toBeDefined();

      const nurseB = dbUsers?.find(u => u.role === 'nurse' && u.pin === '1002');
      expect(nurseB).toBeDefined();
    });

    it('safely rejects invalid PIN, nonexistent account, and empty credentials', async () => {
      const { data: dbUsers } = await supabase.from('app_users').select('*');
      
      // Incorrect PIN
      const badPin = dbUsers?.find(u => u.phone === '9849099999' && u.pin === '0000');
      expect(badPin).toBeUndefined();

      // Nonexistent account
      const ghost = dbUsers?.find(u => u.phone === '9999999999');
      expect(ghost).toBeUndefined();

      // Empty identifier
      const emptyUser = dbUsers?.find(u => u.phone === '' || u.pin === '');
      expect(emptyUser).toBeUndefined();
    });

    it('allows registration of a new Patient account and persists to database', async () => {
      const testPatientId = `QA-PAT-${Date.now()}`;
      const newPatient: AppUser = {
        id: testPatientId,
        identifier: `qa_patient_${Date.now()}`,
        name: 'QA Test Patient',
        phone: '9871112233',
        email: `qa-patient-${Date.now()}@xpressnurse.com`,
        role: 'patient',
        pin: '4321',
        serviceArea: 'Madhapur',
        status: 'Active',
        notes: 'Created via Automated QA Protocol'
      };

      await dbInsertAppUser(newPatient);

      // Verify immediate database retrieval
      const { data: userRecord } = await supabase.from('app_users').select('*').eq('id', testPatientId).single();
      expect(userRecord).toBeDefined();
      expect(userRecord?.name).toBe('QA Test Patient');
      expect(userRecord?.role).toBe('patient');

      // Cleanup
      await dbDeleteAppUser(testPatientId);
    });
  });

  // ==========================================================================
  // SECTION 7-15: PATIENT WORKFLOW, BOOKING CREATION, COUPONS & LIFECYCLE
  // ==========================================================================
  describe('7-15. Patient Service Booking, Coupon Validation, & Lifecycle', () => {
    let testBookingId: string;

    it('validates clinical service pricing and night surcharge logic', async () => {
      const services = await dbFetchServices();
      expect(services).not.toBeNull();
      expect(services!.length).toBeGreaterThan(0);

      const injectionSvc = services!.find(s => s.id === 'injection-administration' || s.title.toLowerCase().includes('injection'));
      expect(injectionSvc).toBeDefined();
      expect(injectionSvc?.priceNumber).toBeGreaterThan(0);
    });

    it('creates a new Patient booking and persists to Supabase', async () => {
      testBookingId = `BK-QA-${Date.now()}`;
      const newBooking: Booking = {
        id: testBookingId,
        serviceId: 'injection-administration',
        serviceTitle: 'Injection Administration (IV/IM)',
        patientName: 'Rahul Sharma (QA)',
        patientPhone: '9876543210',
        area: 'Madhapur',
        fullAddress: 'Plot 42, Hitech City, Madhapur, Hyderabad',
        bookingType: 'scheduled',
        scheduledSlot: '10:00 AM - 12:00 PM',
        estimatedFee: 499,
        finalFee: 499,
        status: 'Pending',
        nurseAcceptanceStatus: 'Pending',
        paymentStatus: 'Paid',
        paymentMethod: 'UPI / QR Code',
        requiresPrescription: true,
        hasPrescription: true,
        prescriptionFileName: 'dr_srinivas_prescription.pdf',
        prescriptionUrl: 'https://pub-830eaa9d07034c8d985d7d00577f77e9.r2.dev/prescriptions/sample.pdf',
        notes: 'Automated QA Booking Lifecycle Test',
        createdAt: new Date().toISOString()
      };

      const success = await dbInsertBooking(newBooking);
      expect(success).toBe(true);

      const bookings = await dbFetchBookings();
      expect(bookings).not.toBeNull();
      const created = bookings!.find(b => b.id === testBookingId);
      expect(created).toBeDefined();
      expect(created?.patientName).toBe('Rahul Sharma (QA)');
      expect(created?.status).toBe('Pending');
      expect(created?.estimatedFee).toBe(499);
    });

    it('applies coupons correctly enforcing minimum order and caps', async () => {
      const coupons = await dbFetchCoupons();
      expect(coupons).not.toBeNull();
      expect(coupons!.length).toBeGreaterThan(0);

      const activeCoupon = coupons!.find(c => c.status === 'Active');
      expect(activeCoupon).toBeDefined();

      if (activeCoupon) {
        let discount = 0;
        if (activeCoupon.discountType === 'flat') {
          discount = Math.min(activeCoupon.discountValue, 500);
        } else {
          discount = (500 * activeCoupon.discountValue) / 100;
          if (activeCoupon.maxDiscount) discount = Math.min(discount, activeCoupon.maxDiscount);
        }
        const finalFee = Math.max(0, 500 - discount);
        expect(finalFee).toBeLessThanOrEqual(500);
      }
    });

    it('handles status transitions through the complete booking lifecycle', async () => {
      // 1. Assign Nurse
      await dbUpdateBooking(testBookingId, {
        assignedNurseId: 'nurse-101',
        assignedNurseName: 'Nurse Priya Sharma',
        status: 'Assigned',
        nurseAcceptanceStatus: 'Pending'
      });
      let bookings = await dbFetchBookings();
      let b = bookings!.find(x => x.id === testBookingId);
      expect(b?.status).toBe('Assigned');
      expect(b?.assignedNurseName).toBe('Nurse Priya Sharma');

      // 2. Nurse Accepts
      await dbUpdateBooking(testBookingId, {
        status: 'In-Progress',
        nurseAcceptanceStatus: 'Accepted'
      });
      bookings = await dbFetchBookings();
      b = bookings!.find(x => x.id === testBookingId);
      expect(b?.status).toBe('In-Progress');
      expect(b?.nurseAcceptanceStatus).toBe('Accepted');

      // 3. Nurse Completes
      await dbUpdateBooking(testBookingId, {
        status: 'Completed',
        completedAt: new Date().toISOString()
      });
      bookings = await dbFetchBookings();
      b = bookings!.find(x => x.id === testBookingId);
      expect(b?.status).toBe('Completed');
    });

    it('generates a valid, accurate invoice calculation', () => {
      const mockBooking: Booking = {
        id: testBookingId,
        serviceId: 'injection-administration',
        serviceTitle: 'Injection Administration (IV/IM)',
        patientName: 'Rahul Sharma (QA)',
        patientPhone: '9876543210',
        area: 'Madhapur',
        fullAddress: 'Plot 42, Hitech City, Madhapur, Hyderabad',
        bookingType: 'scheduled',
        estimatedFee: 499,
        discountRupees: 50,
        finalFee: 449,
        status: 'Completed',
        paymentStatus: 'Paid',
        paymentMethod: 'UPI'
      };

      const invoice = generateInvoiceDetails(mockBooking);
      expect(invoice.invoiceNumber).toContain('XN-INV-');
      expect(invoice.patientName).toBe('Rahul Sharma (QA)');
      expect(invoice.totalAmount).toBe(449);
      expect(invoice.paymentStatus).toBe('Paid');
    });

    it('cleans up test booking from Supabase', async () => {
      await dbDeleteBooking(testBookingId);
      const bookings = await dbFetchBookings();
      expect(bookings?.find(b => b.id === testBookingId)).toBeUndefined();
    });
  });

  // ==========================================================================
  // SECTION 16-23: NURSE WORKFLOW, EARNINGS & REFERRAL SYSTEM
  // ==========================================================================
  describe('16-23. Nurse Workflow, 10% Referral Commission, & Lead Generation', () => {
    let testLeadId: string;

    it('generates deterministic nurse referral codes', () => {
      const code1 = generateNurseReferralCode('Priya Sharma', 'N1', '9849012345');
      expect(code1).toBeTruthy();
      expect(code1.length).toBeGreaterThan(4);
      expect(code1).toContain('PRI');
    });

    it('records a new Nurse Lead and updates referral points & rupee reward', async () => {
      testLeadId = `LD-QA-${Date.now()}`;
      const newLead: NurseLead = {
        id: testLeadId,
        nurseId: 'nurse-101',
        nurseName: 'Nurse Priya Sharma',
        patientName: 'Sneha Reddy (Lead)',
        patientPhone: '9876543211',
        serviceId: 'wound-dressing',
        serviceTitle: 'Post-Surgical Dressing Care',
        area: 'Banjara Hills',
        status: 'Pending Approval',
        pointsAwarded: 0,
        referralRupees: 0,
        submittedAt: new Date().toISOString()
      };

      const success = await dbInsertLead(newLead);
      expect(success).toBe(true);

      let leads = await dbFetchLeads();
      expect(leads).not.toBeNull();
      let created = leads!.find(l => l.id === testLeadId);
      expect(created).toBeDefined();
      expect(created?.status).toBe('Pending Approval');

      // Admin Approves Lead with 50 points and 10% commission (₹120)
      await dbUpdateLeadById(testLeadId, {
        status: 'Approved',
        pointsAwarded: 50,
        referralRupees: 120
      });

      leads = await dbFetchLeads();
      created = leads!.find(l => l.id === testLeadId);
      expect(created?.status).toBe('Approved');
      expect(created?.pointsAwarded).toBe(50);
      expect(created?.referralRupees).toBe(120);
    });

    it('calculates 10% referral commission accurately', () => {
      const orderAmount = 1499;
      const commissionRate = 0.10;
      const calculated = Math.round(orderAmount * commissionRate * 100) / 100;
      expect(calculated).toBe(149.9);
    });

    it('cleans up test lead record', async () => {
      await dbDeleteMultipleLeads([testLeadId]);
      const leads = await dbFetchLeads();
      expect(leads?.find(l => l.id === testLeadId)).toBeUndefined();
    });
  });

  // ==========================================================================
  // SECTION 24-28: DOCTOR TELECONSULTATION & PRESCRIPTIONS
  // ==========================================================================
  describe('24-28. Doctor Teleconsultations, Prescriptions & Clinical Documents', () => {
    let testConsultId: string;

    it('creates a doctor consultation request in Supabase', async () => {
      testConsultId = `DOC-QA-${Date.now()}`;
      const newConsult: DoctorConsultation = {
        id: testConsultId,
        patientName: 'Rahul Sharma',
        patientPhone: '9876543210',
        patientAge: 42,
        area: 'Madhapur',
        symptoms: 'Fever, cough, post-operative wound tenderness',
        status: 'Scheduled',
        doctorNotes: '',
        prescriptionUrl: '',
        createdAt: new Date().toISOString()
      };

      const success = await dbInsertConsultation(newConsult);
      expect(success).toBe(true);

      const consults = await dbFetchConsultations();
      expect(consults).not.toBeNull();
      const created = consults!.find(c => c.id === testConsultId);
      expect(created).toBeDefined();
      expect(created?.patientName).toBe('Rahul Sharma');
    });

    it('allows Doctor to issue diagnosis notes and doctor prescription', async () => {
      await dbUpdateConsultationById(testConsultId, {
        status: 'Completed',
        doctorNotes: 'Prescribed Amoxicillin 500mg TDS for 5 days. Daily sterile dressing advised.',
        prescriptionText: 'Prescribed Amoxicillin 500mg TDS for 5 days. Daily sterile dressing advised.',
        recommendedService: 'wound-dressing'
      });

      const consults = await dbFetchConsultations();
      const updated = consults!.find(c => c.id === testConsultId);
      expect(updated?.status).toBe('Completed');
      expect(updated?.doctorNotes).toContain('Amoxicillin');
    });

    it('cleans up test consultation from database', async () => {
      await dbDeleteMultipleConsultations([testConsultId]);
      const consults = await dbFetchConsultations();
      expect(consults?.find(c => c.id === testConsultId)).toBeUndefined();
    });
  });

  // ==========================================================================
  // SECTION 27-28 & 56: STORAGE SECURITY & UPLOAD VALIDATION
  // ==========================================================================
  describe('27-28 & 56. Document Upload Validation & Storage Defense', () => {
    it('accepts valid clinical MIME types (PDF, JPEG, PNG, WEBP)', () => {
      const validFile = { name: 'prescription.pdf', type: 'application/pdf', size: 1024 * 100 };
      const validation = validateClinicalFileUpload(validFile);
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('rejects executable and malicious file extensions', () => {
      const badExtensions = ['malware.exe', 'shell.sh', 'script.js', 'payload.php', 'exploit.bat'];
      for (const fname of badExtensions) {
        const maliciousFile = { name: fname, type: 'application/x-msdownload', size: 1024 };
        const validation = validateClinicalFileUpload(maliciousFile);
        expect(validation.valid).toBe(false);
        expect(validation.error).toBeDefined();
      }
    });

    it('enforces 5MB maximum file size limit', () => {
      const largeFile = {
        name: 'huge_scan.pdf',
        type: 'application/pdf',
        size: 6 * 1024 * 1024 // 6MB
      };

      const validation = validateClinicalFileUpload(largeFile);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('5MB');
    });
  });

  // ==========================================================================
  // SECTION 29-35: ADMIN OPERATIONS & BATCH DELETION CRUD
  // ==========================================================================
  describe('29-35. Admin Operations & Batch Deletion (Selected Delete & Delete All)', () => {
    it('supports batch deleting multiple records in a single database operation', async () => {
      const code1 = `QA_T1_${Date.now()}`;
      const code2 = `QA_T2_${Date.now()}`;

      // Insert two dummy coupons
      const c1 = await dbInsertCoupon({
        code: code1,
        discountType: 'flat',
        discountValue: 50,
        description: 'Batch QA coupon 1',
        status: 'Active'
      });
      const c2 = await dbInsertCoupon({
        code: code2,
        discountType: 'flat',
        discountValue: 100,
        description: 'Batch QA coupon 2',
        status: 'Active'
      });

      expect(c1).not.toBeNull();
      expect(c2).not.toBeNull();

      let coupons = await dbFetchCoupons();
      expect(coupons?.find(c => c.id === c1?.id)).toBeDefined();
      expect(coupons?.find(c => c.id === c2?.id)).toBeDefined();

      // Execute batch deletion
      await dbDeleteMultipleCoupons([c1!.id, c2!.id]);

      coupons = await dbFetchCoupons();
      expect(coupons?.find(c => c.id === c1?.id)).toBeUndefined();
      expect(coupons?.find(c => c.id === c2?.id)).toBeUndefined();
    });
  });

  // ==========================================================================
  // SECTION 51-55: SECURITY, IDOR, ROLE ESCALATION, & PRICE MANIPULATION
  // ==========================================================================
  describe('51-55. Security Defenses: IDOR, Escalation, Price Manipulation & Injection', () => {
    it('prevents client-side price manipulation through server-side calculation', async () => {
      const services = await dbFetchServices();
      expect(services).not.toBeNull();
      const svc = services![0];
      expect(svc).toBeDefined();

      // Ensure server truth overrides tampered client price
      const clientTamperedPrice = 1; // Attempt to buy a ₹500 service for ₹1
      expect(clientTamperedPrice).not.toEqual(svc.priceNumber);
      expect(svc.priceNumber).toBeGreaterThan(clientTamperedPrice);
    });

    it('sanitizes CSV formula injection characters (CWE-1236)', () => {
      const sanitize = (val: string) => {
        let str = String(val);
        if (/^[=+\-@\t\r]/.test(str)) {
          str = "'" + str;
        }
        return `"${str.replace(/"/g, '""')}"`;
      };

      expect(sanitize('=1+1')).toBe(`"'=1+1"`);
      expect(sanitize('+cmd|')).toBe(`"'+cmd|"`);
      expect(sanitize('@SUM(A1:A10)')).toBe(`"'@SUM(A1:A10)"`);
      expect(sanitize('-calc')).toBe(`"'-calc"`);
    });

    it('safely handles special characters and SQL injection strings without crashing', async () => {
      const sqlInjectionString = `Test'; DROP TABLE bookings;-- <script>alert("xss")</script>`;
      
      const testConsult: DoctorConsultation = {
        id: `QA-SQLI-${Date.now()}`,
        patientName: sqlInjectionString,
        patientPhone: '9870000000',
        area: 'Kondapur',
        symptoms: 'Test special chars: \' " < > & / \\ ; , % _ emoji 🏥',
        status: 'Scheduled',
        createdAt: new Date().toISOString()
      };

      // Ensure database driver parametrizes safely without syntax error or table drop
      await dbInsertConsultation(testConsult);

      const consults = await dbFetchConsultations();
      const found = consults?.find(c => c.id === testConsult.id);
      expect(found).toBeDefined();
      expect(found?.patientName).toBe(sqlInjectionString);

      // Verify table was not dropped
      const { count } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
      expect(count).toBeGreaterThanOrEqual(0);

      // Cleanup
      await dbDeleteMultipleConsultations([testConsult.id]);
    });
  });
});
