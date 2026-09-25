import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { PrescriptionBanner } from './components/PrescriptionBanner';
import { ServicesSection } from './components/ServicesSection';
import { AboutSection } from './components/AboutSection';
import { WhyChooseUs } from './components/WhyChooseUs';
import { HowItWorks } from './components/HowItWorks';
import { DoctorConsultSection } from './components/DoctorConsultSection';
import { Testimonials } from './components/Testimonials';
import { BookingModal } from './components/BookingModal';
import { QrCodeModal } from './components/QrCodeModal';
import { NurseDashboard } from './components/NurseDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { DoctorDashboard } from './components/DoctorDashboard';
import { AiAssistant } from './components/AiAssistant';
import { Footer } from './components/Footer';
import { MobileBottomBar } from './components/MobileBottomBar';
import { EmptyStatePage } from './components/EmptyStatePage';
import { NotFoundPage } from './components/NotFoundPage';
import { LoginPage } from './components/LoginPage';
import { PolicyModal, PolicyType } from './components/PolicyModal';
import { 
  supabase,
  dbFetchBookings, 
  dbSaveBooking, 
  dbFetchNurses, 
  dbUpdateNurse, 
  dbSaveLead, 
  dbFetchLeads,
  dbFetchConsultations, 
  dbSaveConsultation,
  dbFetchServices,
  dbFetchCoupons,
  dbInsertCoupon,
  dbUpdateCoupon,
  dbDeleteCoupon,
  DEFAULT_COUPONS,
  SEED_APP_USERS,
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
  dbInsertAppUser,
  dbUpdateAppUserById,
  dbDeleteAppUser
} from './lib/supabase';

import { 
  Booking, 
  NurseProfile, 
  NurseLead, 
  DoctorConsultation, 
  ServiceId,
  ServiceItem,
  AppUser,
  Coupon
} from './types';
import { uploadToCloudflareStorage } from './lib/cloudflareStorage';

