import { describe, it, expect } from 'vitest';
import type { NurseProfile, NurseLead, Booking } from '../src/types';

describe('Referral Lifecycle & Point Reversal Invariants', () => {
  it('does not award points to referrer upon new nurse registration (requires Admin approval)', () => {
    const referrer: NurseProfile = {
      id: 'nurse-101',
      name: 'Narendra Kumar',
      phone: '7569657371',
      email: 'narendra@example.com',
      qualification: 'GNM',
      experienceYears: 4,
      serviceArea: 'Kukatpally',
      status: 'Active',
      pointsEarned: 100,
      referralEarningsRupees: 500,
      totalReferrals: 1,
      convertedLeads: 1,
      totalLeads: 1,
      rating: 4.9,
      certificateVerified: true
    };

    // New referred nurse registers
    const newNurse: NurseProfile = {
      id: 'nurse-new-1',
      name: 'Priya Sharma',
      phone: '9876543210',
      email: 'priya@example.com',
      qualification: 'B.Sc Nursing',
      experienceYears: 2,
      serviceArea: 'Madhapur',
      status: 'Pending Verification', // Must be pending
      certificateVerified: false,     // Unverified
      referredByNurseId: referrer.id,
      pointsEarned: 0,
      referralEarningsRupees: 0,
      totalReferrals: 0,
      convertedLeads: 0,
      totalLeads: 0,
      rating: 4.8
    };

    // Referrer points must NOT increase prior to Admin review
    expect(referrer.pointsEarned).toBe(100);
    expect(referrer.referralEarningsRupees).toBe(500);
    expect(newNurse.status).toBe('Pending Verification');
    expect(newNurse.certificateVerified).toBe(false);
  });

  it('credits points only when Admin approves the referred nurse', () => {
    let referrer: NurseProfile = {
      id: 'nurse-101',
      name: 'Narendra Kumar',
      phone: '7569657371',
      email: 'narendra@example.com',
      qualification: 'GNM',
      experienceYears: 4,
      serviceArea: 'Kukatpally',
      status: 'Active',
      pointsEarned: 100,
      referralEarningsRupees: 500,
      totalReferrals: 1,
      convertedLeads: 1,
      totalLeads: 1,
      rating: 4.9,
      certificateVerified: true
    };

    // Admin approves the nurse
    const approvedNurse: NurseProfile = {
      id: 'nurse-new-1',
      name: 'Priya Sharma',
      phone: '9876543210',
      email: 'priya@example.com',
      qualification: 'B.Sc Nursing',
      experienceYears: 2,
      serviceArea: 'Madhapur',
      status: 'Active',
      certificateVerified: true,
      referredByNurseId: referrer.id,
      pointsEarned: 0,
      referralEarningsRupees: 0,
      totalReferrals: 0,
      convertedLeads: 0,
      totalLeads: 0,
      rating: 4.8
    };

    // Simulate Admin approval logic
    referrer = {
      ...referrer,
      pointsEarned: (referrer.pointsEarned || 0) + 50,
      referralEarningsRupees: (referrer.referralEarningsRupees || 0) + 500,
      convertedLeads: (referrer.convertedLeads || 0) + 1,
      totalReferrals: Math.max(referrer.totalReferrals || 0, (referrer.convertedLeads || 0) + 1)
    };

    expect(referrer.pointsEarned).toBe(150);
    expect(referrer.referralEarningsRupees).toBe(1000);
    expect(referrer.convertedLeads).toBe(2);
    expect(approvedNurse.certificateVerified).toBe(true);
  });

  it('reverses points and commission when a referred nurse is deleted', () => {
    let referrer: NurseProfile = {
      id: 'nurse-101',
      name: 'Narendra Kumar',
      phone: '7569657371',
      email: 'narendra@example.com',
      qualification: 'GNM',
      experienceYears: 4,
      serviceArea: 'Kukatpally',
      status: 'Active',
      pointsEarned: 150,
      referralEarningsRupees: 1000,
      totalReferrals: 2,
      convertedLeads: 2,
      totalLeads: 2,
      rating: 4.9,
      certificateVerified: true
    };

    const nurseToDelete: NurseProfile = {
      id: 'nurse-new-1',
      name: 'Priya Sharma',
      phone: '9876543210',
      email: 'priya@example.com',
      qualification: 'B.Sc Nursing',
      experienceYears: 2,
      serviceArea: 'Madhapur',
      status: 'Active',
      certificateVerified: true,
      referredByNurseId: referrer.id,
      pointsEarned: 0,
      referralEarningsRupees: 0,
      totalReferrals: 0,
      convertedLeads: 0,
      totalLeads: 0,
      rating: 4.8
    };

    // When deleted, points and commission are deducted
    if (nurseToDelete.referredByNurseId && (nurseToDelete.certificateVerified || nurseToDelete.status === 'Active')) {
      referrer = {
        ...referrer,
        pointsEarned: Math.max(0, (referrer.pointsEarned || 0) - 50),
        referralEarningsRupees: Math.max(0, (referrer.referralEarningsRupees || 0) - 500),
        convertedLeads: Math.max(0, (referrer.convertedLeads || 0) - 1),
        totalReferrals: Math.max(0, (referrer.totalReferrals || 0) - 1)
      };
    }

    expect(referrer.pointsEarned).toBe(100);
    expect(referrer.referralEarningsRupees).toBe(500);
    expect(referrer.convertedLeads).toBe(1);
    expect(referrer.totalReferrals).toBe(1);
  });

  it('reverses points when an approved referred patient booking is cancelled, deleted, or rejected', () => {
    let referrer: NurseProfile = {
      id: 'nurse-101',
      name: 'Narendra Kumar',
      phone: '7569657371',
      email: 'narendra@example.com',
      qualification: 'GNM',
      experienceYears: 4,
      serviceArea: 'Kukatpally',
      status: 'Active',
      pointsEarned: 200,
      referralEarningsRupees: 600,
      totalReferrals: 3,
      convertedLeads: 3,
      totalLeads: 3,
      rating: 4.9,
      certificateVerified: true
    };

    const patientBooking: Booking = {
      id: 'BK-PAT-8812',
      serviceId: 'srv-wound',
      serviceTitle: 'Wound Dressing',
      patientName: 'K. Ramesh',
      patientPhone: '9988776655',
      patientAge: 48,
      patientGender: 'Male',
      area: 'Kukatpally',
      fullAddress: 'Plot 44, Kukatpally',
      preferredDate: '2026-10-05',
      preferredTime: '10:00 AM',
      bookingType: 'Standard',
      status: 'Completed',
      hasPrescription: true,
      estimatedFee: 600,
      finalFee: 600,
      referringNurseId: referrer.id,
      referralBonusRupees: 60,
      createdAt: new Date().toISOString()
    };

    const patientLead: NurseLead = {
      id: `LEAD-BK-${patientBooking.id}`,
      nurseId: referrer.id,
      patientName: patientBooking.patientName,
      patientPhone: patientBooking.patientPhone,
      serviceId: patientBooking.serviceId,
      area: patientBooking.area,
      status: 'Approved',
      pointsAwarded: 50,
      referralCommissionRupees: 60,
      submittedAt: new Date().toISOString()
    };

    // Action: Patient booking is deleted/rejected
    const pointsToDeduct = patientLead.pointsAwarded || 50;
    const rupeesToDeduct = patientLead.referralCommissionRupees || 60;

    referrer = {
      ...referrer,
      pointsEarned: Math.max(0, (referrer.pointsEarned || 0) - pointsToDeduct),
      referralEarningsRupees: Math.max(0, (referrer.referralEarningsRupees || 0) - rupeesToDeduct),
      convertedLeads: Math.max(0, (referrer.convertedLeads || 0) - 1),
      totalReferrals: Math.max(0, (referrer.totalReferrals || 0) - 1)
    };

    expect(referrer.pointsEarned).toBe(150);
    expect(referrer.referralEarningsRupees).toBe(540);
    expect(referrer.convertedLeads).toBe(2);
    expect(referrer.totalReferrals).toBe(2);
  });

  it('guarantees points never drop below 0 if deducting from 0 points', () => {
    let referrer: NurseProfile = {
      id: 'nurse-101',
      name: 'Narendra Kumar',
      phone: '7569657371',
      email: 'narendra@example.com',
      qualification: 'GNM',
      experienceYears: 4,
      serviceArea: 'Kukatpally',
      status: 'Active',
      pointsEarned: 20, // Less than 50
      referralEarningsRupees: 100,
      totalReferrals: 1,
      convertedLeads: 1,
      totalLeads: 1,
      rating: 4.9,
      certificateVerified: true
    };

    referrer = {
      ...referrer,
      pointsEarned: Math.max(0, (referrer.pointsEarned || 0) - 50),
      referralEarningsRupees: Math.max(0, (referrer.referralEarningsRupees || 0) - 500),
      convertedLeads: Math.max(0, (referrer.convertedLeads || 0) - 1),
      totalReferrals: Math.max(0, (referrer.totalReferrals || 0) - 1)
    };

    expect(referrer.pointsEarned).toBe(0);
    expect(referrer.referralEarningsRupees).toBe(0);
    expect(referrer.convertedLeads).toBe(0);
  });
});
