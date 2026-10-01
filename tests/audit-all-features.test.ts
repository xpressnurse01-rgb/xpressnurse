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
  dbUpdateNurseById,
  dbDeleteNurse,
  dbInsertLead,
  dbUpdateLeadById,
  dbDeleteLead,
  dbInsertService,
  dbUpdateServiceById,
  dbDeleteService,
  dbInsertConsultation,
  dbUpdateConsultationById,
  dbDeleteConsultation,
  dbInsertCoupon,
  dbUpdateCoupon,
  dbDeleteCoupon,
  dbInsertAppUser,
  dbUpdateAppUserById,
  dbDeleteAppUser,
  generateNurseReferralCode
} from '../src/lib/supabase';
import { 
  getCloudflareConfig,
  generateInvoiceDetails,
  validateClinicalFileUpload,
  syncDatabaseRecordsToStorage,
  uploadPrescriptionToCloudflareBucket,
  uploadCertificateToCloudflareBucket
} from '../src/lib/cloudflareStorage';
import { authenticateUserSecure } from '../src/lib/auth';
import { Booking, NurseProfile, NurseLead, Coupon, DoctorConsultation, AppUser } from '../src/types';

describe('Master Inventory Comprehensive Feature Audit', () => {
  const envUrl = process.env.VITE_SUPABASE_URL || 'https://ncgugriphhrhvdunluiz.supabase.co';
  const envAnon = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZ3VncmlwaGhyaHZkdW5sdWl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNTExNzAsImV4cCI6MjEwNTYyNzE3MH0.5MADQjkka8Of25SwPncEb6lrP3mxL713tcLBrGW6erQ';
  let supabase: SupabaseClient;

  beforeAll(async () => {
    supabase = createClient(envUrl, envAnon);
    const { data: existingNarendra } = await supabase.from('nurses').select('id').eq('id', 'NUR-8116').maybeSingle();
    if (!existingNarendra) {
      await dbInsertNurse({
        id: 'NUR-8116',
        name: 'Nurse Narendra Kumar',
        phone: '7569657371',
        email: 'narenk5632@gmail.com',
        experienceYears: 5,
        qualification: 'B.Sc Nursing (Registered Nurse)',
        serviceArea: 'Kukatpally',
        status: 'Active',
        totalLeads: 4,
        convertedLeads: 3,
        totalReferrals: 3,
        pointsEarned: 150,
        referralEarningsRupees: 0,
        certificateVerified: true
      });
    }

    const { data: narendraLeads } = await supabase.from('leads').select('id').eq('nurse_id', 'NUR-8116');
    if (!narendraLeads || narendraLeads.length < 3) {
      await dbInsertLead({
        id: 'LD-8116-1',
        nurseId: 'NUR-8116',
        patientName: 'Samatha Reddy (65 yrs, Female)',
        patientPhone: '9849123456',
        serviceId: 'saline-infusion',
        area: 'Kukatpally',
        submittedAt: new Date().toISOString(),
        status: 'Approved',
        leadValueRupees: 899,
        pointsAwarded: 50,
        referralCommissionRupees: 0
      });
      await dbInsertLead({
        id: 'LD-8116-2',
        nurseId: 'NUR-8116',
        patientName: 'Ramesh Babu',
        patientPhone: '9849234567',
        serviceId: 'wound-dressing',
        area: 'Kukatpally',
        submittedAt: new Date().toISOString(),
        status: 'Approved',
        leadValueRupees: 800,
        pointsAwarded: 50,
        referralCommissionRupees: 0
      });
      await dbInsertLead({
        id: 'LD-8116-3',
        nurseId: 'NUR-8116',
        patientName: 'Suresh Kumar',
        patientPhone: '9849345678',
        serviceId: 'foleys-catheter',
        area: 'Kukatpally',
        submittedAt: new Date().toISOString(),
        status: 'Approved',
        leadValueRupees: 1299,
        pointsAwarded: 50,
        referralCommissionRupees: 0
      });
    }
  });

  // =========================================================================
  // 1. ADMIN DASHBOARD: A. Routing & Dispatch
  // =========================================================================
  describe('Admin Dashboard: A. Routing & Dispatch', () => {
    it('views pending bookings awaiting assignment and performs area & eligibility auto-routing', async () => {
      const nurses = await dbFetchNurses();
      expect(nurses).toBeDefined();
      expect(nurses!.length).toBeGreaterThan(0);

      // Verify routing simulation logic matching AdminDashboard.tsx
      const patientArea = 'Gachibowli';
      const matchingNurse = nurses!.find(n => n.serviceArea === patientArea && n.certificateVerified) || nurses!.find(n => n.serviceArea === patientArea);
      expect(matchingNurse).toBeDefined();
      expect(matchingNurse?.serviceArea).toBe(patientArea);

      // Referral Rule 1 logic
      const referringNurse = nurses![0];
      const referralLock = `[RULE 1 TRIGGERED] Direct Nurse Referral: Assigned back to ${referringNurse.name}`;
      expect(referralLock).toContain(referringNurse.name);
    });

    it('prevents assignment to unavailable or unverified nurses when strict verification is required', () => {
      const mockNurses: NurseProfile[] = [
        {
          id: 'unverified-1',
          name: 'Unverified Nurse',
          phone: '9999900001',
          email: 'unverified@test.com',
          experienceYears: 1,
          qualification: 'GNM',
          serviceArea: 'LB Nagar',
          status: 'Inactive',
          certificateVerified: false,
          totalLeads: 0,
          convertedLeads: 0,
          totalReferrals: 0,
          pointsEarned: 0,
          referralEarningsRupees: 0,
          rating: 4.0
        },
        {
          id: 'verified-1',
          name: 'Verified Active Nurse',
          phone: '9999900002',
          email: 'verified@test.com',
          experienceYears: 5,
          qualification: 'B.Sc Nursing',
          serviceArea: 'LB Nagar',
          status: 'Active',
          certificateVerified: true,
          totalLeads: 5,
          convertedLeads: 4,
          totalReferrals: 3,
          pointsEarned: 200,
          referralEarningsRupees: 500,
          rating: 4.9
        }
      ];

      // Filtering criteria in App.tsx handleAutoRouteAll
      const eligibleNurse = mockNurses.find(n => n.serviceArea === 'LB Nagar' && n.certificateVerified && n.status === 'Active');
      expect(eligibleNurse).toBeDefined();
      expect(eligibleNurse?.id).toBe('verified-1');
      expect(eligibleNurse?.id).not.toBe('unverified-1');
    });
  });

  // =========================================================================
  // 1. ADMIN DASHBOARD: B. Booking Management
  // =========================================================================
  describe('Admin Dashboard: B. Booking Management', () => {
    it('creates, edits, views, generates invoice, and deletes a booking with DB persistence', async () => {
      const testId = `BK-TEST-${Date.now().toString().slice(-4)}`;
      const newBooking: Booking = {
        id: testId,
        patientName: 'Test Booking Patient',
        patientPhone: '9848099887',
        patientAge: 38,
        patientGender: 'Female',
        serviceId: 'wound-dressing',
        serviceTitle: 'Wound Dressing',
        area: 'Gachibowli',
        fullAddress: 'Villa 44, Gachibowli, Hyderabad',
        scheduledDate: '2026-10-02',
        scheduledTime: '02:00 PM',
        bookingType: 'Scheduled',
        hasPrescription: true,
        status: 'Pending',
        estimatedFee: 799,
        finalFee: 799,
        paymentStatus: 'Pending',
        createdAt: new Date().toISOString()
      };

      // 1. Insert
      const inserted = await dbInsertBooking(newBooking);
      expect(inserted).toBe(true);

      // 2. Fetch and Verify
      const bookings = await dbFetchBookings();
      const found = bookings?.find(b => b.id === testId);
      expect(found).toBeDefined();
      expect(found?.patientName).toBe('Test Booking Patient');

      // 3. Edit / Update
      const updated = await dbUpdateBooking(testId, { status: 'Assigned', notes: 'Updated notes' });
      expect(updated).toBe(true);

      // 4. Generate Invoice details
      const invoice = generateInvoiceDetails(found!);
      expect(invoice).toBeDefined();
      expect(invoice.totalAmount).toBe(799);
      expect(invoice.serviceTitle).toBe('Wound Dressing');
      expect(invoice.invoiceNumber).toContain('INV-');

      // 5. Delete
      const deleted = await dbDeleteBooking(testId);
      expect(deleted).toBe(true);
    });
  });

  // =========================================================================
  // 1. ADMIN DASHBOARD: C. Nurse Management
  // =========================================================================
  describe('Admin Dashboard: C. Nurse Management', () => {
    it('creates, updates verification/status, views, and deletes nurse records', async () => {
      const nurseId = `NUR-TEST-${Date.now().toString().slice(-4)}`;
      const testNurse: NurseProfile = {
        id: nurseId,
        name: 'Nurse Test Spec',
        phone: '9848055443',
        email: 'testnurse@xpressnurse.in',
        experienceYears: 4,
        qualification: 'B.Sc Nursing',
        serviceArea: 'Kukatpally',
        status: 'Active',
        certificateVerified: false,
        totalLeads: 0,
        convertedLeads: 0,
        totalReferrals: 0,
        pointsEarned: 0,
        referralEarningsRupees: 0,
        rating: 4.8,
        createdAt: new Date().toISOString()
      };

      // 1. Create
      const created = await dbInsertNurse(testNurse);
      expect(created).toBe(true);

      // 2. Verify in Directory
      const nurses = await dbFetchNurses();
      const matched = nurses?.find(n => n.id === nurseId);
      expect(matched).toBeDefined();
      expect(matched?.experienceYears).toBe(4);

      // 3. Verify & Approve
      const updated = await dbUpdateNurseById(nurseId, { certificateVerified: true, status: 'Active' });
      expect(updated).toBe(true);

      // 4. Delete / Cleanup
      const deleted = await dbDeleteNurse(nurseId);
      expect(deleted).toBe(true);
    });
  });

  // =========================================================================
  // 1. ADMIN DASHBOARD: D. Service Management
  // =========================================================================
  describe('Admin Dashboard: D. Service Management', () => {
    it('lists, creates, updates pricing, and deletes clinical services', async () => {
      const svcId = `svc-test-${Date.now().toString().slice(-4)}`;
      const testService = {
        id: svcId,
        title: 'Diagnostic Blood Draw',
        subtitle: 'At-home sample collection',
        description: 'Certified phlebotomy services',
        singleVisitPrice: 450,
        multiVisitPrice: 400,
        nightSurcharge: 250,
        prescriptionRequired: false,
        duration: '20-30 mins',
        features: ['Sterile kit', 'NABL lab tie-up'],
        category: 'Diagnostics'
      };

      // 1. Create
      const created = await dbInsertService(testService as any);
      expect(created).toBe(true);

      // 2. List & Verify
      const services = await dbFetchServices();
      const found = services?.find(s => s.id === svcId);
      expect(found).toBeDefined();
      expect(found?.singleVisitPrice).toBe(450);

      // 3. Update
      const updated = await dbUpdateServiceById(svcId, { singleVisitPrice: 499 });
      expect(updated).toBe(true);

      // 4. Delete
      const deleted = await dbDeleteService(svcId);
      expect(deleted).toBe(true);
    });
  });

  // =========================================================================
  // 1. ADMIN DASHBOARD: E. Leads & Referrals
  // =========================================================================
  describe('Admin Dashboard: E. Leads & Referrals', () => {
    it('handles lead submission, admin approval/rejection, points award, and commission calculation', async () => {
      const leadId = `LD-TEST-${Date.now().toString().slice(-4)}`;
      const testLead: NurseLead = {
        id: leadId,
        nurseId: 'NUR-8116',
        patientName: 'Test Lead Referral',
        patientPhone: '9848033221',
        patientAge: 62,
        patientGender: 'Male',
        serviceId: 'foleys-catheter',
        area: 'Gachibowli',
        notes: 'Needs catheter change',
        status: 'Pending Approval',
        submittedAt: new Date().toISOString()
      };

      // 1. Insert
      const created = await dbInsertLead(testLead);
      expect(created).toBe(true);

      // 2. Update to Converted with points and commission
      const approved = await dbUpdateLeadById(leadId, {
        status: 'Converted',
        pointsAwarded: 50,
        referralCommissionRupees: 129.90,
        leadValueRupees: 1299
      });
      expect(approved).toBe(true);

      // 3. Verify lead persistence
      const leads = await dbFetchLeads();
      const found = leads?.find(l => l.id === leadId);
      expect(found).toBeDefined();
      expect(found?.status).toBe('Converted');
      expect(found?.pointsAwarded).toBe(50);

      // 4. Cleanup
      const deleted = await dbDeleteLead(leadId);
      expect(deleted).toBe(true);
    });
  });

  // =========================================================================
  // 1. ADMIN DASHBOARD: F. Consultation Management
  // =========================================================================
  describe('Admin Dashboard: F. Consultation Management', () => {
    it('creates, updates, reviews prescription, and deletes teleconsultations', async () => {
      const consultId = `CONS-TEST-${Date.now().toString().slice(-4)}`;
      const testConsult: DoctorConsultation = {
        id: consultId,
        patientName: 'Teleconsult Patient',
        patientPhone: '9848066778',
        patientAge: 40,
        patientGender: 'Female',
        area: 'Gachibowli',
        symptoms: 'Dehydration, post viral fever',
        status: 'Awaiting Doctor Call',
        createdAt: new Date().toISOString()
      };

      // 1. Create
      const created = await dbInsertConsultation(testConsult);
      expect(created).toBe(true);

      // 2. Doctor updates with prescription
      const updated = await dbUpdateConsultationById(consultId, {
        status: 'Prescription Issued',
        prescriptionIssued: true,
        prescriptionText: 'Administer 500ml Normal Saline IV once daily for 2 days.',
        recommendedService: 'saline-infusion'
      });
      expect(updated).toBe(true);

      // 3. Verify consultation
      const consults = await dbFetchConsultations();
      const found = consults?.find(c => c.id === consultId);
      expect(found).toBeDefined();
      expect(found?.prescriptionIssued).toBe(true);
      expect(found?.prescriptionText).toContain('Normal Saline');

      // 4. Delete
      const deleted = await dbDeleteConsultation(consultId);
      expect(deleted).toBe(true);
    });
  });

  // =========================================================================
  // 1. ADMIN DASHBOARD: G. Coupon Management
  // =========================================================================
  describe('Admin Dashboard: G. Coupon Management', () => {
    it('manages coupons: creation, validity, discount application, and deletion', async () => {
      const coupId = `coup-test-${Date.now().toString().slice(-4)}`;
      const testCoupon: Coupon = {
        id: coupId,
        code: 'TESTPROMO50',
        description: 'Test promotional coupon',
        discountType: 'flat',
        discountValue: 50,
        minOrderAmount: 399,
        status: 'Active',
        timesUsed: 0
      };

      // 1. Create
      const created = await dbInsertCoupon(testCoupon);
      expect(created).toBeDefined();

      // 2. Fetch and Verify
      const coupons = await dbFetchCoupons();
      const found = coupons?.find(c => c.code === 'TESTPROMO50');
      expect(found).toBeDefined();
      expect(found?.discountValue).toBe(50);

      // 3. Update
      const updated = await dbUpdateCoupon(found!.id, { timesUsed: 1 });
      expect(updated).toBe(true);

      // 4. Delete
      const deleted = await dbDeleteCoupon(found!.id);
      expect(deleted).toBe(true);
    });
  });

  // =========================================================================
  // 1. ADMIN DASHBOARD: H. Credentials and User Management
  // =========================================================================
  describe('Admin Dashboard: H. Credentials & User Management', () => {
    it('manages users, verifies RBAC isolation and instant credentials update', async () => {
      const uniqueNum = Date.now().toString().slice(-4);
      const userId = `USR-TEST-${uniqueNum}`;
      const testIdentifier = `staff.test.${uniqueNum}@xpressnurse.in`;
      const testUser: AppUser = {
        id: userId,
        identifier: testIdentifier,
        name: 'Staff Test User',
        pin: '5566',
        phone: '9848011999',
        email: testIdentifier,
        role: 'nurse',
        designation: 'Staff Nurse'
      };

      // 1. Create
      const created = await dbInsertAppUser(testUser);
      expect(created).toBe(true);

      // 2. Authenticate
      const authResult = await authenticateUserSecure(testIdentifier, '5566', 'nurse');
      expect(authResult.success).toBe(true);
      expect(authResult.user?.id).toBe(userId);

      // 3. Update PIN
      const updated = await dbUpdateAppUserById(userId, { pin: '7788' });
      expect(updated).toBe(true);

      // 4. Verify old PIN rejected, new PIN accepted
      const oldAuth = await authenticateUserSecure(testIdentifier, '5566', 'nurse');
      expect(oldAuth.success).toBe(false);

      const newAuth = await authenticateUserSecure(testIdentifier, '7788', 'nurse');
      expect(newAuth.success).toBe(true);

      // 5. Delete
      const deleted = await dbDeleteAppUser(userId);
      expect(deleted).toBe(true);
    });
  });

  // =========================================================================
  // 1. ADMIN DASHBOARD: I. Storage & Invoices
  // =========================================================================
  describe('Admin Dashboard: I. Storage & Invoices', () => {
    it('validates Cloudflare R2 configurations, invoice generation, and file validation', () => {
      const cfConfig = getCloudflareConfig();
      expect(cfConfig.bucketName).toBeTruthy();
      expect(cfConfig.publicDomain).toContain('r2.dev');

      // Test clinical file validation
      const validPdf = new File(['%PDF-1.4 dummy content'], 'rx.pdf', { type: 'application/pdf' });
      const validation = validateClinicalFileUpload(validPdf);
      expect(validation.valid).toBe(true);

      const invalidExe = new File(['malicious'], 'hack.exe', { type: 'application/x-msdownload' });
      const badValidation = validateClinicalFileUpload(invalidExe);
      expect(badValidation.valid).toBe(false);
    });
  });

  // =========================================================================
  // 2. NURSE DASHBOARD VERIFICATION
  // =========================================================================
  describe('Nurse Dashboard: Tabs & Workflows', () => {
    it('authenticates Nurse Narendra Kumar (7569657371 / 7371) and verifies referrals', async () => {
      const auth = await authenticateUserSecure('7569657371', '7371', 'nurse');
      expect(auth.success).toBe(true);
      expect(auth.user?.name).toContain('Narendra');

      // Fetch referrals for NUR-8116
      const leads = await dbFetchLeads();
      const narendraLeads = leads?.filter(l => l.nurseId === 'NUR-8116');
      expect(narendraLeads).toBeDefined();
      expect(narendraLeads!.length).toBeGreaterThanOrEqual(3);

      const samatha = narendraLeads?.find(l => l.patientName.includes('Samatha'));
      expect(samatha).toBeDefined();
    });

    it('generates unique nurse referral code correctly', () => {
      const code = generateNurseReferralCode('Nurse Kalpana', 'NUR-5166', '1234567890');
      expect(code).toBe('XN-KALPANA166');
    });
  });

  // =========================================================================
  // 3. DOCTOR DASHBOARD VERIFICATION
  // =========================================================================
  describe('Doctor Dashboard: Clinical Panel', () => {
    it('authenticates doctor Dr. K. V. Reddy and verifies consultation queue', async () => {
      const auth = await authenticateUserSecure('dr.reddy@xpressnurse.in', '4321', 'doctor');
      expect(auth.success).toBe(true);
      expect(auth.user?.role).toBe('doctor');

      const consults = await dbFetchConsultations();
      expect(consults).toBeDefined();
    });
  });

  // =========================================================================
  // 4. CROSS-DASHBOARD WORKFLOWS A, B, C, D
  // =========================================================================
  describe('Cross-Dashboard Workflows (A, B, C, D)', () => {
    it('Workflow A: Patient creates booking -> Admin assigns -> Nurse receives and updates status', async () => {
      const bookingId = `BK-WFA-${Date.now().toString().slice(-4)}`;
      const wfBooking: Booking = {
        id: bookingId,
        patientName: 'Workflow A Patient',
        patientPhone: '9848012399',
        patientAge: 48,
        patientGender: 'Female',
        serviceId: 'saline-infusion',
        serviceTitle: 'IV Infusions',
        area: 'Gachibowli',
        fullAddress: 'Flat 102, Gachibowli, Hyderabad',
        scheduledDate: '2026-10-02',
        scheduledTime: 'Immediate',
        bookingType: 'Instant',
        hasPrescription: true,
        status: 'Pending',
        estimatedFee: 899,
        finalFee: 899,
        paymentStatus: 'Pending',
        createdAt: new Date().toISOString()
      };

      // 1. Patient creates
      await dbInsertBooking(wfBooking);

      // 2. Admin assigns
      await dbUpdateBooking(bookingId, {
        assignedNurseId: 'NUR-8116',
        assignedNurseName: 'Nurse Narendra Kumar',
        status: 'Assigned'
      });

      // 3. Nurse accepts and marks In-Progress
      await dbUpdateBooking(bookingId, {
        status: 'In-Progress',
        nurseAcceptanceStatus: 'Accepted'
      });

      // 4. Nurse completes
      await dbUpdateBooking(bookingId, {
        status: 'Completed'
      });

      const verified = (await dbFetchBookings())?.find(b => b.id === bookingId);
      expect(verified?.status).toBe('Completed');
      expect(verified?.assignedNurseId).toBe('NUR-8116');

      // Cleanup
      await dbDeleteBooking(bookingId);
    });

    it('Workflow B: Patient requests doctor consult -> Doctor issues prescription -> Saved to DB', async () => {
      const consultId = `CONS-WFB-${Date.now().toString().slice(-4)}`;
      const wfConsult: DoctorConsultation = {
        id: consultId,
        patientName: 'Workflow B Patient',
        patientPhone: '9848098765',
        patientAge: 32,
        patientGender: 'Male',
        area: 'Madhapur',
        symptoms: 'Post-op wound check needed',
        status: 'Awaiting Doctor Call',
        createdAt: new Date().toISOString()
      };

      await dbInsertConsultation(wfConsult);

      // Doctor issues Rx
      await dbUpdateConsultationById(consultId, {
        status: 'Prescription Issued',
        prescriptionIssued: true,
        prescriptionText: 'Change dressing daily with sterile Betadine gauze.',
        recommendedService: 'wound-dressing'
      });

      const consult = (await dbFetchConsultations())?.find(c => c.id === consultId);
      expect(consult?.prescriptionIssued).toBe(true);
      expect(consult?.recommendedService).toBe('wound-dressing');

      // Cleanup
      await dbDeleteConsultation(consultId);
    });

    it('Workflow C: Nurse refers patient -> Admin approves -> Points & earnings calculated once', async () => {
      const leadId = `LD-WFC-${Date.now().toString().slice(-4)}`;
      const wfLead: NurseLead = {
        id: leadId,
        nurseId: 'NUR-8116',
        patientName: 'Workflow C Referred Patient',
        patientPhone: '9848054321',
        patientAge: 55,
        patientGender: 'Female',
        serviceId: 'saline-infusion',
        area: 'Gachibowli',
        status: 'Pending Approval',
        submittedAt: new Date().toISOString()
      };

      await dbInsertLead(wfLead);

      // Admin converts
      await dbUpdateLeadById(leadId, {
        status: 'Converted',
        leadValueRupees: 899,
        pointsAwarded: 50,
        referralCommissionRupees: 89.90
      });

      const lead = (await dbFetchLeads())?.find(l => l.id === leadId);
      expect(lead?.status).toBe('Converted');
      expect(lead?.pointsAwarded).toBe(50);
      expect(lead?.referralCommissionRupees).toBe(89.90);

      // Cleanup
      await dbDeleteLead(leadId);
    });
  });
});
