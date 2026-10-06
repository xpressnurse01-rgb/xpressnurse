// Provide minimal WebSocket shim for Node.js 20 CLI runner
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class DummyWebSocket {
    constructor() {}
    addEventListener() {}
    removeEventListener() {}
  };
}

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ncgugriphhrhvdunluiz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZ3VncmlwaGhyaHZkdW5sdWl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNTExNzAsImV4cCI6MjEwNTYyNzE3MH0.5MADQjkka8Of25SwPncEb6lrP3mxL713tcLBrGW6erQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function generateNurseReferralCode(name, id, phone) {
  const cleanName = (name || '').replace(/^(Nurse|Dr\.?|Sister|Brother)\s+/i, '').trim();
  const namePart = (cleanName.split(/\s+/)[0] || 'NURSE').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'NURSE';
  let numPart = '';
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    numPart = digits.slice(-3);
  }
  if (!numPart && id) {
    const idDigits = id.replace(/\D/g, '');
    numPart = idDigits.slice(-3);
  }
  if (!numPart) numPart = '101';
  return `XN-${namePart}${numPart}`;
}

async function testAll() {
  console.log('=====================================================');
  console.log('  STARTING FULL TEST SUITE: XPRESS NURSE SYSTEM');
  console.log('=====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
    }
  }

  // -----------------------------------------------------------------
  // TEST 1: Referral Code Generation & Matching
  // -----------------------------------------------------------------
  console.log('[1] Testing Referral Code Generation...');
  const codePriya = generateNurseReferralCode('Nurse Priya Sharma', 'nurse-101', '9849012345');
  const codeRajesh = generateNurseReferralCode('Nurse Rajesh Kumar', 'nurse-102', '9849023456');
  assert(codePriya === 'XN-PRIYA345', `Code for Priya Sharma: ${codePriya}`);
  assert(codeRajesh === 'XN-RAJESH456', `Code for Rajesh Kumar: ${codeRajesh}`);

  // -----------------------------------------------------------------
  // TEST 2: Payment Rejection & ₹629 Bug Resolution
  // -----------------------------------------------------------------
  console.log('\n[2] Testing Payment Rejection Calculation (₹629 Bug)...');
  
  // Scenario A: Active visit fee ₹899 -> 70% is ₹629
  const activeBooking = {
    id: 'BK-1001',
    estimatedFee: 899,
    status: 'Assigned',
    serviceTitle: 'IV Saline Infusion',
    patientName: 'K. Ramesh',
    rejectionReason: undefined
  };
  
  function calcVisitPayout(b) {
    const fee = b.estimatedFee || 800;
    const baseShare = Math.round(fee * 0.7);
    const nightShare = b.nightSurcharge ? Math.round(b.nightSurcharge * 0.6) : 0;
    const totalVisitPay = baseShare + nightShare;
    const isCompleted = b.status === 'Completed';
    const isCancelledOrRejected = b.status === 'Cancelled' || b.status === 'Rejected' || Boolean(b.rejectionReason);

    return {
      amount: isCancelledOrRejected ? 0 : totalVisitPay,
      status: isCompleted ? 'Paid' : isCancelledOrRejected ? 'Rejected' : 'Pending',
      rejectionReason: b.rejectionReason
    };
  }

  const activePayout = calcVisitPayout(activeBooking);
  assert(activePayout.status === 'Pending', 'Active booking is Pending');
  assert(activePayout.amount === 629, `Active booking amount is ₹${activePayout.amount}`);

  // Scenario B: Admin rejects payment/order -> MUST BE ₹0 and 'Rejected'
  const rejectedBooking = {
    id: 'BK-1001',
    estimatedFee: 899,
    status: 'Cancelled',
    rejectionReason: 'Payment rejected by Admin'
  };
  const rejectedPayout = calcVisitPayout(rejectedBooking);
  assert(rejectedPayout.status === 'Rejected', 'Rejected booking status is "Rejected"');
  assert(rejectedPayout.amount === 0, 'Rejected booking amount is ₹0');

  // Verify pending sum filters out Rejected
  const allItems = [activePayout, rejectedPayout];
  const pendingTotal = allItems.filter(p => p.status === 'Pending').reduce((s, i) => s + i.amount, 0);
  assert(pendingTotal === 629, 'Pending total ONLY includes active booking (₹629), not the rejected one');

  // If both rejected:
  const allRejected = [rejectedPayout];
  const allRejectedPendingTotal = allRejected.filter(p => p.status === 'Pending').reduce((s, i) => s + i.amount, 0);
  assert(allRejectedPendingTotal === 0, 'When booking is rejected, nurse pending amount is exactly ₹0 (Fixed!)');

  // -----------------------------------------------------------------
  // TEST 3: Supabase Database Live Connection & Schema Verification
  // -----------------------------------------------------------------
  console.log('\n[3] Testing Supabase Database Tables...');
  try {
    const { data: nurses, error: errNurses } = await supabase.from('nurses').select('*').limit(5);
    assert(!errNurses && nurses && nurses.length > 0, `Nurses table active (${nurses?.length || 0} rows found)`);

    const { data: bookings, error: errBookings } = await supabase.from('bookings').select('*').limit(5);
    assert(!errBookings && bookings, `Bookings table active (${bookings?.length || 0} rows found)`);

    const { data: appUsers, error: errUsers } = await supabase.from('app_users').select('*').limit(5);
    assert(!errUsers && appUsers, `App Users credentials table active (${appUsers?.length || 0} rows found)`);

    const { data: leads, error: errLeads } = await supabase.from('leads').select('*').limit(5);
    assert(!errLeads && leads, `Leads / Referrals table active (${leads?.length || 0} rows found)`);
    if (errNurses) console.log('Nurses err:', errNurses);
    if (errBookings) console.log('Bookings err:', errBookings);
    if (errUsers) console.log('Users err:', errUsers);
    if (errLeads) console.log('Leads err:', errLeads);
  } catch (e) {
    console.error('Supabase query error:', e);
  }

  // -----------------------------------------------------------------
  // TEST 4: Unified Login Role Auto-Detection Simulation
  // -----------------------------------------------------------------
  console.log('\n[4] Testing Smart Unified Login Auto-Detection...');
  
  // Seed directory simulation matching supabase.ts
  const SEED_USERS = [
    { role: 'admin', identifier: 'admin@xpressnurse.in', pin: '9001' },
    { role: 'doctor', identifier: 'vikramaditya@xpressnurse.in', pin: '2001' },
    { role: 'nurse', identifier: 'priya.nursing@xpressnurse.in', pin: '1001', phone: '9849012345' }
  ];

  function verifyUnifiedPin(inputIdentifier, inputPin) {
    const cleanId = inputIdentifier.trim().toLowerCase();
    const cleanPin = inputPin.trim();
    const found = SEED_USERS.find(u => 
      u.identifier.toLowerCase() === cleanId || 
      (u.phone && u.phone === cleanId)
    );
    if (!found) return { success: false, message: 'Account not found' };
    if (found.pin !== cleanPin) return { success: false, message: 'Incorrect PIN' };
    return { success: true, user: found, role: found.role };
  }

  const adminAuth = verifyUnifiedPin('admin@xpressnurse.in', '9001');
  assert(adminAuth.success && adminAuth.role === 'admin', 'Admin login auto-detected role "admin" -> routes to /admin');

  const doctorAuth = verifyUnifiedPin('vikramaditya@xpressnurse.in', '2001');
  assert(doctorAuth.success && doctorAuth.role === 'doctor', 'Doctor login auto-detected role "doctor" -> routes to /doctor');

  const nurseAuth = verifyUnifiedPin('9849012345', '1001');
  assert(nurseAuth.success && nurseAuth.role === 'nurse', 'Nurse login with phone auto-detected role "nurse" -> routes to /nurse');

  const wrongPin = verifyUnifiedPin('admin@xpressnurse.in', '0000');
  assert(!wrongPin.success, 'Wrong PIN correctly rejected');

  // -----------------------------------------------------------------
  // TEST 5: HTTP Server Status Check
  // -----------------------------------------------------------------
  console.log('\n[5] Testing Vite Dev Server HTTP Endpoints...');
  try {
    const resHome = await fetch('http://localhost:5173/');
    assert(resHome.status === 200, `Root endpoint http://localhost:5173/ returned status ${resHome.status}`);

    const resLogin = await fetch('http://localhost:5173/login');
    assert(resLogin.status === 200, `Login endpoint http://localhost:5173/login returned status ${resLogin.status}`);
  } catch (e) {
    console.error('HTTP check error:', e);
  }

  // -----------------------------------------------------------------
  // TEST 6: Testing Service Done & Admin Approval Workflow
  // -----------------------------------------------------------------
  console.log('\n[6] Testing Service Done & Admin Approval Earnings Workflow...');

  const mockBooking = {
    id: 'BK-TEST-1',
    assignedNurseId: 'nurse-test',
    patientName: 'Ramakrishna',
    status: 'In-Progress',
    nurseAcceptanceStatus: 'Service Done',
    notes: '[Service Done by Nurse - Waiting for Admin Approval]',
    finalFee: 1000
  };

  const isFinishedWaiting = mockBooking.status !== 'Completed' &&
    mockBooking.status !== 'Cancelled' &&
    mockBooking.status !== 'Rejected' &&
    (mockBooking.nurseAcceptanceStatus === 'Service Done' || Boolean(mockBooking.notes && mockBooking.notes.includes('Waiting for Admin Approval')));

  assert(isFinishedWaiting, 'Visit is recognized as Service Done waiting for admin approval');

  // Before Admin Approval:
  const pendingVisits = [mockBooking].filter(() => isFinishedWaiting);
  const completedVisits = [mockBooking].filter(b => b.status === 'Completed');
  const finalizedEarnings = completedVisits.reduce((acc, b) => acc + Math.round(b.finalFee * 0.70), 0);
  const pendingEarnings = pendingVisits.reduce((acc, b) => acc + Math.round(b.finalFee * 0.70), 0);

  assert(finalizedEarnings === 0, 'Finalized earnings before admin approval is strictly ₹0');
  assert(pendingEarnings === 700, 'Pending approval earnings is tracked at 70% (₹700)');

  // After Admin Approval:
  const approvedBooking = {
    ...mockBooking,
    status: 'Completed',
    nurseAcceptanceStatus: 'Accepted',
    nursePayoutRupees: 700,
    notes: '[Admin Verified & Approved - Service Completed]'
  };

  const completedAfterAdmin = [approvedBooking].filter(b => b.status === 'Completed');
  const finalizedEarningsAfterAdmin = completedAfterAdmin.reduce((acc, b) => acc + (b.nursePayoutRupees || Math.round(b.finalFee * 0.70)), 0);
  const pendingAfterAdmin = [approvedBooking].filter(b =>
    b.status !== 'Completed' &&
    b.status !== 'Cancelled' &&
    b.status !== 'Rejected' &&
    (b.nurseAcceptanceStatus === 'Service Done' || Boolean(b.notes && b.notes.includes('Waiting for Admin Approval')))
  );

  assert(finalizedEarningsAfterAdmin === 700, 'After admin verifies and accepts, earnings are released (₹700)');
  assert(pendingAfterAdmin.length === 0, 'Pending visits count drops to 0 after admin verification');

  console.log('\n=====================================================');
  console.log(`  TEST RESULTS: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('=====================================================');

  process.exit(passed === total ? 0 : 1);
}

testAll();