export const App: React.FC = () => {
  // URL Routing State
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Policy Modal state (Privacy, Terms, Refund)
  const [activePolicy, setActivePolicy] = useState<PolicyType>(null);

  // Dynamic Document Titles & Meta Descriptions
  useEffect(() => {
    let title = 'Xpress Nurse | Home Nursing & Medical Care at Your Doorstep';
    let metaDesc = 'Xpress Nurse connects patients and families with trained nursing professionals for safe, compassionate care at home in Hyderabad. IV saline infusion, wound dressing, catheter care, Ryles tube, and online doctor consultation. Call 75696 57371.';

    if (currentPath === '/nurse') {
      title = 'Nurse Staff Portal & Rewards | Xpress Nurse';
      metaDesc = 'Xpress Nurse Staff Portal - Manage assigned home visits, patient referrals, points ledger, and service dispatch in Hyderabad.';
    } else if (currentPath === '/doctor') {
      title = 'Doctor Teleconsultation Panel | Xpress Nurse';
      metaDesc = 'Xpress Nurse Tele-Consultation Panel - Clinical assessment and instant digital prescription issuance for home nursing patients.';
    } else if (currentPath === '/admin') {
      title = 'Admin Operations & Dispatch | Xpress Nurse';
      metaDesc = 'Xpress Nurse Dispatch & Operations Dashboard - Real-time booking triage, nurse routing, and fleet allocation across Hyderabad.';
    } else if (currentPath === '/empty') {
      title = 'Patient Appointment Records | Xpress Nurse';
      metaDesc = 'Review and manage your home nurse visits and clinical appointments with Xpress Nurse.';
    } else if (currentPath === '/login') {
      title = 'Staff & Patient Portal Login | Xpress Nurse';
      metaDesc = 'Secure portal login for patients, registered nurses, doctors, and operational staff of Xpress Nurse.';
    } else if (currentPath !== '/' && currentPath !== '') {
      title = '404 - Page Not Found | Xpress Nurse';
      metaDesc = 'The requested healthcare page could not be found on Xpress Nurse.';
    }

    document.title = title;

    let metaTag = document.querySelector('meta[name="description"]');
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.setAttribute('name', 'description');
      document.head.appendChild(metaTag);
    }
    metaTag.setAttribute('content', metaDesc);
  }, [currentPath]);

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Programmatic navigation updating URL bar
  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // =========================================================================
  // ALL DATA FETCHED FROM SUPABASE DATABASE — NO MOCK DATA
  // =========================================================================
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [nurses, setNurses] = useState<NurseProfile[]>([]);
  const [leads, setLeads] = useState<NurseLead[]>([]);
  const [consultations, setConsultations] = useState<DoctorConsultation[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>(DEFAULT_COUPONS);
  const [appUsers, setAppUsers] = useState<AppUser[]>(SEED_APP_USERS);
  const [dbLoading, setDbLoading] = useState(true);

  // Master Scroll-Driven Slide-Down & Reveal Animation Engine
  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.05,
      rootMargin: '0px 0px -40px 0px'
    });

    const attachTargets = () => {
      const selectors = [
        'section.section-spacing',
        '.reveal-on-scroll',
        '.section-header',
        '.service-card-editorial',
        '.why-card-editorial',
        '.step-card-editorial',
        '.testimonial-card-editorial',
        '.doctor-hero-box',
        '.about-narrative-card',
        '.about-standards-card',
        '.rx-strip-card',
        '.services-filter-container',
        '.footer-simple'
      ];
      
      const targets = document.querySelectorAll<HTMLElement>(selectors.join(', '));
      const windowHeight = window.innerHeight;

      targets.forEach((el, index) => {
        if (!el.classList.contains('reveal-on-scroll')) {
          el.classList.add('reveal-on-scroll');
          if (!el.className.includes('reveal-delay')) {
            el.classList.add(`reveal-delay-${(index % 6) + 1}`);
          }
        }

        // If already above the fold or in viewport on initial render, reveal immediately
        const rect = el.getBoundingClientRect();
        if (rect.top < windowHeight * 0.92 && rect.bottom > 0) {
          el.classList.add('is-visible');
        } else {
          observer.observe(el);
        }
      });
    };

    // Passive scroll check so slide-down animation is instant and buttery smooth
    const handleScroll = () => {
      const unrevealed = document.querySelectorAll<HTMLElement>('.reveal-on-scroll:not(.is-visible)');
      const triggerLine = window.innerHeight - 35;
      unrevealed.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top <= triggerLine && rect.bottom >= 0) {
          el.classList.add('is-visible');
        }
      });
    };

    // Attach after DOM paint
    const timer = setTimeout(attachTargets, 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      observer.disconnect();
    };
  }, [currentPath, services]);

  const [activeNurseId, setActiveNurseId] = useState<string>('nurse-101');
  const activeNurse = nurses.find((n) => n.id === activeNurseId) || nurses[0];

  // Modal States
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [preSelectedServiceId, setPreSelectedServiceId] = useState<ServiceId>('saline-infusion');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Authenticated user (set after successful 4-digit PIN login)
  const [authUser, setAuthUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('xn_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Login success handler — set active nurse based on logged-in user
  const handleLoginSuccess = (user: AppUser) => {
    setAuthUser(user);
    localStorage.setItem('xn_auth_user', JSON.stringify(user));
    // If nurse, switch active nurse to their profile
    if (user.role === 'nurse') {
      const matchedNurse = nurses.find(
        (n) => n.email === user.email || n.id === user.id
      );
      if (matchedNurse) setActiveNurseId(matchedNurse.id);
    }
  };

  // =========================================================================
  // FETCH ALL DATA FROM SUPABASE DB ON MOUNT
  // =========================================================================
  useEffect(() => {
    async function loadAllDataFromDb() {
      setDbLoading(true);
      try {
        const [
          remoteServices,
          remoteBookings,
          remoteNurses,
          remoteLeads,
          remoteConsults,
          remoteCoupons,
          remoteAppUsers
        ] = await Promise.all([
          dbFetchServices(),
          dbFetchBookings(),
          dbFetchNurses(),
          dbFetchLeads(),
          dbFetchConsultations(),
          dbFetchCoupons(),
          dbFetchAppUsers()
        ]);

        if (remoteServices && remoteServices.length > 0) setServices(remoteServices);
        if (remoteBookings && remoteBookings.length > 0) setBookings(remoteBookings);
        if (remoteNurses && remoteNurses.length > 0) setNurses(remoteNurses);
        if (remoteLeads && remoteLeads.length > 0) setLeads(remoteLeads);
        if (remoteConsults && remoteConsults.length > 0) setConsultations(remoteConsults);
        if (remoteCoupons && remoteCoupons.length > 0) setCoupons(remoteCoupons);
        if (remoteAppUsers && remoteAppUsers.length > 0) setAppUsers(remoteAppUsers);

        console.log('[DB] Loaded from Supabase:', {
          services: remoteServices?.length || 0,
          bookings: remoteBookings?.length || 0,
          nurses: remoteNurses?.length || 0,
          leads: remoteLeads?.length || 0,
          consultations: remoteConsults?.length || 0,
          coupons: remoteCoupons?.length || 0,
          appUsers: remoteAppUsers?.length || 0
        });
      } catch (err) {
        console.error('[DB] Error loading from Supabase:', err);
      }
      setDbLoading(false);
    }
    loadAllDataFromDb();
  }, []);

  // =========================================================================
  // SUPABASE REALTIME SUBSCRIPTION — LIVE DATABASE SYNC ACROSS ALL PAGES
  // =========================================================================
  useEffect(() => {
    const channel = supabase
      .channel('realtime-xpressnurse-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        async (payload) => {
          console.log('[Realtime DB] Live Booking update:', payload);
          const fresh = await dbFetchBookings();
          if (fresh) setBookings(fresh);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nurses' },
        async (payload) => {
          console.log('[Realtime DB] Live Nurse update:', payload);
          const fresh = await dbFetchNurses();
          if (fresh) setNurses(fresh);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        async (payload) => {
          console.log('[Realtime DB] Live Lead update:', payload);
          const fresh = await dbFetchLeads();
          if (fresh) setLeads(fresh);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'consultations' },
        async (payload) => {
          console.log('[Realtime DB] Live Consultation update:', payload);
          const fresh = await dbFetchConsultations();
          if (fresh) setConsultations(fresh);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        async (payload) => {
          console.log('[Realtime DB] Live Services update:', payload);
          const fresh = await dbFetchServices();
          if (fresh) setServices(fresh);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coupons' },
        async (payload) => {
          console.log('[Realtime DB] Live Coupons update:', payload);
          const fresh = await dbFetchCoupons();
          if (fresh) setCoupons(fresh);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handler: When user books a service from public site
  const handleBookingCreated = (newBooking: Booking) => {
    // If booked via direct nurse referral link, auto-lock to referring nurse (Rule 1)
    // Otherwise, mark as Pending so Admin can review and dispatch to nurse
    const isDirectNurseReferral = !!newBooking.referringNurseId;
    let assignedNurseId: string | undefined = undefined;
    let assignedNurseName: string | undefined = undefined;

    if (isDirectNurseReferral) {
      const referringNurse = nurses.find((n) => n.id === newBooking.referringNurseId);
      if (referringNurse) {
        assignedNurseId = referringNurse.id;
        assignedNurseName = `${referringNurse.name} (Direct Referral - Rule 1)`;
      }
    }

    const finalizedBooking: Booking = {
      ...newBooking,
      status: isDirectNurseReferral ? 'Assigned' : 'Pending',
      assignedNurseId,
      assignedNurseName
    };

    setBookings((prev) => [finalizedBooking, ...prev]);
    dbSaveBooking(finalizedBooking);
  };

  // Handler: Nurse submits a lead (Cross-Area Dispatch: e.g. Gachibowli nurse refers LB Nagar patient)
  const handleAddNewLead = (newLead: NurseLead) => {
    // Lead enters "Pending Approval" state; Points and Commission will be decided by Admin
    const pendingLead: NurseLead = {
      ...newLead,
      status: 'Pending Approval',
      pointsAwarded: 0,
      referralCommissionRupees: 0
    };

    setLeads((prev) => [pendingLead, ...prev]);
    dbSaveLead(pendingLead);

    const currentService = services.find((s) => s.id === newLead.serviceId) || services[0];
    const referringNurse = nurses.find((n) => n.id === newLead.nurseId);
    const targetArea = newLead.area;

    // Intelligent Cross-Area Dispatch:
    // If patient is in LB Nagar and Nurse Priya (Gachibowli) refers,
    // find nurse stationed in LB Nagar (Nurse Rajesh Kumar)!
    const areaStationedNurse = nurses.find((n) => n.serviceArea === targetArea) || referringNurse || nurses[0];
    const isCrossArea = referringNurse ? referringNurse.serviceArea !== targetArea : false;
    const fee = currentService.priceNumber || 800;

    const autoAssignedBooking: Booking = {
      id: 'BK-' + Math.floor(1000 + Math.random() * 9000),
      createdAt: 'Just now',
      patientName: newLead.patientName,
      patientPhone: newLead.patientPhone,
      serviceId: newLead.serviceId,
      serviceTitle: currentService.title,
      area: targetArea,
      fullAddress: `${targetArea}, Hyderabad`,
      preferredDate: 'Today (Immediate)',
      preferredTime: 'Coordinated with nurse',
      hasPrescription: true,
      status: 'Assigned',
      referringNurseId: referringNurse?.id,
      referringNurseName: referringNurse ? `${referringNurse.name} (${referringNurse.serviceArea})` : undefined,
      assignedNurseId: areaStationedNurse.id,
      assignedNurseName: isCrossArea
        ? `${areaStationedNurse.name} (${targetArea} Station Match)`
        : `${referringNurse?.name} (Personal Referral)`,
      estimatedFee: fee,
      referralBonusRupees: 0, // Pending Admin Approval
      notes: isCrossArea
        ? `Cross-Area Referral: Referred by ${referringNurse?.name} (${referringNurse?.serviceArea}). Patient located in ${targetArea}. Order dispatched to ${areaStationedNurse.name}. Referral bonus awaiting Admin approval.`
        : `Personal Referral by ${referringNurse?.name}. Reward points & referral commission awaiting Admin approval.`
    };

    setBookings((prev) => [autoAssignedBooking, ...prev]);
    dbSaveBooking(autoAssignedBooking);

    // Increment nurse's total submitted leads counter (points & earnings await Admin approval)
    if (referringNurse) {
      const updatedReferringNurse: NurseProfile = {
        ...referringNurse,
        totalLeads: referringNurse.totalLeads + 1
      };
      setNurses((prev) => prev.map((n) => (n.id === updatedReferringNurse.id ? updatedReferringNurse : n)));
      dbUpdateNurse(updatedReferringNurse);
    }
  };

  // Handler: Admin Approves Lead & decides Points and Referral Earnings
  const handleAdminApproveLead = async (
    leadId: string,
    pointsAwarded: number,
    referralRupees: number,
    adminNotes?: string
  ) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const approvedLead: NurseLead = {
      ...lead,
      status: 'Approved',
      pointsAwarded,
      referralCommissionRupees: referralRupees,
      approvedAt: new Date().toISOString(),
      approvedBy: 'Admin',
      adminNotes
    };

    setLeads((prev) => prev.map((l) => (l.id === leadId ? approvedLead : l)));
    await dbUpdateLeadById(leadId, approvedLead);

    // Credit Referring Nurse with Admin-decided points & referral earnings
    const referringNurse = nurses.find((n) => n.id === lead.nurseId);
    if (referringNurse) {
      const updatedNurse: NurseProfile = {
        ...referringNurse,
        pointsEarned: (referringNurse.pointsEarned || 0) + pointsAwarded,
        referralEarningsRupees: (referringNurse.referralEarningsRupees || 0) + referralRupees,
        convertedLeads: (referringNurse.convertedLeads || 0) + 1,
        totalReferrals: (referringNurse.totalReferrals || 0) + 1
      };
      setNurses((prev) => prev.map((n) => (n.id === updatedNurse.id ? updatedNurse : n)));
      await dbUpdateNurse(updatedNurse);
    }

    // Update matching booking's referral bonus record
    setBookings((prev) =>
      prev.map((b) => {
        if (b.patientPhone === lead.patientPhone || (b.referringNurseId === lead.nurseId && b.patientName === lead.patientName)) {
          return {
            ...b,
            referralBonusRupees: referralRupees,
            notes: `${b.notes || ''} [Admin Approved: +${pointsAwarded} pts, ₹${referralRupees} referral earning credited]`.trim()
          };
        }
        return b;
      })
    );
  };

  // Handler: Admin Rejects Lead
  const handleAdminRejectLead = async (leadId: string, adminNotes?: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const rejectedLead: NurseLead = {
      ...lead,
      status: 'Rejected',
      pointsAwarded: 0,
      referralCommissionRupees: 0,
      approvedAt: new Date().toISOString(),
      approvedBy: 'Admin',
      adminNotes: adminNotes || 'Rejected by Admin'
    };

    setLeads((prev) => prev.map((l) => (l.id === leadId ? rejectedLead : l)));
    await dbUpdateLeadById(leadId, rejectedLead);
  };

  // Handler: Reassign / Transfer Booking between Nurses
  const handleReassignBooking = (bookingId: string, targetNurseId: string) => {
    const targetNurse = nurses.find((n) => n.id === targetNurseId);
    if (!targetNurse) return;

    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          const updated: Booking = {
            ...b,
            assignedNurseId: targetNurse.id,
            assignedNurseName: `${targetNurse.name} (${targetNurse.serviceArea})`,
            notes: (b.notes ? b.notes + ' • ' : '') + `Transferred to ${targetNurse.name} (${targetNurse.serviceArea})`
          };
          dbSaveBooking(updated);
          return updated;
        }
        return b;
      })
    );
  };

  // Handler: Update Nurse Profile
  const handleUpdateNurse = (updated: NurseProfile) => {
    setNurses((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    dbUpdateNurse(updated);
  };

  // Handler: Admin assigns order
  const handleAdminAssignOrder = (bookingId: string, nurseId: string, ruleExplanation: string) => {
    const nurseObj = nurses.find((n) => n.id === nurseId);
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          const updated: Booking = {
            ...b,
            status: 'Assigned',
            assignedNurseId: nurseId,
            assignedNurseName: `${nurseObj?.name} (${ruleExplanation})`
          };
          dbSaveBooking(updated);
          return updated;
        }
        return b;
      })
    );
  };

  // Handler: Admin Auto-Routes all pending via Rule 2
  const handleAutoRouteAll = () => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.status === 'Pending') {
          const areaNurse = nurses.find((n) => n.serviceArea === b.area) || nurses[0];
          const updated: Booking = {
            ...b,
            status: 'Assigned',
            assignedNurseId: areaNurse.id,
            assignedNurseName: `${areaNurse.name} (Auto Area Match - Rule 2)`
          };
          dbSaveBooking(updated);
          return updated;
        }
        return b;
      })
    );
  };

  // Handler: Doctor issues prescription — persist to Supabase & Cloudflare R2
  const handleDoctorIssueRx = async (consultId: string, rxText: string, recommendedService: ServiceId) => {
    // 1. Update React state
    setConsultations((prev) =>
      prev.map((c) => {
        if (c.id === consultId) {
          return {
            ...c,
            status: 'Prescription Issued',
            prescriptionIssued: true,
            prescriptionText: rxText,
            recommendedService
          };
        }
        return c;
      })
    );

    // 2. Persist to Supabase DB consultations table
    try {
      await dbUpdateConsultationById(consultId, {
        status: 'Prescription Issued',
        prescriptionIssued: true,
        prescriptionText: rxText,
        recommendedService
      });
      console.log(`[Supabase] Consultation ${consultId} prescription saved.`);
    } catch (err) {
      console.error('[Supabase] Failed to update consult prescription:', err);
    }

    // 3. Register prescription in Cloudflare R2 storage under teleconsult-rx category
    try {
      const targetConsult = consultations.find((c) => c.id === consultId);
      const patName = targetConsult?.patientName || 'Patient';
      await uploadToCloudflareStorage({
        fileName: `TeleRx_${consultId}_${patName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        category: 'teleconsult-rx',
        contentType: 'application/pdf',
        sizeBytes: 128400,
        metadata: {
          consultationId: consultId,
          patientName: patName,
          patientPhone: targetConsult?.patientPhone,
          recommendedService,
          prescriptionText: rxText,
          doctorName: 'Dr. Vikramaditya, MD (Internal Medicine)',
          issuedAt: new Date().toISOString()
        }
      });
      console.log(`[Cloudflare R2] Prescription record created for ${patName}.`);
    } catch (err) {
      console.warn('[Cloudflare R2] Rx record error:', err);
    }
  };

  // Coupon CRUD Handlers for Admin Operations
  const handleCreateCoupon = async (newCouponData: Omit<Coupon, 'id' | 'createdAt' | 'timesUsed'>) => {
    const created = await dbInsertCoupon(newCouponData);
    if (created) {
      setCoupons((prev) => [created, ...prev.filter((c) => c.code !== created.code)]);
    }
  };

  const handleUpdateCoupon = async (id: string, updates: Partial<Coupon>) => {
    setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    await dbUpdateCoupon(id, updates);
  };

  const handleDeleteCoupon = async (id: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    await dbDeleteCoupon(id);
  };

  // 1. Bookings CRUD Handlers
  const handleCreateBooking = async (b: Booking) => {
    setBookings((prev) => [b, ...prev]);
    await dbInsertBooking(b);
  };
  const handleUpdateBooking = async (id: string, updates: Partial<Booking>) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    await dbUpdateBooking(id, updates);
  };
  const handleDeleteBooking = async (id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
    await dbDeleteBooking(id);
  };

  // 2. Nurses CRUD Handlers
  const handleCreateNurse = async (n: NurseProfile) => {
    setNurses((prev) => [...prev, n]);
    await dbInsertNurse(n);
  };
  const handleUpdateNurseRecord = async (id: string, updates: Partial<NurseProfile>) => {
    setNurses((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
    await dbUpdateNurseById(id, updates);
  };
  const handleDeleteNurse = async (id: string) => {
    setNurses((prev) => prev.filter((n) => n.id !== id));
    await dbDeleteNurse(id);
  };

  // 3. Leads CRUD Handlers
  const handleCreateLead = async (l: NurseLead) => {
    setLeads((prev) => [l, ...prev]);
    await dbInsertLead(l);
  };
  const handleUpdateLead = async (id: string, updates: Partial<NurseLead>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    await dbUpdateLeadById(id, updates);
  };
  const handleDeleteLead = async (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    await dbDeleteLead(id);
  };

  // 4. Services CRUD Handlers
  const handleCreateService = async (s: ServiceItem) => {
    setServices((prev) => [...prev, s]);
    await dbInsertService(s);
  };
  const handleUpdateService = async (id: string, updates: Partial<ServiceItem>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    await dbUpdateServiceById(id, updates);
  };
  const handleDeleteService = async (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    await dbDeleteService(id);
  };

  // 5. Consultations CRUD Handlers
  const handleCreateConsultation = async (c: DoctorConsultation) => {
    setConsultations((prev) => [c, ...prev]);
    await dbInsertConsultation(c);
  };
  const handleUpdateConsultation = async (id: string, updates: Partial<DoctorConsultation>) => {
    setConsultations((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    await dbUpdateConsultationById(id, updates);
  };
  const handleDeleteConsultation = async (id: string) => {
    setConsultations((prev) => prev.filter((c) => c.id !== id));
    await dbDeleteConsultation(id);
  };

  // 6. App Users CRUD Handlers
  const handleCreateAppUser = async (u: AppUser) => {
    setAppUsers((prev) => [...prev, u]);
    await dbInsertAppUser(u);
  };
  const handleUpdateAppUser = async (id: string, updates: Partial<AppUser>) => {
    setAppUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    await dbUpdateAppUserById(id, updates);
  };
  const handleDeleteAppUser = async (id: string) => {
    setAppUsers((prev) => prev.filter((u) => u.id !== id));
    await dbDeleteAppUser(id);
  };

  const handleOpenBookingForService = (sId: ServiceId) => {
    setPreSelectedServiceId(sId);
    setIsBookingOpen(true);
  };

  const isKnownRoute = 
    currentPath === '/' || 
    currentPath === '' || 
    currentPath === '/nurse' || 
    currentPath === '/admin' || 
    currentPath === '/doctor' || 
    currentPath === '/empty' ||
    currentPath === '/login';

  return (
    <div className="app-root">
      {/* Header with Navigation and Mobile Drawer */}
      <Header
        currentPath={currentPath}
        onNavigate={navigate}
        onOpenBooking={() => setIsBookingOpen(true)}
      />

      {/* Main Routed Views */}
      <main>
        {/* Route: / -> Public Marketing Website */}
        {(currentPath === '/' || currentPath === '') && (
          <>
            <Hero
              onOpenBooking={() => setIsBookingOpen(true)}
              onOpenQrModal={() => setIsQrModalOpen(true)}
            />
            <PrescriptionBanner
              onDoctorConsultClick={() => {
                setPreSelectedServiceId('doctor-consult');
                setIsBookingOpen(true);
              }}
            />
            <ServicesSection services={services} onSelectServiceToBook={handleOpenBookingForService} />
            <WhyChooseUs />
            <HowItWorks />
            <DoctorConsultSection
              onOpenBookingDoctor={() => {
                setPreSelectedServiceId('doctor-consult');
                setIsBookingOpen(true);
              }}
            />
            <Testimonials />
            <AboutSection onOpenBooking={() => setIsBookingOpen(true)} />
          </>
        )}

        {/* Route: /nurse -> Nurse Portal & Multi-Nurse Fleet */}
        {currentPath === '/nurse' && (
          <NurseDashboard
            currentNurse={activeNurse}
            allNurses={nurses}
            onSelectNurse={(n) => setActiveNurseId(n.id)}
            bookings={bookings}
            leads={leads}
            services={services}
            onAddNewLead={handleAddNewLead}
            onUpdateNurse={handleUpdateNurse}
            onReassignBooking={handleReassignBooking}
          />
        )}

        {/* Route: /admin -> Admin Operations & Dispatch */}
        {currentPath === '/admin' && (
          <AdminDashboard
            bookings={bookings}
            nurses={nurses}
            leads={leads}
            services={services}
            consultations={consultations}
            coupons={coupons}
            appUsers={appUsers}
            onAssignOrder={handleAdminAssignOrder}
            onAutoRouteAll={handleAutoRouteAll}
            onCreateCoupon={handleCreateCoupon}
            onUpdateCoupon={handleUpdateCoupon}
            onDeleteCoupon={handleDeleteCoupon}
            onCreateBooking={handleCreateBooking}
            onUpdateBooking={handleUpdateBooking}
            onDeleteBooking={handleDeleteBooking}
            onCreateNurse={handleCreateNurse}
            onUpdateNurseRecord={handleUpdateNurseRecord}
            onDeleteNurse={handleDeleteNurse}
            onCreateLead={handleCreateLead}
            onUpdateLead={handleUpdateLead}
            onDeleteLead={handleDeleteLead}
            onApproveLead={handleAdminApproveLead}
            onRejectLead={handleAdminRejectLead}
            onCreateService={handleCreateService}
            onUpdateService={handleUpdateService}
            onDeleteService={handleDeleteService}
            onCreateConsultation={handleCreateConsultation}
            onUpdateConsultation={handleUpdateConsultation}
            onDeleteConsultation={handleDeleteConsultation}
            onCreateAppUser={handleCreateAppUser}
            onUpdateAppUser={handleUpdateAppUser}
            onDeleteAppUser={handleDeleteAppUser}
          />
        )}

        {/* Route: /doctor -> Doctor Consultation Panel */}
        {currentPath === '/doctor' && (
          <DoctorDashboard
            consultations={consultations}
            services={services}
            onIssuePrescription={handleDoctorIssueRx}
            onAddNewConsultation={(newC) => setConsultations((prev) => [newC, ...prev])}
          />
        )}

        {/* Route: /empty -> Dedicated Empty State Page */}
        {currentPath === '/empty' && (
          <EmptyStatePage
            onNavigate={navigate}
            onOpenBooking={() => setIsBookingOpen(true)}
          />
        )}

        {/* Route: /login -> Staff & Patient Portal Login */}
        {currentPath === '/login' && (
          <LoginPage
            onNavigate={navigate}
          />
        )}

        {/* Unmatched / 404 Route */}
        {!isKnownRoute && (
          <NotFoundPage
            onNavigate={navigate}
            onOpenBooking={() => setIsBookingOpen(true)}
          />
        )}
      </main>

      {/* Interactive Booking Modal */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        preSelectedServiceId={preSelectedServiceId}
        services={services}
        coupons={coupons}
        onBookingCreated={handleBookingCreated}
        onNeedDoctorConsult={() => {
          setPreSelectedServiceId('doctor-consult');
          setIsBookingOpen(true);
        }}
      />

      {/* WhatsApp QR Code Modal */}
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />

      {/* Legal / Clinical Policy Modal (Privacy, Terms, Refund) */}
      <PolicyModal
        policy={activePolicy}
        onClose={() => setActivePolicy(null)}
      />

      {/* Floating 24/7 AI Clinical Assistant */}
      <AiAssistant
        onOpenBooking={() => setIsBookingOpen(true)}
        onOpenDoctorConsult={() => {
          setPreSelectedServiceId('doctor-consult');
          setIsBookingOpen(true);
        }}
      />

      {/* Corporate Footer with Working Modals & Routes */}
      <Footer
        onOpenBooking={() => setIsBookingOpen(true)}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        onNavigate={navigate}
        onOpenPolicy={setActivePolicy}
      />

      {/* Mobile Sticky Booking Bar */}
      <MobileBottomBar
        onOpenBooking={() => setIsBookingOpen(true)}
      />
    </div>
  );
};
export default App;
