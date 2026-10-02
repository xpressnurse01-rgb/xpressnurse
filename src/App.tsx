import React, { useState, useEffect, useRef } from 'react';
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
import { AuthGuard } from './components/AuthGuard';
import { PullToRefresh } from './components/PullToRefresh';
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
  dbDeleteMultipleCoupons,
  dbFetchAppUsers,
  dbInsertBooking,
  dbUpdateBooking,
  dbDeleteBooking,
  dbDeleteMultipleBookings,
  dbInsertNurse,
  dbUpdateNurseById,
  dbDeleteNurse,
  dbDeleteMultipleNurses,
  dbInsertLead,
  dbUpdateLeadById,
  dbDeleteLead,
  dbDeleteMultipleLeads,
  dbInsertService,
  dbUpdateServiceById,
  dbDeleteService,
  dbDeleteMultipleServices,
  dbInsertConsultation,
  dbUpdateConsultationById,
  dbDeleteConsultation,
  dbDeleteMultipleConsultations,
  dbInsertAppUser,
  dbUpdateAppUserById,
  dbDeleteAppUser,
  dbDeleteMultipleAppUsers
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
import {
  deduplicateBookings,
  deduplicateLeads,
  normalizePhone10,
  areBookingsDuplicate
} from './lib/nurseCalculations';

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
    setCurrentPath(path.split('?')[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Automatically direct users with referral links (?ref= or ?referral=) to the registration portal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref') || params.get('referral');
    if (refCode && currentPath !== '/login') {
      navigate('/login' + window.location.search);
    }
  }, [currentPath]);

  // =========================================================================
  // ALL DATA FETCHED FROM SUPABASE DATABASE WITH LOCALSTORAGE PERSISTENCE
  // =========================================================================
  const [services, setServices] = useState<ServiceItem[]>(() => {
    try {
      const cached = localStorage.getItem('xn_cached_services');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { }
    return [];
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const cached = localStorage.getItem('xn_cached_bookings');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return deduplicateBookings(parsed.filter(b => b.id !== 'BK-8901' && b.id !== 'BK-8902' && b.id !== 'BK-8903'));
        }
      }
    } catch { }
    return [];
  });

  const [nurses, setNurses] = useState<NurseProfile[]>(() => {
    try {
      const cached = localStorage.getItem('xn_cached_nurses');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(n => n.id !== 'nurse-101' && n.id !== 'nurse-102' && n.id !== 'nurse-103' && n.id !== 'nurse-104')
            .map(n => {
              if (Number(n.convertedLeads || 0) === 0 && Number(n.referralEarningsRupees || 0) > 0) {
                return { ...n, referralEarningsRupees: 0 };
              }
              return n;
            });
        }
      }
    } catch { }
    return [];
  });

  const [leads, setLeads] = useState<NurseLead[]>(() => {
    try {
      const cached = localStorage.getItem('xn_cached_leads');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return deduplicateLeads(parsed.filter(l => l.id !== 'LD-4001' && l.id !== 'LD-4002'));
        }
      }
    } catch { }
    return [];
  });

  const [consultations, setConsultations] = useState<DoctorConsultation[]>(() => {
    try {
      const cached = localStorage.getItem('xn_cached_consultations');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { }
    return [];
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const cached = localStorage.getItem('xn_cached_coupons');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter(c => c.id !== 'coup-1' && c.id !== 'coup-2' && c.id !== 'coup-3');
        }
      }
    } catch { }
    return [];
  });

  const [appUsers, setAppUsers] = useState<AppUser[]>(() => {
    try {
      const cached = localStorage.getItem('xn_cached_app_users');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.filter(u => u.id !== 'user-nurse-101' && u.id !== 'user-nurse-102' && u.id !== 'user-nurse-103' && u.id !== 'user-nurse-104');
        }
      }
    } catch { }
    return [];
  });

  const [dbLoading, setDbLoading] = useState(false);

  // Synchronize collections to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem('xn_cached_services', JSON.stringify(services)); } catch { }
  }, [services]);

  useEffect(() => {
    try { localStorage.setItem('xn_cached_bookings', JSON.stringify(deduplicateBookings(bookings))); } catch { }
  }, [bookings]);

  useEffect(() => {
    try { localStorage.setItem('xn_cached_nurses', JSON.stringify(nurses)); } catch { }
  }, [nurses]);

  useEffect(() => {
    try { localStorage.setItem('xn_cached_leads', JSON.stringify(deduplicateLeads(leads))); } catch { }
  }, [leads]);

  useEffect(() => {
    try { localStorage.setItem('xn_cached_consultations', JSON.stringify(consultations)); } catch { }
  }, [consultations]);

  useEffect(() => {
    try { localStorage.setItem('xn_cached_coupons', JSON.stringify(coupons)); } catch { }
  }, [coupons]);

  useEffect(() => {
    try { localStorage.setItem('xn_cached_app_users', JSON.stringify(appUsers)); } catch { }
  }, [appUsers]);

  // Treat approved referred patients as bookings: ensure ONLY APPROVED patient leads appear in bookings or assign nurse
  useEffect(() => {
    let hasChanges = false;
    let syncedBookings = deduplicateBookings([...bookings]);

    // Only patient leads that have been Approved or Converted by Admin are allowed in bookings
    const approvedPatientLeads = leads.filter(
      (l) => (l.status === 'Approved' || l.status === 'Converted') &&
             l.referralType !== 'nurse' &&
             !l.referredNursePhone &&
             Boolean(l.patientName)
    );

    // Identify leads that are still not approved (Pending Approval, Rejected, etc.)
    const unapprovedLeadPhones = new Set(
      leads.filter((l) => l.status !== 'Approved' && l.status !== 'Converted')
           .map((l) => normalizePhone10(l.patientPhone))
           .filter(Boolean)
    );
    const unapprovedLeadCleanIds = new Set(
      leads.filter((l) => l.status !== 'Approved' && l.status !== 'Converted')
           .map((l) => (l.id.replace(/\D/g, '') || l.id).slice(-6))
    );

    // Filter out any bookings created for unapproved leads (must NOT show in bookings or assign nurse)
    const validBookings = syncedBookings.filter((b) => {
      const bPhone10 = normalizePhone10(b.patientPhone);
      const bCleanId = b.id.replace(/\D/g, '').slice(-6);
      if (b.notes?.includes('Patient Referral') && b.status === 'Pending') {
        if (unapprovedLeadPhones.has(bPhone10) || unapprovedLeadCleanIds.has(bCleanId)) {
          const hasApprovedMatch = approvedPatientLeads.some((al) =>
            normalizePhone10(al.patientPhone) === bPhone10 ||
            (al.id.replace(/\D/g, '') || al.id).slice(-6) === bCleanId
          );
          if (!hasApprovedMatch) {
            hasChanges = true;
            return false;
          }
        }
      }
      return true;
    });

    approvedPatientLeads.forEach((l) => {
      const lPhone10 = normalizePhone10(l.patientPhone);
      const lName = (l.patientName || '').toLowerCase().trim();
      const leadCleanDigits = l.id.replace(/\D/g, '') || l.id.slice(-6);
      const deterministicId = `BK-${leadCleanDigits.slice(-6)}`;

      const exists = validBookings.some((b) =>
        b.id === deterministicId ||
        b.id === `BK-${leadCleanDigits.slice(-4)}` ||
        (lPhone10 && normalizePhone10(b.patientPhone) === lPhone10) ||
        (b.referringNurseId === l.nurseId && b.patientName && b.patientName.toLowerCase().trim() === lName)
      );

      if (!exists) {
        hasChanges = true;
        const refNurse = nurses.find((n) => n.id === l.nurseId);
        const procedure = services.find((s) => s.id === l.serviceId);
        const fee = Number(l.leadValueRupees) || (procedure?.priceNumber || 800);
        const comm = Number(l.referralCommissionRupees) || Math.round(fee * 0.10);
        const assignedNurse = l.assignedNurseId ? nurses.find((n) => n.id === l.assignedNurseId) : null;
        const bStatus = l.status === 'Converted' ? 'Completed' : (l.assignedNurseId ? 'Assigned' : 'Pending');

        const synthBooking: Booking = {
          id: deterministicId,
          patientName: l.patientName!,
          patientPhone: l.patientPhone || '',
          area: l.area || 'Hyderabad Central',
          fullAddress: l.fullAddress || '',
          serviceId: l.serviceId || 'saline-infusion',
          serviceTitle: procedure?.title || l.serviceId || 'Clinical Service',
          estimatedFee: fee,
          status: bStatus,
          assignedNurseId: l.assignedNurseId || undefined,
          assignedNurseName: assignedNurse ? `${assignedNurse.name} (${assignedNurse.serviceArea})` : undefined,
          nurseAcceptanceStatus: l.assignedNurseId ? 'Accepted' : undefined,
          createdAt: l.submittedAt || new Date().toISOString(),
          hasPrescription: false,
          referringNurseId: l.nurseId,
          referringNurseName: refNurse?.name || 'Referred Nurse',
          referralBonusRupees: comm,
          notes: `${l.notes ? 'Description: ' + l.notes + ' | ' : ''}Patient Referral by ${refNurse?.name || 'Nurse'}. [50 points + ₹${comm} (10%) credited upon visit completion]`
        };

        validBookings.unshift(synthBooking);
        dbSaveBooking(synthBooking);
      }
    });

    const finalDeduplicated = deduplicateBookings(validBookings);
    if (hasChanges || finalDeduplicated.length !== bookings.length) {
      setBookings(finalDeduplicated);
      try { localStorage.setItem('xn_cached_bookings', JSON.stringify(finalDeduplicated)); } catch { }
    }
  }, [leads, services, nurses]);

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

  const [authUser, setAuthUser] = useState<AppUser | null>(() => {
    const saved = localStorage.getItem('xn_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeNurseId, setActiveNurseId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('xn_auth_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'nurse' && u.id) return u.id;
      }
      const savedNurseId = localStorage.getItem('xn_active_nurse_id');
      if (savedNurseId) return savedNurseId;
    } catch { }
    return 'nurse-101';
  });

  const fallbackNurse: NurseProfile = {
    id: 'nurse-101',
    name: 'Nurse Priya Sharma',
    phone: '9849012345',
    email: 'priya.nursing@xpressnurse.in',
    experienceYears: 5,
    qualification: 'B.Sc Nursing (Registered RN)',
    serviceArea: 'Hyderabad Central',
    status: 'Active',
    totalLeads: 8,
    convertedLeads: 6,
    totalReferrals: 12,
    pointsEarned: 1200,
    referralEarningsRupees: 0,
    rating: 4.9,
    avatarUrl: '/images/nurse_priya.jpg',
    certificateVerified: true
  };

  // Strictly resolve logged-in nurse first to prevent role/account hijacking
  const activeNurse = (authUser?.role === 'nurse'
    ? nurses.find((n) =>
      n.id === authUser.id ||
      (n.phone && authUser.phone && n.phone.replace(/\D/g, '') === authUser.phone.replace(/\D/g, '')) ||
      (n.email && (authUser.email || authUser.identifier) && n.email.toLowerCase() === (authUser.email || authUser.identifier).toLowerCase())
    )
    : null) ||
    nurses.find((n) => n.id === activeNurseId) ||
    (authUser?.role === 'nurse' ? {
      id: authUser.id,
      name: authUser.name,
      phone: authUser.phone || '',
      email: authUser.email || authUser.identifier,
      experienceYears: 5,
      qualification: authUser.designation || 'Registered Nurse',
      serviceArea: authUser.serviceArea || 'Hyderabad Central',
      status: 'Pending Verification' as const,
      totalLeads: 0,
      convertedLeads: 0,
      totalReferrals: 0,
      pointsEarned: 0,
      referralEarningsRupees: 0,
      rating: 4.9,
      certificateVerified: false
    } : (nurses[0] || fallbackNurse));

  // Modal States
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [preSelectedServiceId, setPreSelectedServiceId] = useState<ServiceId>('saline-infusion');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Login success handler — set active nurse based on logged-in user
  const handleLoginSuccess = (user: AppUser) => {
    setAuthUser(user);
    localStorage.setItem('xn_auth_user', JSON.stringify(user));
    // If nurse, switch active nurse directly to their own account
    if (user.role === 'nurse') {
      setActiveNurseId(user.id);
      localStorage.setItem('xn_active_nurse_id', user.id);
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

        if (remoteServices !== null) {
          setServices(remoteServices);
        }
        if (remoteBookings !== null) {
          setBookings(remoteBookings);
        }
        if (remoteNurses !== null) {
          setNurses(remoteNurses);
          // If authUser is logged in as a nurse, verify they are active in the live database
          const savedAuth = localStorage.getItem('xn_auth_user');
          if (savedAuth) {
            try {
              const u = JSON.parse(savedAuth);
              if (u.role === 'nurse') {
                const found = remoteNurses.find(
                  (n) => n.id === u.id || (n.email && n.email.toLowerCase() === (u.email || u.identifier || '').toLowerCase()) || (n.phone && n.phone.replace(/\D/g, '') === (u.phone || '').replace(/\D/g, ''))
                );
                if (found && found.status === 'Active') {
                  setActiveNurseId(found.id);
                  localStorage.setItem('xn_active_nurse_id', found.id);
                } else {
                  // Nurse was deleted, removed, or is not active — strictly evict session!
                  setAuthUser(null);
                  localStorage.removeItem('xn_auth_user');
                  localStorage.removeItem('xn_active_nurse_id');
                  if (window.location.pathname === '/nurse') {
                    navigate('/login?portal=nurse');
                  }
                }
              }
            } catch { }
          }
        }
        if (remoteLeads !== null) {
          setLeads(remoteLeads);
        }
        if (remoteConsults !== null) {
          setConsultations(remoteConsults);
        }
        if (remoteCoupons !== null) {
          setCoupons(remoteCoupons);
        }
        if (remoteAppUsers !== null) {
          setAppUsers(remoteAppUsers);
        }

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
  // =========================================================================
  // HELPER: Broadcast realtime updates across browser tabs & windows instantly
  // Uses dual mechanism: BroadcastChannel (0ms in modern browsers) + localStorage storage event fallback
  // =========================================================================
  const broadcastRealtimeUpdate = (type: string, data: any) => {
    const payload = { type, data, timestamp: Date.now() };
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('xn_live_sync_bus');
        bc.postMessage(payload);
        bc.close();
      }
    } catch { }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('xn_realtime_sync_event', JSON.stringify(payload));
      }
    } catch { }
  };

  const lastRefreshTimestampRef = useRef<number>(0);

  // Safe background data refresh with 60s throttle and equality checking to prevent high egress and disk IO exhaustion
  const refreshAllDataFromDb = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastRefreshTimestampRef.current < 60000) {
      return; // Throttled to prevent disk IO burn
    }
    lastRefreshTimestampRef.current = now;

    try {
      const [remoteBookings, remoteNurses, remoteLeads, remoteConsults] = await Promise.all([
        dbFetchBookings(),
        dbFetchNurses(),
        dbFetchLeads(),
        dbFetchConsultations()
      ]);

      if (remoteBookings !== null) {
        const effectiveLeads = deduplicateLeads(remoteLeads !== null ? remoteLeads : leads);
        const effectiveNurses = remoteNurses !== null ? remoteNurses : nurses;

        // Only patient referrals approved or converted by Admin are allowed in bookings
        const approvedPatientLeads = effectiveLeads.filter(
          (l) => (l.status === 'Approved' || l.status === 'Converted') &&
                 l.referralType !== 'nurse' &&
                 !l.referredNursePhone &&
                 Boolean(l.patientName)
        );

        const unapprovedLeadPhones = new Set(
          effectiveLeads.filter((l) => l.status !== 'Approved' && l.status !== 'Converted')
                        .map((l) => normalizePhone10(l.patientPhone))
                        .filter(Boolean)
        );
        const unapprovedLeadCleanIds = new Set(
          effectiveLeads.filter((l) => l.status !== 'Approved' && l.status !== 'Converted')
                        .map((l) => (l.id.replace(/\D/g, '') || l.id).slice(-6))
        );

        // Filter out any bookings created for unapproved leads
        const cleanMergedBookings = remoteBookings.filter((b) => {
          const bPhone10 = normalizePhone10(b.patientPhone);
          const bCleanId = b.id.replace(/\D/g, '').slice(-6);
          if (b.notes?.includes('Patient Referral') && b.status === 'Pending') {
            if (unapprovedLeadPhones.has(bPhone10) || unapprovedLeadCleanIds.has(bCleanId)) {
              const hasApprovedMatch = approvedPatientLeads.some((al) =>
                normalizePhone10(al.patientPhone) === bPhone10 ||
                (al.id.replace(/\D/g, '') || al.id).slice(-6) === bCleanId
              );
              if (!hasApprovedMatch) return false;
            }
          }
          return true;
        });

        approvedPatientLeads.forEach((l) => {
          const lPhone10 = normalizePhone10(l.patientPhone);
          const lName = (l.patientName || '').toLowerCase().trim();
          const leadCleanDigits = l.id.replace(/\D/g, '') || l.id.slice(-6);
          const deterministicId = `BK-${leadCleanDigits.slice(-6)}`;

          const exists = cleanMergedBookings.some((b) =>
            b.id === deterministicId ||
            b.id === `BK-${leadCleanDigits.slice(-4)}` ||
            (lPhone10 && normalizePhone10(b.patientPhone) === lPhone10) ||
            (b.referringNurseId === l.nurseId && b.patientName && b.patientName.toLowerCase().trim() === lName)
          );

          if (!exists) {
            const refNurse = effectiveNurses.find((n) => n.id === l.nurseId);
            const procedure = services.find((s) => s.id === l.serviceId);
            const fee = Number(l.leadValueRupees) || (procedure?.priceNumber || 800);
            const comm = Number(l.referralCommissionRupees) || Math.round(fee * 0.10);
            const assignedNurse = l.assignedNurseId ? effectiveNurses.find((n) => n.id === l.assignedNurseId) : null;
            const bStatus = l.status === 'Converted' ? 'Completed' : (l.assignedNurseId ? 'Assigned' : 'Pending');

            const synthBooking: Booking = {
              id: deterministicId,
              patientName: l.patientName!,
              patientPhone: l.patientPhone || '',
              area: l.area || 'Hyderabad Central',
              fullAddress: l.fullAddress || '',
              serviceId: l.serviceId || 'saline-infusion',
              serviceTitle: procedure?.title || l.serviceId || 'Clinical Service',
              estimatedFee: fee,
              status: bStatus,
              assignedNurseId: l.assignedNurseId || undefined,
              assignedNurseName: assignedNurse ? `${assignedNurse.name} (${assignedNurse.serviceArea})` : undefined,
              nurseAcceptanceStatus: l.assignedNurseId ? 'Accepted' : undefined,
              createdAt: l.submittedAt || new Date().toISOString(),
              hasPrescription: false,
              referringNurseId: l.nurseId,
              referringNurseName: refNurse?.name || 'Referred Nurse',
              referralBonusRupees: comm,
              notes: `${l.notes ? 'Description: ' + l.notes + ' | ' : ''}Patient Referral by ${refNurse?.name || 'Nurse'}. [50 points + ₹${comm} (10%) credited upon visit completion]`
            };

            cleanMergedBookings.unshift(synthBooking);
            dbSaveBooking(synthBooking);
          }
        });

        const deduplicatedMerged = deduplicateBookings(cleanMergedBookings);
        setBookings((prev) => {
          if (prev.length === deduplicatedMerged.length && JSON.stringify(prev) === JSON.stringify(deduplicatedMerged)) {
            return prev;
          }
          return deduplicatedMerged;
        });
      }
      if (remoteNurses !== null) {
        setNurses((prev) => {
          if (prev.length === remoteNurses.length && JSON.stringify(prev) === JSON.stringify(remoteNurses)) {
            return prev;
          }
          return remoteNurses;
        });

        // Strictly verify active nurse session against fresh database records
        setAuthUser((prev) => {
          if (prev && prev.role === 'nurse') {
            const found = remoteNurses.find(
              (n) => n.id === prev.id || (n.phone && prev.phone && n.phone.replace(/\D/g, '') === prev.phone.replace(/\D/g, ''))
            );
            if (!found || found.status !== 'Active') {
              try { localStorage.removeItem('xn_auth_user'); } catch {}
              try { localStorage.removeItem('xn_active_nurse_id'); } catch {}
              if (window.location.pathname === '/nurse') {
                navigate('/login?portal=nurse');
              }
              return null;
            }
          }
          return prev;
        });
      }
      if (remoteLeads !== null) {
        setLeads((prev) => {
          if (prev.length === remoteLeads.length && JSON.stringify(prev) === JSON.stringify(remoteLeads)) {
            return prev;
          }
          return remoteLeads;
        });
      }
      if (remoteConsults !== null) {
        setConsultations((prev) => {
          if (prev.length === remoteConsults.length && JSON.stringify(prev) === JSON.stringify(remoteConsults)) {
            return prev;
          }
          return remoteConsults;
        });
      }
    } catch (e) {
      console.warn('[Realtime Sync] Background sync warning:', e);
    }
  };

  // =========================================================================
  // ZERO-DELAY REALTIME SYNC ENGINE
  // Layer 1: BroadcastChannel (Instant Cross-Tab)
  // Layer 2: localStorage StorageEvent (Instant Cross-Window)
  // Layer 3: Focus & Tab Visibility Change (Instant when user switches tabs)
  // Layer 4: Supabase Realtime WebSocket Subscriptions
  // Layer 5: High-Frequency Background Heartbeat Poller (Every 1.5 seconds)
  // =========================================================================
  useEffect(() => {
    const handleSyncEvent = (type: string, data: any) => {
      if (!type) return;

      if (type === 'BOOKING_UPDATE' && data?.id) {
        setBookings((prev) => prev.map((b) => (b.id === data.id ? { ...b, ...data } : b)));
      } else if (type === 'BOOKING_CREATE' && data?.id) {
        setBookings((prev) => {
          const exists = prev.some((b) => b.id === data.id);
          return exists ? prev.map((b) => (b.id === data.id ? { ...b, ...data } : b)) : [data, ...prev];
        });
      } else if (type === 'BOOKING_DELETE' && data?.id) {
        setBookings((prev) => prev.filter((b) => b.id !== data.id));
      } else if (type === 'NURSE_UPDATE' && data?.id) {
        setNurses((prev) => prev.map((n) => (n.id === data.id ? { ...n, ...data } : n)));
      } else if (type === 'NURSE_CREATE' && data?.id) {
        setNurses((prev) => {
          const exists = prev.some((n) => n.id === data.id);
          return exists ? prev.map((n) => (n.id === data.id ? { ...n, ...data } : n)) : [...prev, data];
        });
      } else if (type === 'NURSE_DELETE' && data?.id) {
        setNurses((prev) => prev.filter((n) => n.id !== data.id));
        setAppUsers((prev) => prev.filter((u) => u.id !== data.id));
        setAuthUser((prev) => {
          if (prev && prev.id === data.id) {
            try { localStorage.removeItem('xn_auth_user'); } catch {}
            try { localStorage.removeItem('xn_active_nurse_id'); } catch {}
            if (window.location.pathname === '/nurse') {
              navigate('/login?portal=nurse');
            }
            return null;
          }
          return prev;
        });
      } else if (type === 'LEAD_UPDATE' && data?.id) {
        setLeads((prev) => prev.map((l) => (l.id === data.id ? { ...l, ...data } : l)));
      } else if (type === 'LEAD_CREATE' && data?.id) {
        setLeads((prev) => {
          const exists = prev.some((l) => l.id === data.id);
          return exists ? prev.map((l) => (l.id === data.id ? { ...l, ...data } : l)) : [data, ...prev];
        });
      } else if (type === 'LEAD_DELETE' && data?.id) {
        setLeads((prev) => prev.filter((l) => l.id !== data.id));
      } else if (type === 'CONSULTATION_UPDATE' && data?.id) {
        setConsultations((prev) => prev.map((c) => (c.id === data.id ? { ...c, ...data } : c)));
      } else if (type === 'CONSULTATION_CREATE' && data?.id) {
        setConsultations((prev) => {
          const exists = prev.some((c) => c.id === data.id);
          return exists ? prev.map((c) => (c.id === data.id ? { ...c, ...data } : c)) : [data, ...prev];
        });
      } else if (type === 'CONSULTATION_DELETE' && data?.id) {
        setConsultations((prev) => prev.filter((c) => c.id !== data.id));
      } else if (type === 'SERVICE_UPDATE' && data?.id) {
        setServices((prev) => prev.map((s) => (s.id === data.id ? { ...s, ...data } : s)));
      } else if (type === 'SERVICE_CREATE' && data?.id) {
        setServices((prev) => {
          const exists = prev.some((s) => s.id === data.id);
          return exists ? prev.map((s) => (s.id === data.id ? { ...s, ...data } : s)) : [...prev, data];
        });
      } else if (type === 'SERVICE_DELETE' && data?.id) {
        setServices((prev) => prev.filter((s) => s.id !== data.id));
      } else if (type === 'COUPON_UPDATE' && data?.id) {
        setCoupons((prev) => prev.map((c) => (c.id === data.id ? { ...c, ...data } : c)));
      } else if (type === 'COUPON_CREATE' && (data?.id || data?.code)) {
        setCoupons((prev) => {
          const exists = prev.some((c) => c.id === data.id || c.code === data.code);
          return exists ? prev.map((c) => (c.id === data.id || c.code === data.code ? { ...c, ...data } : c)) : [data, ...prev];
        });
      } else if (type === 'COUPON_DELETE' && data?.id) {
        setCoupons((prev) => prev.filter((c) => c.id !== data.id));
      } else if (type === 'APP_USER_UPDATE' && data?.id) {
        setAppUsers((prev) => prev.map((u) => (u.id === data.id ? { ...u, ...data } : u)));
      } else if (type === 'APP_USER_CREATE' && data?.id) {
        setAppUsers((prev) => {
          const exists = prev.some((u) => u.id === data.id);
          return exists ? prev.map((u) => (u.id === data.id ? { ...u, ...data } : u)) : [...prev, data];
        });
      } else if (type === 'APP_USER_DELETE' && data?.id) {
        setAppUsers((prev) => prev.filter((u) => u.id !== data.id));
      } else if (type === 'RESYNC_ALL') {
        refreshAllDataFromDb(true);
      }
    };

    // 1. Cross-Tab Broadcast Channel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('xn_live_sync_bus');
        bc.onmessage = (event) => {
          const { type, data } = event.data || {};
          handleSyncEvent(type, data);
        };
      }
    } catch { }

    // 2. Storage event listener (fires across all tabs/windows in the browser)
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'xn_realtime_sync_event' && e.newValue) {
        try {
          const { type, data } = JSON.parse(e.newValue);
          handleSyncEvent(type, data);
        } catch { }
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // 3. Tab Focus & Visibility Resync (instantly sync when switching between tabs without reload)
    const handleFocusOrVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshAllDataFromDb();
      }
    };
    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    // 4. Supabase Realtime WebSocket Subscriptions for all tables
    const channel = supabase
      .channel('realtime-xpressnurse-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        async (payload) => {
          console.log('[Realtime DB] Live Booking update:', payload);
          if (payload.new && (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT')) {
            const raw: any = payload.new;
            setBookings((prev) => {
              const mapped: Booking = {
                id: raw.id,
                createdAt: raw.created_at,
                patientName: raw.patient_name || '',
                patientPhone: raw.patient_phone || '',
                patientAge: raw.patient_age ? Number(raw.patient_age) : undefined,
                patientGender: raw.patient_gender,
                serviceId: raw.service_id,
                serviceTitle: raw.service_title || 'Home Visit',
                area: raw.area || 'Hyderabad',
                fullAddress: raw.full_address || `${raw.area}, Hyderabad`,
                preferredDate: raw.preferred_date || 'Today',
                preferredTime: raw.preferred_time || 'ASAP',
                hasPrescription: Boolean(raw.has_prescription),
                prescriptionFileName: raw.prescription_file_name,
                prescriptionUrl: raw.prescription_url,
                status: raw.status || 'Pending',
                assignedNurseId: raw.assigned_nurse_id,
                assignedNurseName: raw.assigned_nurse_name,
                referringNurseId: raw.referring_nurse_id,
                referringNurseName: raw.referring_nurse_name,
                estimatedFee: Number(raw.estimated_fee) || 800,
                nightSurcharge: Number(raw.night_surcharge) || 0,
                referralBonusRupees: Number(raw.referral_bonus_rupees) || 0,
                notes: raw.notes || '',
                bookingType: raw.booking_type || ((raw.preferred_time?.toLowerCase().includes('immediate') || raw.preferred_date?.toLowerCase().includes('instant') || raw.preferred_date?.toLowerCase().includes('immediate')) ? 'Instant' : 'Scheduled'),
                scheduledSlot: raw.scheduled_slot,
                rejectionReason: raw.rejection_reason || undefined,
                promoCode: raw.promo_code || undefined,
                discountRupees: Number(raw.discount_rupees) || 0,
                finalFee: raw.final_fee != null ? Number(raw.final_fee) : undefined
              };
              const exists = prev.some((b) => b.id === mapped.id);
              return exists ? prev.map((b) => (b.id === mapped.id ? mapped : b)) : [mapped, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            const delId = (payload.old as any)?.id;
            if (delId) {
              setBookings((prev) => prev.filter((b) => b.id !== delId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nurses' },
        async (payload) => {
          console.log('[Realtime DB] Live Nurse update:', payload);
          if (payload.new && (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT')) {
            const raw: any = payload.new;
            const mapped: NurseProfile = {
              id: raw.id,
              name: raw.name || '',
              phone: raw.phone || '',
              email: raw.email || '',
              experienceYears: Number(raw.experience_years) || 5,
              qualification: raw.qualification || 'B.Sc Nursing',
              serviceArea: raw.service_area || 'Hyderabad',
              status: raw.status || 'Active',
              totalLeads: Number(raw.total_leads) || 0,
              convertedLeads: Number(raw.converted_leads) || 0,
              totalReferrals: Number(raw.total_referrals) || 0,
              pointsEarned: Number(raw.points_earned) || 0,
              referralEarningsRupees: Number(raw.referral_earnings_rupees) || 0,
              rating: Number(raw.rating) || 4.9,
              avatarUrl: raw.avatar_url,
              certificateVerified: Boolean(raw.certificate_verified),
              certificateUrl: raw.certificate_url,
              referredByNurseId: raw.referred_by_nurse_id,
              earningsPaid: Number(raw.earnings_paid) || 0,
              earningsPending: Number(raw.earnings_pending) || 0,
              rejectionReason: raw.rejection_reason
            };
            setNurses((prev) => {
              const exists = prev.some((n) => n.id === mapped.id);
              return exists ? prev.map((n) => (n.id === mapped.id ? mapped : n)) : [...prev, mapped];
            });
          } else if (payload.eventType === 'DELETE') {
            const delId = (payload.old as any)?.id;
            if (delId) {
              setNurses((prev) => prev.filter((n) => n.id !== delId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        async (payload) => {
          console.log('[Realtime DB] Live Lead update:', payload);
          if (payload.new && (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT')) {
            const raw: any = payload.new;
            const mapped: NurseLead = {
              id: raw.id,
              nurseId: raw.nurse_id,
              patientName: raw.patient_name || raw.referred_nurse_name || 'Patient',
              patientPhone: raw.patient_phone || raw.referred_nurse_phone || '',
              serviceId: raw.service_id,
              area: raw.area,
              submittedAt: raw.submitted_at || new Date().toISOString(),
              status: raw.status || 'Pending Approval',
              assignedNurseId: raw.assigned_nurse_id,
              leadValueRupees: Number(raw.lead_value_rupees) || 1000,
              pointsAwarded: Math.round(Number(raw.points_awarded)) || 50,
              referralCommissionRupees: Number(raw.referral_commission_rupees) || 100,
              referredNurseName: raw.referred_nurse_name,
              referredNursePhone: raw.referred_nurse_phone,
              adminNotes: raw.admin_notes,
              approvedBy: raw.approved_by,
              approvedAt: raw.approved_at,
              rejectedBy: raw.rejected_by,
              rejectionReason: raw.rejection_reason
            };
            setLeads((prev) => {
              const exists = prev.some((l) => l.id === mapped.id);
              return exists ? prev.map((l) => (l.id === mapped.id ? mapped : l)) : [mapped, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            const delId = (payload.old as any)?.id;
            if (delId) {
              setLeads((prev) => prev.filter((l) => l.id !== delId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'consultations' },
        async (payload) => {
          console.log('[Realtime DB] Live Consultation update:', payload);
          if (payload.new && (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT')) {
            const raw: any = payload.new;
            const mapped: DoctorConsultation = {
              id: raw.id,
              patientName: raw.patient_name,
              patientPhone: raw.patient_phone,
              patientAge: Number(raw.patient_age) || 30,
              area: raw.area,
              symptoms: raw.symptoms,
              status: raw.status || 'Pending Review',
              requestedAt: raw.requested_at,
              doctorName: raw.doctor_name,
              prescriptionIssued: Boolean(raw.prescription_issued),
              prescriptionText: raw.prescription_text,
              recommendedService: raw.recommended_service
            };
            setConsultations((prev) => {
              const exists = prev.some((c) => c.id === mapped.id);
              return exists ? prev.map((c) => (c.id === mapped.id ? mapped : c)) : [mapped, ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            const delId = (payload.old as any)?.id;
            if (delId) {
              setConsultations((prev) => prev.filter((c) => c.id !== delId));
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        async (payload) => {
          console.log('[Realtime DB] Live Service update:', payload);
          if (payload.eventType === 'DELETE') {
            const delId = (payload.old as any)?.id;
            if (delId) {
              setServices((prev) => prev.filter((s) => s.id !== delId));
            }
          } else if (payload.new && (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT')) {
            const raw: any = payload.new;
            const mapped: ServiceItem = {
              id: raw.id,
              title: raw.title,
              subtitle: raw.subtitle,
              description: raw.description,
              singleVisitPrice: raw.single_visit_price ? Number(raw.single_visit_price) : undefined,
              multiVisitPrice: raw.multi_visit_price ? Number(raw.multi_visit_price) : undefined,
              nightSurcharge: raw.night_surcharge ? Number(raw.night_surcharge) : undefined,
              prescriptionRequired: Boolean(raw.prescription_required),
              duration: raw.duration,
              indicativePrice: raw.indicative_price,
              priceNumber: raw.price_number ? Number(raw.price_number) : undefined,
              features: raw.features,
              icon: raw.icon,
              badge: raw.badge,
              procedureSteps: raw.procedure_steps,
              equipmentProvided: raw.equipment_provided,
              imageUrl: raw.image_url,
              createdAt: raw.created_at
            };
            setServices((prev) => {
              const exists = prev.some((s) => s.id === mapped.id);
              return exists ? prev.map((s) => (s.id === mapped.id ? mapped : s)) : [...prev, mapped];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coupons' },
        async (payload) => {
          console.log('[Realtime DB] Live Coupon update:', payload);
          if (payload.eventType === 'DELETE') {
            const delId = (payload.old as any)?.id;
            if (delId) {
              setCoupons((prev) => prev.filter((c) => c.id !== delId));
            }
          } else if (payload.new && (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT')) {
            const raw: any = payload.new;
            const mapped: Coupon = {
              id: raw.id,
              code: raw.code,
              discountType: raw.discount_type,
              discountValue: Number(raw.discount_value),
              maxDiscount: raw.max_discount ? Number(raw.max_discount) : undefined,
              minOrderAmount: raw.min_order_amount ? Number(raw.min_order_amount) : undefined,
              description: raw.description,
              status: raw.status,
              usageLimit: raw.usage_limit ? Number(raw.usage_limit) : undefined,
              timesUsed: Number(raw.times_used) || 0,
              validUntil: raw.valid_until,
              createdAt: raw.created_at,
              updatedAt: raw.updated_at
            };
            setCoupons((prev) => {
              const exists = prev.some((c) => c.id === mapped.id);
              return exists ? prev.map((c) => (c.id === mapped.id ? mapped : c)) : [...prev, mapped];
            });
          }
        }
      )
      .subscribe();

    // 5. Gentle Heartbeat Poller: Reduced from 1.5s to 5 minutes to eliminate disk IO budget depletion and excess egress.
    // Live updates are already pushed instantaneously via Supabase WebSockets (above) and BroadcastChannel cross-tab.
    const heartbeatTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshAllDataFromDb(false);
      }
    }, 300000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(heartbeatTimer);
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      if (bc) bc.close();
    };
  }, []);

  // Handler: When user books a service from public site
  const handleBookingCreated = (newBooking: Booking) => {
    // If booked via direct nurse referral link, auto-lock to referring nurse (Rule 1)
    // If booked via nurse referral or direct booking, keep status as 'Pending' so Admin explicitly approves and dispatches
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

    const bookingFee = Number(newBooking.estimatedFee || newBooking.finalFee || 800);
    const finalizedBooking: Booking = {
      ...newBooking,
      status: 'Pending', // Strictly Pending until Admin reviews, approves, and dispatches
      nursePayoutRupees: newBooking.nursePayoutRupees || Math.round(bookingFee * 0.70), // 70% of booking charge by default
      assignedNurseId,
      assignedNurseName
    };

    setBookings((prev) => [finalizedBooking, ...prev]);
    broadcastRealtimeUpdate('BOOKING_CREATE', finalizedBooking);
    dbSaveBooking(finalizedBooking);

    // If booked via nurse referral link, record as Patient Referral lead in 'Pending Approval' state
    // Patient referral gives 50 points + 10% of service charge if approved by Admin
    if (newBooking.referringNurseId) {
      const refNurse = nurses.find((n) => n.id === newBooking.referringNurseId);
      const commissionRupees = Math.round(bookingFee * 0.10); // 10% of service charge
      const bookingLead: NurseLead = {
        id: `RP-${newBooking.id.replace(/^BK-/, '')}`,
        nurseId: newBooking.referringNurseId,
        nurseName: refNurse?.name || newBooking.referringNurseName,
        patientName: newBooking.patientName,
        patientPhone: newBooking.patientPhone,
        serviceId: newBooking.serviceId,
        area: newBooking.area,
        status: 'Pending Approval',
        leadValueRupees: bookingFee,
        pointsAwarded: 50,
        referralCommissionRupees: commissionRupees,
        referralType: 'patient',
        submittedAt: new Date().toISOString()
      };
      setLeads((prev) => [bookingLead, ...prev]);
      broadcastRealtimeUpdate('LEAD_CREATE', bookingLead);
      dbSaveLead(bookingLead);
    }
  };

  // Handler: Nurse submits a patient referral lead (Direct to Admin - NOT auto-assigned to any nurse)
  const handleAddNewLead = (newLead: NurseLead) => {
    const procedure = services.find((s) => s.id === newLead.serviceId);
    const fee = Number(newLead.leadValueRupees) || (procedure?.priceNumber || 800);
    const commissionRupees = Math.round(fee * 0.10); // 10% of service charge

    // Lead enters "Pending Approval" state directly for Admin review; 50 pts + 10% fee credited ONLY after Admin approval
    const pendingLead: NurseLead = {
      ...newLead,
      id: newLead.id.startsWith('RP-') || newLead.id.startsWith('RN-') ? newLead.id : `RP-${Date.now().toString().slice(-6)}`,
      assignedNurseId: undefined, // Explicitly not assigned to any nurse; Admin will decide
      status: 'Pending Approval',
      pointsAwarded: 50,
      leadValueRupees: fee,
      referralCommissionRupees: commissionRupees, // 10% of service charge
      referralType: newLead.referralType || 'patient'
    };

    setLeads((prev) => {
      const next = deduplicateLeads([pendingLead, ...prev]);
      try { localStorage.setItem('xn_cached_leads', JSON.stringify(next)); } catch { }
      return next;
    });
    broadcastRealtimeUpdate('LEAD_CREATE', pendingLead);
    dbSaveLead(pendingLead);

    // Directly after refer: DO NOT show in booking or assign nurse.
    // The referral enters "Pending Approval" in Leads for Admin review.
    // ONLY after Admin approves the lead (handleAdminApproveLead), the booking is created and queued in Bookings and Assign Nurse.
    const referringNurse = nurses.find((n) => n.id === newLead.nurseId);

    // Track total submitted referrals counter ONLY. 50 points and 10% commission are strictly credited AFTER Admin approval!
    if (referringNurse) {
      const updatedReferringNurse: NurseProfile = {
        ...referringNurse,
        totalLeads: (referringNurse.totalLeads || 0) + 1,
        totalReferrals: (referringNurse.totalReferrals || 0) + 1
      };
      setNurses((prev) => prev.map((n) => (n.id === updatedReferringNurse.id ? updatedReferringNurse : n)));
      broadcastRealtimeUpdate('NURSE_UPDATE', updatedReferringNurse);
      dbUpdateNurse(updatedReferringNurse);
    }
  };

  // Handler: Admin Approves Lead & awards strictly 50 Reward Points + 10% commission
  const handleAdminApproveLead = async (
    leadId: string,
    pointsAwarded: number = 50,
    referralRupees: number = 0,
    adminNotes?: string,
    assignToNurseId?: string
  ): Promise<string | undefined> => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return undefined;

    const isAlreadyApproved = lead.status === 'Approved' || lead.status === 'Converted';
    const pointsToCredit = pointsAwarded > 0 ? pointsAwarded : 50;
    const procedure = services.find((s) => s.id === lead.serviceId);
    const fee = Number(lead.leadValueRupees) || (procedure?.priceNumber || 800);
    const commissionRupees: number = referralRupees > 0
      ? referralRupees
      : (lead.referralCommissionRupees && lead.referralCommissionRupees > 0
        ? lead.referralCommissionRupees
        : (lead.referralType === 'nurse' || lead.referredNursePhone ? 0 : Math.round(fee * 0.10)));

    const isNurseReferral = lead.referralType === 'nurse' || Boolean(lead.referredNursePhone);
    const assignedNurse = assignToNurseId ? nurses.find((n) => n.id === assignToNurseId) : undefined;

    const approvedLead: NurseLead = {
      ...lead,
      status: 'Approved',
      assignedNurseId: assignToNurseId || lead.assignedNurseId,
      pointsAwarded: pointsToCredit,
      referralCommissionRupees: commissionRupees,
      approvedAt: lead.approvedAt || new Date().toISOString(),
      approvedBy: 'Admin',
      adminNotes: adminNotes || (isNurseReferral
        ? `Referred nurse approved (+${pointsToCredit} points credited)`
        : assignToNurseId && assignedNurse
          ? `Patient approved & assigned to ${assignedNurse.name}. 50 points + ₹${commissionRupees} (10%) credited upon visit completion.`
          : `Patient approved & booking queued in Assign Nurses. 50 points + 10% commission credited after assigned nurse completes visit.`
      )
    };

    setLeads((prev) => prev.map((l) => (l.id === leadId ? approvedLead : l)));
    broadcastRealtimeUpdate('LEAD_UPDATE', approvedLead);
    await dbUpdateLeadById(leadId, approvedLead);

    // If this lead corresponds to a referred nurse, activate and approve that nurse now!
    const leadNursePhone = (lead.referredNursePhone || lead.patientPhone || '').replace(/\D/g, '');
    const referredNurse = nurses.find((n) =>
      (leadNursePhone && n.phone && n.phone.replace(/\D/g, '') === leadNursePhone) ||
      (lead.referredNurseName && n.name.toLowerCase() === lead.referredNurseName.toLowerCase()) ||
      (lead.patientName && n.name.toLowerCase() === lead.patientName.toLowerCase())
    );
    if (referredNurse && (!referredNurse.certificateVerified || referredNurse.status !== 'Active')) {
      const activatedNurse: NurseProfile = {
        ...referredNurse,
        status: 'Active',
        certificateVerified: true
      };
      setNurses((prev) => prev.map((n) => (n.id === activatedNurse.id ? activatedNurse : n)));
      broadcastRealtimeUpdate('NURSE_UPDATE', activatedNurse);
      await dbUpdateNurse(activatedNurse);
    }

    // For Nurse Referral: credit referring nurse 50 points upon nurse verification (only if not already credited).
    const referringNurse = nurses.find((n) => n.id === lead.nurseId);
    if (referringNurse && isNurseReferral && !isAlreadyApproved) {
      const updatedNurse: NurseProfile = {
        ...referringNurse,
        pointsEarned: (referringNurse.pointsEarned || 0) + pointsToCredit,
        convertedLeads: (referringNurse.convertedLeads || 0) + 1,
        totalReferrals: Math.max(referringNurse.totalReferrals || 0, (referringNurse.convertedLeads || 0) + 1)
      };
      setNurses((prev) => {
        const next = prev.map((n) => (n.id === updatedNurse.id ? updatedNurse : n));
        try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch { }
        return next;
      });
      broadcastRealtimeUpdate('NURSE_UPDATE', updatedNurse);
      await dbUpdateNurse(updatedNurse);
    }

    // For patient referrals: Guarantee a fresh booking is queued in "Assign Nurses" (or assigned to chosen nurse)
    let bookingResultId: string | undefined = undefined;
    if (!isNurseReferral && lead.patientName) {
      const cleanLeadPhone10 = normalizePhone10(lead.patientPhone);
      const cleanLeadDigits = lead.id.replace(/\D/g, '') || lead.id.slice(-6);
      const deterministicId = `BK-${cleanLeadDigits.slice(-6)}`;

      const existingBooking = bookings.find((b) =>
        b.id === deterministicId ||
        b.id === `BK-${cleanLeadDigits.slice(-4)}` ||
        (cleanLeadPhone10 && normalizePhone10(b.patientPhone) === cleanLeadPhone10) ||
        (b.referringNurseId === lead.nurseId && b.patientName && lead.patientName && b.patientName.toLowerCase().trim() === lead.patientName.toLowerCase().trim())
      );

      const targetStatus = assignToNurseId ? 'Assigned' : (existingBooking && existingBooking.status === 'Completed' ? 'Completed' : 'Pending');
      const assignedName = assignToNurseId && assignedNurse ? `${assignedNurse.name} (${assignedNurse.serviceArea})` : (existingBooking?.assignedNurseName);

      if (existingBooking) {
        bookingResultId = existingBooking.id;
        const updatedB: Booking = {
          ...existingBooking,
          status: targetStatus,
          assignedNurseId: assignToNurseId || existingBooking.assignedNurseId,
          assignedNurseName: assignedName,
          nurseAcceptanceStatus: assignToNurseId ? 'Pending' : existingBooking.nurseAcceptanceStatus,
          nursePayoutRupees: assignToNurseId ? Math.round(fee * 0.70) : existingBooking.nursePayoutRupees,
          referringNurseId: lead.nurseId,
          referringNurseName: referringNurse?.name || 'Referred Nurse',
          referralBonusRupees: commissionRupees,
          area: existingBooking.area || lead.area || 'Hyderabad Central',
          serviceId: existingBooking.serviceId || lead.serviceId || 'saline-infusion',
          notes: `${existingBooking.notes || ''} [Approved: 50 points + ₹${commissionRupees} (10%) credited upon visit completion]`.trim()
        };
        setBookings((prev) => {
          const next = deduplicateBookings(prev.map((b) => (b.id === existingBooking.id ? updatedB : b)));
          try { localStorage.setItem('xn_cached_bookings', JSON.stringify(next)); } catch { }
          return next;
        });
        broadcastRealtimeUpdate('BOOKING_UPDATE', updatedB);
        await dbSaveBooking(updatedB);
      } else {
        const newBookingId = deterministicId;
        bookingResultId = newBookingId;
        const newBooking: Booking = {
          id: newBookingId,
          patientName: lead.patientName,
          patientPhone: lead.patientPhone || '',
          area: lead.area || 'Hyderabad Central',
          fullAddress: lead.fullAddress || '',
          serviceId: lead.serviceId || 'saline-infusion',
          serviceTitle: services.find((s) => s.id === lead.serviceId)?.title || lead.serviceId || 'Clinical Service',
          estimatedFee: fee,
          status: targetStatus,
          assignedNurseId: assignToNurseId || undefined,
          assignedNurseName: assignedName,
          nurseAcceptanceStatus: assignToNurseId ? 'Pending' : undefined,
          nursePayoutRupees: assignToNurseId ? Math.round(fee * 0.70) : undefined,
          createdAt: new Date().toISOString(),
          hasPrescription: false,
          referringNurseId: lead.nurseId,
          referringNurseName: referringNurse?.name || 'Referred Nurse',
          referralBonusRupees: commissionRupees,
          notes: `${lead.notes ? 'Description: ' + lead.notes + ' | ' : ''}Patient Referral by ${referringNurse?.name || 'Nurse'}. [50 points + ₹${commissionRupees} (10%) credited upon visit completion]`
        };
        setBookings((prev) => {
          const next = deduplicateBookings([newBooking, ...prev]);
          try { localStorage.setItem('xn_cached_bookings', JSON.stringify(next)); } catch { }
          return next;
        });
        broadcastRealtimeUpdate('BOOKING_UPDATE', newBooking);
        await dbSaveBooking(newBooking);
      }
    }

    return bookingResultId;
  };

  // Handler: Admin Rejects Lead — strictly removes points and commission if previously approved
  const handleAdminRejectLead = async (leadId: string, adminNotes?: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const wasApproved = lead.status === 'Approved' || lead.status === 'Converted';
    const pointsToDeduct = lead.pointsAwarded || 50;
    const rupeesToDeduct = lead.referralCommissionRupees || 0;

    const rejectedLead: NurseLead = {
      ...lead,
      status: 'Rejected',
      pointsAwarded: 0,
      referralCommissionRupees: 0,
      approvedAt: undefined,
      rejectedBy: 'Admin',
      rejectionReason: adminNotes || 'Rejected by Admin review',
      adminNotes: adminNotes || 'Rejected by Admin review'
    };

    setLeads((prev) => prev.map((l) => (l.id === leadId ? rejectedLead : l)));
    broadcastRealtimeUpdate('LEAD_UPDATE', rejectedLead);
    await dbUpdateLeadById(leadId, rejectedLead);

    // If this lead was for a referred nurse, mark that nurse as unapproved / pending verification
    const leadNursePhone = (lead.referredNursePhone || lead.patientPhone || '').replace(/\D/g, '');
    const referredNurse = nurses.find((n) =>
      (leadNursePhone && n.phone && n.phone.replace(/\D/g, '') === leadNursePhone) ||
      (lead.referredNurseName && n.name.toLowerCase() === lead.referredNurseName.toLowerCase())
    );
    if (referredNurse && (referredNurse.certificateVerified || referredNurse.status === 'Active')) {
      const unverifiedNurse: NurseProfile = {
        ...referredNurse,
        status: 'Pending Verification',
        certificateVerified: false
      };
      setNurses((prev) => prev.map((n) => (n.id === unverifiedNurse.id ? unverifiedNurse : n)));
      broadcastRealtimeUpdate('NURSE_UPDATE', unverifiedNurse);
      await dbUpdateNurse(unverifiedNurse);
    }

    // If this lead was for a booking, clear referral bonus on that booking
    setBookings((prev) =>
      prev.map((b) => {
        if (b.patientPhone === lead.patientPhone || (b.referringNurseId === lead.nurseId && b.patientName === lead.patientName)) {
          const updatedB = {
            ...b,
            referralBonusRupees: 0,
            notes: `${b.notes ? b.notes + ' • ' : ''}[Referral rejected by Admin]`.trim()
          };
          broadcastRealtimeUpdate('BOOKING_UPDATE', updatedB);
          return updatedB;
        }
        return b;
      })
    );

    // If previously approved, reverse points & referral commission from the referring nurse
    if (wasApproved) {
      const referringNurse = nurses.find((n) => n.id === lead.nurseId);
      if (referringNurse) {
        const updatedNurse: NurseProfile = {
          ...referringNurse,
          pointsEarned: Math.max(0, (referringNurse.pointsEarned || 0) - pointsToDeduct),
          referralEarningsRupees: Math.max(0, (referringNurse.referralEarningsRupees || 0) - rupeesToDeduct),
          convertedLeads: Math.max(0, (referringNurse.convertedLeads || 0) - 1),
          totalReferrals: Math.max(0, (referringNurse.totalReferrals || 0) - 1)
        };
        setNurses((prev) => {
          const next = prev.map((n) => (n.id === updatedNurse.id ? updatedNurse : n));
          try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch { }
          return next;
        });
        broadcastRealtimeUpdate('NURSE_UPDATE', updatedNurse);
        await dbUpdateNurse(updatedNurse);
      }
    }
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
          broadcastRealtimeUpdate('BOOKING_UPDATE', updated);
          dbSaveBooking(updated);
          return updated;
        }
        return b;
      })
    );
  };

  // Handler: Update Nurse Profile
  const handleUpdateNurse = (updated: NurseProfile) => {
    setNurses((prev) => {
      const next = prev.map((n) => (n.id === updated.id ? updated : n));
      try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch { }
      return next;
    });
    setAppUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id === updated.id) {
          return {
            ...u,
            name: updated.name,
            phone: updated.phone,
            email: updated.email,
            designation: updated.qualification,
            serviceArea: updated.serviceArea,
          };
        }
        return u;
      });
      try { localStorage.setItem('xn_cached_app_users', JSON.stringify(next)); } catch { }
      return next;
    });
    setAuthUser((prev) => {
      if (prev && prev.id === updated.id) {
        const next = {
          ...prev,
          name: updated.name,
          phone: updated.phone,
          email: updated.email,
          designation: updated.qualification,
          serviceArea: updated.serviceArea,
        };
        try { localStorage.setItem('xn_auth_user', JSON.stringify(next)); } catch { }
        return next;
      }
      return prev;
    });
    broadcastRealtimeUpdate('NURSE_UPDATE', updated);
    dbUpdateNurse(updated);
  };

  // Handler: Admin assigns or reassigns order
  const handleAdminAssignOrder = (bookingId: string, nurseId: string, ruleExplanation: string, customPayout?: number) => {
    const nurseObj = nurses.find((n) => n.id === nurseId);
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          const wasRejected = b.status === 'Rejected' || b.nurseAcceptanceStatus === 'Rejected';
          const auditMsg = wasRejected
            ? `Referred & reassigned to Nurse ${nurseObj?.name || nurseId} by Admin (${ruleExplanation})`
            : undefined;
          const updatedNotes = auditMsg ? (b.notes ? `${b.notes} • ${auditMsg}` : auditMsg) : b.notes;
          const bookingFee = Number(b.finalFee || b.estimatedFee || 899);
          const assignedPayout = customPayout !== undefined ? customPayout : (b.nursePayoutRupees || Math.round(bookingFee * 0.70));

          const updated: Booking = {
            ...b,
            status: 'Assigned',
            nurseAcceptanceStatus: 'Pending',
            assignedNurseId: nurseId,
            assignedNurseName: `${nurseObj?.name || 'Nurse'} (${ruleExplanation})`,
            nursePayoutRupees: assignedPayout,
            rejectedBy: undefined,
            rejectionReason: undefined,
            rejectedNurseId: undefined,
            rejectedNurseName: undefined,
            rejectedAt: undefined,
            notes: updatedNotes
          };
          broadcastRealtimeUpdate('BOOKING_UPDATE', updated);
          dbSaveBooking(updated);

          // Link assignedNurseId to matching patient referral lead
          if (b.referringNurseId) {
            const bPhoneClean = (b.patientPhone || '').replace(/\D/g, '');
            const matchingLead = leads.find(l =>
              (bPhoneClean && l.patientPhone && l.patientPhone.replace(/\D/g, '') === bPhoneClean) ||
              (l.nurseId === b.referringNurseId && l.patientName && b.patientName && l.patientName.toLowerCase() === b.patientName.toLowerCase())
            );
            if (matchingLead) {
              const updatedLead: NurseLead = {
                ...matchingLead,
                assignedNurseId: nurseId
              };
              setLeads((prevLeads) => prevLeads.map(l => l.id === matchingLead.id ? updatedLead : l));
              broadcastRealtimeUpdate('LEAD_UPDATE', updatedLead);
              dbUpdateLeadById(matchingLead.id, updatedLead);
            }
          }

          return updated;
        }
        return b;
      })
    );
  };

  // Handler: Admin Auto-Routes all pending via Rule 2
  const handleAutoRouteAll = () => {
    setBookings((prev) => {
      const updatedList = prev.map((b) => {
        if (b.status === 'Pending') {
          const areaNurse = nurses.find((n) => n.serviceArea === b.area && n.certificateVerified) || nurses.find((n) => n.certificateVerified);
          if (!areaNurse) {
            return b; // Do not assign if no verified nurse is available
          }
          const updated: Booking = {
            ...b,
            status: 'Assigned',
            assignedNurseId: areaNurse.id,
            assignedNurseName: `${areaNurse.name} (Auto Area Match - Rule 2)`
          };
          broadcastRealtimeUpdate('BOOKING_UPDATE', updated);
          dbSaveBooking(updated);
          return updated;
        }
        return b;
      });
      broadcastRealtimeUpdate('RESYNC_ALL', {});
      return updatedList;
    });
  };

  // Handler: Doctor issues prescription — persist to Supabase & Cloudflare R2
  const handleDoctorIssueRx = async (consultId: string, rxText: string, recommendedService: ServiceId) => {
    const targetConsult = consultations.find((c) => c.id === consultId);
    const patName = targetConsult?.patientName || 'Patient';
    const rxFileName = `Doctor_Rx_${consultId}_${patName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    // 1. Update React state for consultations
    const updatedConsultationRecord = {
      id: consultId,
      status: 'Prescription Issued' as const,
      prescriptionIssued: true,
      prescriptionText: rxText,
      recommendedService
    };
    setConsultations((prev) =>
      prev.map((c) => {
        if (c.id === consultId) {
          return {
            ...c,
            ...updatedConsultationRecord
          };
        }
        return c;
      })
    );
    broadcastRealtimeUpdate('CONSULTATION_UPDATE', updatedConsultationRecord);

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

    // 3. Register prescription in Cloudflare R2 storage under prescriptions category for instant in-app viewing
    try {
      await uploadToCloudflareStorage({
        fileName: rxFileName,
        category: 'prescriptions',
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

    // 4. Synchronize or create patient booking so Admin and Nurse dashboards immediately receive the authorized visit
    const matchedService = services.find((s) => s.id === recommendedService);
    const serviceTitle = matchedService?.title || 'Saline Infusion Therapy';
    const fee = matchedService?.priceNumber || 629;

    let hasMatchedBooking = false;
    setBookings((prev) =>
      prev.map((b) => {
        const phoneMatch = targetConsult?.patientPhone && b.patientPhone.replace(/\D/g, '').endsWith(targetConsult.patientPhone.replace(/\D/g, '').slice(-10));
        const nameMatch = b.patientName.toLowerCase().trim() === patName.toLowerCase().trim();
        if (phoneMatch || nameMatch) {
          hasMatchedBooking = true;
          const updated: Booking = {
            ...b,
            hasPrescription: true,
            prescriptionIssued: true,
            prescriptionFileName: rxFileName,
            serviceId: recommendedService,
            serviceTitle,
            notes: `${b.notes ? b.notes + ' • ' : ''}Authorized by Dr. Vikramaditya, MD: "${rxText.slice(0, 70)}..."`
          };
          broadcastRealtimeUpdate('BOOKING_UPDATE', updated);
          dbSaveBooking(updated);
          return updated;
        }
        return b;
      })
    );

    if (!hasMatchedBooking && targetConsult) {
      const newBooking: Booking = {
        id: `BK-DOC-${Date.now().toString().slice(-4)}`,
        serviceId: recommendedService,
        serviceTitle,
        patientName: patName,
        patientPhone: targetConsult.patientPhone,
        patientAge: targetConsult.patientAge,
        patientGender: 'Female',
        area: targetConsult.area,
        fullAddress: `${targetConsult.area}, Hyderabad (Doctor Tele-Consult Order)`,
        preferredDate: new Date().toISOString().split('T')[0],
        preferredTime: 'Immediate (Doctor Prescribed)',
        bookingType: 'Instant',
        status: 'Pending',
        hasPrescription: true,
        prescriptionFileName: rxFileName,
        estimatedFee: fee,
        finalFee: fee,
        createdAt: new Date().toISOString(),
        notes: `Doctor Authorized Rx: "${rxText.slice(0, 80)}"`
      };
      await handleCreateBooking(newBooking);
    }
  };

  // Coupon CRUD Handlers for Admin Operations
  const handleCreateCoupon = async (newCouponData: Omit<Coupon, 'id' | 'createdAt' | 'timesUsed'>) => {
    const created = await dbInsertCoupon(newCouponData);
    if (created) {
      setCoupons((prev) => [created, ...prev.filter((c) => c.code !== created.code)]);
      broadcastRealtimeUpdate('COUPON_CREATE', created);
    }
  };

  const handleUpdateCoupon = async (id: string, updates: Partial<Coupon>) => {
    setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    broadcastRealtimeUpdate('COUPON_UPDATE', { id, ...updates });
    await dbUpdateCoupon(id, updates);
  };

  const handleDeleteCoupon = async (id: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    broadcastRealtimeUpdate('COUPON_DELETE', { id });
    await dbDeleteCoupon(id);
  };

  // 1. Bookings CRUD Handlers
  const handleCreateBooking = async (b: Booking) => {
    setBookings((prev) => [b, ...prev]);
    broadcastRealtimeUpdate('BOOKING_CREATE', b);
    await dbInsertBooking(b);
  };
  const handleUpdateBooking = async (id: string, updates: Partial<Booking>) => {
    // If booking is rejected or cancelled, reverse any awarded referral rewards and reject matching lead
    if (updates.status === 'Cancelled' || updates.status === 'Rejected') {
      const targetBooking = bookings.find((b) => b.id === id);
      if (targetBooking) {
        const matchLead = leads.find((l) =>
          l.id === `LEAD-BK-${id}` ||
          (targetBooking.referringNurseId && l.nurseId === targetBooking.referringNurseId &&
            (l.patientPhone === targetBooking.patientPhone || l.patientName === targetBooking.patientName))
        );
        const referringNurseId = targetBooking.referringNurseId || matchLead?.nurseId;
        if (referringNurseId) {
          const wasApproved = matchLead ? (matchLead.status === 'Approved' || matchLead.status === 'Converted') : false;
          const pointsToDeduct = (matchLead && matchLead.pointsAwarded) ? matchLead.pointsAwarded : (wasApproved ? 50 : 0);
          const rupeesToDeduct = (matchLead && matchLead.referralCommissionRupees) ? matchLead.referralCommissionRupees : (wasApproved ? (targetBooking.referralBonusRupees || 0) : 0);

          const reason = updates.rejectionReason || targetBooking.rejectionReason || `Patient booking was ${updates.status.toLowerCase()}`;
          if (matchLead) {
            const rejectedLead: NurseLead = {
              ...matchLead,
              status: 'Rejected',
              pointsAwarded: 0,
              referralCommissionRupees: 0,
              rejectionReason: reason,
              adminNotes: reason
            };
            setLeads((prev) => prev.map((l) => (l.id === matchLead.id ? rejectedLead : l)));
            broadcastRealtimeUpdate('LEAD_UPDATE', rejectedLead);
            await dbUpdateLeadById(matchLead.id, rejectedLead);
          } else {
            const rejectedLead: NurseLead = {
              id: `LEAD-BK-${id}`,
              nurseId: referringNurseId,
              patientName: targetBooking.patientName,
              patientPhone: targetBooking.patientPhone,
              serviceId: targetBooking.serviceId,
              area: targetBooking.area,
              submittedAt: targetBooking.createdAt || new Date().toISOString(),
              status: 'Rejected',
              pointsAwarded: 0,
              referralCommissionRupees: 0,
              rejectionReason: reason,
              adminNotes: reason
            };
            setLeads((prev) => [rejectedLead, ...prev]);
            broadcastRealtimeUpdate('LEAD_UPDATE', rejectedLead);
            await dbSaveLead(rejectedLead);
          }

          if (wasApproved || pointsToDeduct > 0 || rupeesToDeduct > 0) {
            const referringNurse = nurses.find((n) => n.id === referringNurseId);
            if (referringNurse) {
              const updatedNurse: NurseProfile = {
                ...referringNurse,
                pointsEarned: Math.max(0, (referringNurse.pointsEarned || 0) - pointsToDeduct),
                referralEarningsRupees: Math.max(0, (referringNurse.referralEarningsRupees || 0) - rupeesToDeduct),
                convertedLeads: Math.max(0, (referringNurse.convertedLeads || 0) - 1),
                totalReferrals: Math.max(0, (referringNurse.totalReferrals || 0) - 1)
              };
              setNurses((prev) => prev.map((n) => (n.id === updatedNurse.id ? updatedNurse : n)));
              broadcastRealtimeUpdate('NURSE_UPDATE', updatedNurse);
              await dbUpdateNurse(updatedNurse);
            }
          }
        }
      }
    }

    const targetBooking = bookings.find((b) => b.id === id);
    if (!targetBooking) return;

    if (updates.status === 'Completed' && targetBooking.status !== 'Completed') {
      const assignedNurseId = targetBooking.assignedNurseId || updates.assignedNurseId;
      const procedure = services.find((s) => s.id === targetBooking.serviceId);
      const fee = Number(targetBooking.finalFee !== undefined ? targetBooking.finalFee : (targetBooking.estimatedFee || procedure?.priceNumber || 800));

      // 1. Credit 70% service charge to the assigned nurse who performed and completed the visit
      if (assignedNurseId) {
        const assignedNurse = nurses.find((n) => n.id === assignedNurseId);
        const earningsToAdd = Math.round(fee * 0.70);
        if (assignedNurse) {
          const updatedNurse: NurseProfile = {
            ...assignedNurse,
            earningsPending: (assignedNurse.earningsPending || 0) + earningsToAdd,
            totalEarningsRupees: ((assignedNurse.earningsPaid || 0) + (assignedNurse.earningsPending || 0) + earningsToAdd),
            completedVisits: (assignedNurse.completedVisits || 0) + 1
          };
          setNurses((prev) => {
            const next = prev.map((n) => (n.id === updatedNurse.id ? updatedNurse : n));
            try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch { }
            return next;
          });
          broadcastRealtimeUpdate('NURSE_UPDATE', updatedNurse);
          await dbUpdateNurse(updatedNurse);
        }
      }

      // 2. Credit 50 points + 10% service commission to the Referring Nurse who referred this patient lead!
      const matchLead = leads.find((l) =>
        l.id === `LEAD-BK-${id}` ||
        l.id === `RP-${id.replace(/^BK-/, '')}` ||
        (targetBooking.referringNurseId && l.nurseId === targetBooking.referringNurseId &&
          (l.patientPhone === targetBooking.patientPhone || l.patientName === targetBooking.patientName))
      );
      const refNurseId = targetBooking.referringNurseId || matchLead?.nurseId;

      if (refNurseId && (!matchLead || matchLead.referralType !== 'nurse')) {
        const referringNurse = nurses.find((n) => n.id === refNurseId);
        if (referringNurse) {
          const refCommission = Math.round(fee * 0.10);
          const refPoints = 50;

          // Prevent double awarding if booking was already completed
          if (!matchLead || matchLead.status !== 'Converted') {
            const updatedRefNurse: NurseProfile = {
              ...referringNurse,
              pointsEarned: (referringNurse.pointsEarned || 0) + refPoints,
              referralEarningsRupees: (referringNurse.referralEarningsRupees || 0) + refCommission,
              totalEarningsRupees: ((referringNurse.earningsPaid || 0) + (referringNurse.earningsPending || 0) + refCommission),
              convertedLeads: (referringNurse.convertedLeads || 0) + 1
            };

            setNurses((prev) => {
              const next = prev.map((n) => (n.id === updatedRefNurse.id ? updatedRefNurse : n));
              try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch { }
              return next;
            });
            broadcastRealtimeUpdate('NURSE_UPDATE', updatedRefNurse);
            await dbUpdateNurse(updatedRefNurse);

            if (matchLead) {
              const convertedLead: NurseLead = {
                ...matchLead,
                status: 'Converted',
                pointsAwarded: refPoints,
                referralCommissionRupees: refCommission,
                adminNotes: `Patient visit completed by assigned nurse. +${refPoints} points and ₹${refCommission} (10% fee) credited to referring nurse ${referringNurse.name}.`
              };
              setLeads((prev) => prev.map((l) => (l.id === matchLead.id ? convertedLead : l)));
              broadcastRealtimeUpdate('LEAD_UPDATE', convertedLead);
              await dbUpdateLeadById(matchLead.id, convertedLead);
            }
          }
        }
      }
    }

    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    broadcastRealtimeUpdate('BOOKING_UPDATE', { id, ...updates });
    await dbUpdateBooking(id, updates);
  };
  const handleDeleteBooking = async (id: string) => {
    const bookingToDelete = bookings.find((b) => b.id === id);
    const twinBookings = bookingToDelete
      ? bookings.filter((b) => b.id !== id && areBookingsDuplicate(b, bookingToDelete))
      : [];

    const idsToDelete = new Set<string>([id, ...twinBookings.map((b) => b.id)]);

    if (bookingToDelete) {
      const bPhone10 = normalizePhone10(bookingToDelete.patientPhone);
      const bName = (bookingToDelete.patientName || '').toLowerCase().trim();

      const matchLead = leads.find((l) =>
        l.id === `LEAD-BK-${id}` ||
        idsToDelete.has(`BK-${(l.id.replace(/\D/g, '') || l.id).slice(-6)}`) ||
        idsToDelete.has(`BK-${(l.id.replace(/\D/g, '') || l.id).slice(-4)}`) ||
        (bPhone10 && normalizePhone10(l.patientPhone) === bPhone10) ||
        (bookingToDelete.referringNurseId && l.nurseId === bookingToDelete.referringNurseId &&
          bName && l.patientName && l.patientName.toLowerCase().trim() === bName)
      );
      const referringNurseId = bookingToDelete.referringNurseId || matchLead?.nurseId;
      if (referringNurseId) {
        const referringNurse = nurses.find((n) => n.id === referringNurseId);
        const wasApproved = matchLead ? (matchLead.status === 'Approved' || matchLead.status === 'Converted') : false;
        const pointsToDeduct = (matchLead && matchLead.pointsAwarded) ? matchLead.pointsAwarded : (wasApproved ? 50 : 0);
        const rupeesToDeduct = (matchLead && matchLead.referralCommissionRupees) ? matchLead.referralCommissionRupees : (wasApproved ? (bookingToDelete.referralBonusRupees || 0) : 0);

        if (referringNurse && (pointsToDeduct > 0 || rupeesToDeduct > 0 || wasApproved)) {
          const updatedNurse: NurseProfile = {
            ...referringNurse,
            pointsEarned: Math.max(0, (referringNurse.pointsEarned || 0) - pointsToDeduct),
            referralEarningsRupees: Math.max(0, (referringNurse.referralEarningsRupees || 0) - rupeesToDeduct),
            convertedLeads: Math.max(0, (referringNurse.convertedLeads || 0) - 1),
            totalReferrals: Math.max(0, (referringNurse.totalReferrals || 0) - 1)
          };
          setNurses((prev) => {
            const next = prev.map((n) => (n.id === updatedNurse.id ? updatedNurse : n));
            try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch { }
            return next;
          });
          broadcastRealtimeUpdate('NURSE_UPDATE', updatedNurse);
          await dbUpdateNurse(updatedNurse);
        }

        if (matchLead) {
          setLeads((prev) => prev.filter((l) => l.id !== matchLead.id));
          broadcastRealtimeUpdate('LEAD_DELETE', { id: matchLead.id });
          await dbDeleteLead(matchLead.id);
        }
      }
    }

    setBookings((prev) => {
      const next = prev.filter((b) => !idsToDelete.has(b.id));
      try { localStorage.setItem('xn_cached_bookings', JSON.stringify(next)); } catch { }
      return next;
    });

    for (const bId of idsToDelete) {
      broadcastRealtimeUpdate('BOOKING_DELETE', { id: bId });
      await dbDeleteBooking(bId);
    }
  };

  // 2. Nurses CRUD Handlers
  const handleCreateNurse = async (n: NurseProfile) => {
    setNurses((prev) => [...prev, n]);
    broadcastRealtimeUpdate('NURSE_CREATE', n);
    await dbInsertNurse(n);
  };
  const handleUpdateNurseRecord = async (id: string, updates: Partial<NurseProfile>) => {
    setNurses((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, ...updates } : n));
      try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch { }
      return next;
    });
    setAppUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id === id) {
          return {
            ...u,
            name: updates.name ?? u.name,
            phone: updates.phone ?? u.phone,
            email: updates.email ?? u.email,
            designation: updates.qualification ?? u.designation,
            serviceArea: updates.serviceArea ?? u.serviceArea,
          };
        }
        return u;
      });
      try { localStorage.setItem('xn_cached_app_users', JSON.stringify(next)); } catch { }
      return next;
    });
    setAuthUser((prev) => {
      if (prev && prev.id === id) {
        const next = {
          ...prev,
          name: updates.name ?? prev.name,
          phone: updates.phone ?? prev.phone,
          email: updates.email ?? prev.email,
          designation: updates.qualification ?? prev.designation,
          serviceArea: updates.serviceArea ?? prev.serviceArea,
        };
        try { localStorage.setItem('xn_auth_user', JSON.stringify(next)); } catch { }
        return next;
      }
      return prev;
    });
    broadcastRealtimeUpdate('NURSE_UPDATE', { id, ...updates });
    await dbUpdateNurseById(id, updates);
  };
  const handleDeleteNurse = async (id: string) => {
    const nurseToDelete = nurses.find((n) => n.id === id);
    if (nurseToDelete) {
      // Find matching lead for referred nurse
      const matchLead = leads.find((l) =>
        (nurseToDelete.referredByNurseId && l.nurseId === nurseToDelete.referredByNurseId) ||
        (l.referredNursePhone === nurseToDelete.phone || l.patientPhone === nurseToDelete.phone || l.referredNurseName === nurseToDelete.name)
      );
      const referrerId = nurseToDelete.referredByNurseId || matchLead?.nurseId;

      if (referrerId) {
        const referrer = nurses.find((rn) => rn.id === referrerId);
        const wasApproved = nurseToDelete.certificateVerified || (matchLead && (matchLead.status === 'Approved' || matchLead.status === 'Converted'));
        const pointsToDeduct = matchLead?.pointsAwarded || (wasApproved ? 50 : 0);

        if (referrer && (pointsToDeduct > 0 || wasApproved)) {
          const updatedReferrer: NurseProfile = {
            ...referrer,
            pointsEarned: Math.max(0, (referrer.pointsEarned || 0) - pointsToDeduct),
            convertedLeads: Math.max(0, (referrer.convertedLeads || 0) - 1),
            totalReferrals: Math.max(0, (referrer.totalReferrals || 0) - 1)
          };
          setNurses((prev) => prev.map((n) => (n.id === updatedReferrer.id ? updatedReferrer : n)));
          broadcastRealtimeUpdate('NURSE_UPDATE', updatedReferrer);
          await dbUpdateNurse(updatedReferrer);
        }

        if (matchLead) {
          setLeads((prev) => prev.filter((l) => l.id !== matchLead.id));
          broadcastRealtimeUpdate('LEAD_DELETE', { id: matchLead.id });
          await dbDeleteLead(matchLead.id);
        }
      }
    }

    setNurses((prev) => {
      const next = prev.filter((n) => n.id !== id);
      try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch { }
      return next;
    });
    setAppUsers((prev) => {
      const next = prev.filter((u) => u.id !== id);
      try { localStorage.setItem('xn_cached_app_users', JSON.stringify(next)); } catch { }
      return next;
    });

    // If currently logged-in user is this deleted nurse, immediately evict session!
    setAuthUser((prev) => {
      if (prev && (prev.id === id || (nurseToDelete && (prev.phone === nurseToDelete.phone || prev.email === nurseToDelete.email)))) {
        try { localStorage.removeItem('xn_auth_user'); } catch {}
        try { localStorage.removeItem('xn_active_nurse_id'); } catch {}
        if (currentPath === '/nurse') {
          setTimeout(() => navigate('/login?portal=nurse'), 50);
        }
        return null;
      }
      return prev;
    });

    broadcastRealtimeUpdate('NURSE_DELETE', { id });
    await dbDeleteNurse(id);
  };

  // 3. Leads CRUD Handlers
  const handleCreateLead = async (l: NurseLead) => {
    setLeads((prev) => [l, ...prev]);
    broadcastRealtimeUpdate('LEAD_CREATE', l);
    await dbInsertLead(l);
  };
  const handleUpdateLead = async (id: string, updates: Partial<NurseLead>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
    broadcastRealtimeUpdate('LEAD_UPDATE', { id, ...updates });
    await dbUpdateLeadById(id, updates);
  };
  const handleDeleteLead = async (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (lead) {
      const referringNurse = nurses.find((n) => n.id === lead.nurseId);
      if (referringNurse) {
        const wasApproved = lead.status === 'Approved' || lead.status === 'Converted' || (lead.pointsAwarded && lead.pointsAwarded > 0);
        const pointsToDeduct = wasApproved ? (lead.pointsAwarded || 50) : 0;
        const rupeesToDeduct = wasApproved ? (lead.referralCommissionRupees || 0) : 0;

        const updatedNurse: NurseProfile = {
          ...referringNurse,
          pointsEarned: Math.max(0, (referringNurse.pointsEarned || 0) - pointsToDeduct),
          referralEarningsRupees: Math.max(0, (referringNurse.referralEarningsRupees || 0) - rupeesToDeduct),
          convertedLeads: Math.max(0, (referringNurse.convertedLeads || 0) - (wasApproved ? 1 : 0)),
          totalReferrals: Math.max(0, (referringNurse.totalReferrals || 0) - 1)
        };
        setNurses((prev) => {
          const next = prev.map((n) => (n.id === updatedNurse.id ? updatedNurse : n));
          try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch { }
          return next;
        });
        broadcastRealtimeUpdate('NURSE_UPDATE', updatedNurse);
        await dbUpdateNurse(updatedNurse);
      }
    }

    setLeads((prev) => {
      const next = prev.filter((l) => l.id !== id);
      try { localStorage.setItem('xn_cached_leads', JSON.stringify(next)); } catch { }
      return next;
    });
    broadcastRealtimeUpdate('LEAD_DELETE', { id });
    await dbDeleteLead(id);
  };

  // 4. Services CRUD Handlers
  const handleCreateService = async (s: ServiceItem) => {
    setServices((prev) => [...prev, s]);
    broadcastRealtimeUpdate('SERVICE_CREATE', s);
    await dbInsertService(s);
  };
  const handleUpdateService = async (id: string, updates: Partial<ServiceItem>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    broadcastRealtimeUpdate('SERVICE_UPDATE', { id, ...updates });
    await dbUpdateServiceById(id, updates);
  };
  const handleDeleteService = async (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    broadcastRealtimeUpdate('SERVICE_DELETE', { id });
    await dbDeleteService(id);
  };

  // 5. Consultations CRUD Handlers
  const handleCreateConsultation = async (c: DoctorConsultation) => {
    setConsultations((prev) => [c, ...prev]);
    broadcastRealtimeUpdate('CONSULTATION_CREATE', c);
    await dbInsertConsultation(c);
  };
  const handleUpdateConsultation = async (id: string, updates: Partial<DoctorConsultation>) => {
    setConsultations((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    broadcastRealtimeUpdate('CONSULTATION_UPDATE', { id, ...updates });
    await dbUpdateConsultationById(id, updates);
  };
  const handleDeleteConsultation = async (id: string) => {
    setConsultations((prev) => prev.filter((c) => c.id !== id));
    broadcastRealtimeUpdate('CONSULTATION_DELETE', { id });
    await dbDeleteConsultation(id);
  };

  // 6. App Users CRUD Handlers
  const handleCreateAppUser = async (u: AppUser) => {
    setAppUsers((prev) => [...prev, u]);
    broadcastRealtimeUpdate('APP_USER_CREATE', u);
    await dbInsertAppUser(u);
  };
  const handleUpdateAppUser = async (id: string, updates: Partial<AppUser>) => {
    setAppUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    broadcastRealtimeUpdate('APP_USER_UPDATE', { id, ...updates });
    await dbUpdateAppUserById(id, updates);
  };
  const handleDeleteAppUser = async (id: string) => {
    setAppUsers((prev) => {
      const next = prev.filter((u) => u.id !== id);
      try { localStorage.setItem('xn_cached_app_users', JSON.stringify(next)); } catch { }
      return next;
    });
    setNurses((prev) => {
      const next = prev.filter((n) => n.id !== id);
      try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch { }
      return next;
    });
    broadcastRealtimeUpdate('APP_USER_DELETE', { id });
    await dbDeleteAppUser(id);
  };

  // Batch Delete Handlers for Admin Dashboard Selected & Delete All
  const handleDeleteMultipleBookings = async (ids: string[]) => {
    const idSet = new Set(ids);
    const bookingsToDelete = bookings.filter((b) => idSet.has(b.id));

    // Also include any duplicate twins of the selected bookings
    bookingsToDelete.forEach((b) => {
      bookings.filter((cand) => areBookingsDuplicate(b, cand)).forEach((cand) => idSet.add(cand.id));
    });

    const leadsToDeleteIds: string[] = [];
    bookingsToDelete.forEach((b) => {
      const bPhone10 = normalizePhone10(b.patientPhone);
      const bName = (b.patientName || '').toLowerCase().trim();

      const matchLead = leads.find((l) =>
        l.id === `LEAD-BK-${b.id}` ||
        idSet.has(`BK-${(l.id.replace(/\D/g, '') || l.id).slice(-6)}`) ||
        idSet.has(`BK-${(l.id.replace(/\D/g, '') || l.id).slice(-4)}`) ||
        (bPhone10 && normalizePhone10(l.patientPhone) === bPhone10) ||
        (b.referringNurseId && l.nurseId === b.referringNurseId &&
          bName && l.patientName && l.patientName.toLowerCase().trim() === bName)
      );
      const referringNurseId = b.referringNurseId || matchLead?.nurseId;
      if (referringNurseId) {
        const referringNurse = nurses.find((n) => n.id === referringNurseId);
        const wasApproved = matchLead ? (matchLead.status === 'Approved' || matchLead.status === 'Converted') : false;
        const pointsToDeduct = (matchLead && matchLead.pointsAwarded) ? matchLead.pointsAwarded : (wasApproved ? 50 : 0);
        const rupeesToDeduct = (matchLead && matchLead.referralCommissionRupees) ? matchLead.referralCommissionRupees : (wasApproved ? (b.referralBonusRupees || 0) : 0);

        if (referringNurse && (pointsToDeduct > 0 || rupeesToDeduct > 0 || wasApproved)) {
          const updatedNurse: NurseProfile = {
            ...referringNurse,
            pointsEarned: Math.max(0, (referringNurse.pointsEarned || 0) - pointsToDeduct),
            referralEarningsRupees: Math.max(0, (referringNurse.referralEarningsRupees || 0) - rupeesToDeduct),
            convertedLeads: Math.max(0, (referringNurse.convertedLeads || 0) - 1),
            totalReferrals: Math.max(0, (referringNurse.totalReferrals || 0) - 1)
          };
          setNurses((prev) => prev.map((n) => (n.id === updatedNurse.id ? updatedNurse : n)));
          broadcastRealtimeUpdate('NURSE_UPDATE', updatedNurse);
          dbUpdateNurse(updatedNurse);
        }

        if (matchLead) {
          leadsToDeleteIds.push(matchLead.id);
        }
      }
    });

    if (leadsToDeleteIds.length > 0) {
      const leadIdSet = new Set(leadsToDeleteIds);
      setLeads((prev) => {
        const next = prev.filter((l) => !leadIdSet.has(l.id));
        try { localStorage.setItem('xn_cached_leads', JSON.stringify(next)); } catch { }
        return next;
      });
      leadsToDeleteIds.forEach((lid) => broadcastRealtimeUpdate('LEAD_DELETE', { id: lid }));
      await dbDeleteMultipleLeads(leadsToDeleteIds);
    }

    const allIdsToDelete = Array.from(idSet);
    setBookings((prev) => {
      const next = prev.filter((b) => !idSet.has(b.id));
      try { localStorage.setItem('xn_cached_bookings', JSON.stringify(next)); } catch { }
      return next;
    });
    allIdsToDelete.forEach((id) => broadcastRealtimeUpdate('BOOKING_DELETE', { id }));
    await dbDeleteMultipleBookings(allIdsToDelete);
  };

  const handleDeleteMultipleNurses = async (ids: string[]) => {
    const idSet = new Set(ids);
    const nursesToDelete = nurses.filter((n) => idSet.has(n.id));

    const leadsToDeleteIds: string[] = [];
    nursesToDelete.forEach((nurseToDelete) => {
      const matchLead = leads.find((l) =>
        (nurseToDelete.referredByNurseId && l.nurseId === nurseToDelete.referredByNurseId) ||
        (l.referredNursePhone === nurseToDelete.phone || l.patientPhone === nurseToDelete.phone || l.referredNurseName === nurseToDelete.name)
      );
      const referrerId = nurseToDelete.referredByNurseId || matchLead?.nurseId;

      if (referrerId) {
        const referrer = nurses.find((rn) => rn.id === referrerId);
        const wasApproved = nurseToDelete.certificateVerified || (matchLead && (matchLead.status === 'Approved' || matchLead.status === 'Converted'));
        const pointsToDeduct = matchLead?.pointsAwarded || (wasApproved ? 50 : 0);

        if (referrer && (pointsToDeduct > 0 || wasApproved)) {
          const updatedReferrer: NurseProfile = {
            ...referrer,
            pointsEarned: Math.max(0, (referrer.pointsEarned || 0) - pointsToDeduct),
            convertedLeads: Math.max(0, (referrer.convertedLeads || 0) - 1),
            totalReferrals: Math.max(0, (referrer.totalReferrals || 0) - 1)
          };
          setNurses((prev) => prev.map((n) => (n.id === updatedReferrer.id ? updatedReferrer : n)));
          broadcastRealtimeUpdate('NURSE_UPDATE', updatedReferrer);
          dbUpdateNurse(updatedReferrer);
        }

        if (matchLead) {
          leadsToDeleteIds.push(matchLead.id);
        }
      }
    });

    if (leadsToDeleteIds.length > 0) {
      const leadIdSet = new Set(leadsToDeleteIds);
      setLeads((prev) => {
        const next = prev.filter((l) => !leadIdSet.has(l.id));
        try { localStorage.setItem('xn_cached_leads', JSON.stringify(next)); } catch { }
        return next;
      });
      leadsToDeleteIds.forEach((lid) => broadcastRealtimeUpdate('LEAD_DELETE', { id: lid }));
      await dbDeleteMultipleLeads(leadsToDeleteIds);
    }

    setNurses((prev) => {
      const next = prev.filter((n) => !idSet.has(n.id));
      try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch { }
      return next;
    });
    setAppUsers((prev) => {
      const next = prev.filter((u) => !idSet.has(u.id));
      try { localStorage.setItem('xn_cached_app_users', JSON.stringify(next)); } catch { }
      return next;
    });

    // If currently logged-in user is among the deleted nurses, immediately evict session!
    setAuthUser((prev) => {
      if (prev && idSet.has(prev.id)) {
        try { localStorage.removeItem('xn_auth_user'); } catch {}
        try { localStorage.removeItem('xn_active_nurse_id'); } catch {}
        if (currentPath === '/nurse') {
          setTimeout(() => navigate('/login?portal=nurse'), 50);
        }
        return null;
      }
      return prev;
    });

    ids.forEach((id) => broadcastRealtimeUpdate('NURSE_DELETE', { id }));
    await dbDeleteMultipleNurses(ids);
  };

  const handleDeleteMultipleLeads = async (ids: string[]) => {
    const idSet = new Set(ids);
    const leadsToDelete = leads.filter((l) => idSet.has(l.id));

    leadsToDelete.forEach((lead) => {
      const referringNurse = nurses.find((n) => n.id === lead.nurseId);
      if (referringNurse) {
        const wasApproved = lead.status === 'Approved' || lead.status === 'Converted' || (lead.pointsAwarded && lead.pointsAwarded > 0);
        const pointsToDeduct = wasApproved ? (lead.pointsAwarded || 50) : 0;
        const rupeesToDeduct = wasApproved ? (lead.referralCommissionRupees || 0) : 0;

        const updatedNurse: NurseProfile = {
          ...referringNurse,
          pointsEarned: Math.max(0, (referringNurse.pointsEarned || 0) - pointsToDeduct),
          referralEarningsRupees: Math.max(0, (referringNurse.referralEarningsRupees || 0) - rupeesToDeduct),
          convertedLeads: Math.max(0, (referringNurse.convertedLeads || 0) - (wasApproved ? 1 : 0)),
          totalReferrals: Math.max(0, (referringNurse.totalReferrals || 0) - 1)
        };
        setNurses((prev) => prev.map((n) => (n.id === updatedNurse.id ? updatedNurse : n)));
        broadcastRealtimeUpdate('NURSE_UPDATE', updatedNurse);
        dbUpdateNurse(updatedNurse);
      }
    });

    setLeads((prev) => {
      const next = prev.filter((l) => !idSet.has(l.id));
      try { localStorage.setItem('xn_cached_leads', JSON.stringify(next)); } catch { }
      return next;
    });
    ids.forEach((id) => broadcastRealtimeUpdate('LEAD_DELETE', { id }));
    await dbDeleteMultipleLeads(ids);
  };

  const handleDeleteMultipleServices = async (ids: string[]) => {
    const idSet = new Set(ids);
    setServices((prev) => {
      const next = prev.filter((s) => !idSet.has(s.id));
      try { localStorage.setItem('xn_cached_services', JSON.stringify(next)); } catch { }
      return next;
    });
    ids.forEach((id) => broadcastRealtimeUpdate('SERVICE_DELETE', { id }));
    await dbDeleteMultipleServices(ids);
  };

  const handleDeleteMultipleConsultations = async (ids: string[]) => {
    const idSet = new Set(ids);
    setConsultations((prev) => {
      const next = prev.filter((c) => !idSet.has(c.id));
      try { localStorage.setItem('xn_cached_consultations', JSON.stringify(next)); } catch { }
      return next;
    });
    ids.forEach((id) => broadcastRealtimeUpdate('CONSULTATION_DELETE', { id }));
    await dbDeleteMultipleConsultations(ids);
  };

  const handleDeleteMultipleCoupons = async (ids: string[]) => {
    const idSet = new Set(ids);
    setCoupons((prev) => {
      const next = prev.filter((c) => !idSet.has(c.id));
      try { localStorage.setItem('xn_cached_coupons', JSON.stringify(next)); } catch { }
      return next;
    });
    ids.forEach((id) => broadcastRealtimeUpdate('COUPON_DELETE', { id }));
    await dbDeleteMultipleCoupons(ids);
  };

  const handleDeleteMultipleAppUsers = async (ids: string[]) => {
    const idSet = new Set(ids);
    setAppUsers((prev) => {
      const next = prev.filter((u) => !idSet.has(u.id));
      try { localStorage.setItem('xn_cached_app_users', JSON.stringify(next)); } catch { }
      return next;
    });
    setNurses((prev) => {
      const next = prev.filter((n) => !idSet.has(n.id));
      try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch { }
      return next;
    });
    ids.forEach((id) => broadcastRealtimeUpdate('APP_USER_DELETE', { id }));
    await dbDeleteMultipleAppUsers(ids);
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

      {/* Main Routed Views with Mobile Drag-Scroll Pull to Refresh */}
      <PullToRefresh onRefresh={async () => { await refreshAllDataFromDb(true); }}>
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
            <AuthGuard user={authUser} requiredRole="nurse" onNavigate={navigate}>
              <NurseDashboard
                currentNurse={activeNurse}
                allNurses={nurses}
                onSelectNurse={(n) => setActiveNurseId(n.id)}
                bookings={deduplicateBookings(bookings)}
                leads={deduplicateLeads(leads)}
                services={services}
                onAddNewLead={handleAddNewLead}
                onUpdateNurse={handleUpdateNurse}
                onReassignBooking={handleReassignBooking}
                onUpdateBooking={handleUpdateBooking}
                onRefreshData={() => refreshAllDataFromDb(true)}
              />
            </AuthGuard>
          )}

          {/* Route: /admin -> Admin Operations & Dispatch */}
          {currentPath === '/admin' && (
            <AuthGuard user={authUser} requiredRole="admin" onNavigate={navigate}>
              <AdminDashboard
                bookings={deduplicateBookings(bookings)}
                nurses={nurses}
                leads={deduplicateLeads(leads)}
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
                onDeleteMultipleBookings={handleDeleteMultipleBookings}
                onDeleteMultipleNurses={handleDeleteMultipleNurses}
                onDeleteMultipleLeads={handleDeleteMultipleLeads}
                onDeleteMultipleServices={handleDeleteMultipleServices}
                onDeleteMultipleConsultations={handleDeleteMultipleConsultations}
                onDeleteMultipleCoupons={handleDeleteMultipleCoupons}
                onDeleteMultipleAppUsers={handleDeleteMultipleAppUsers}
                onRefreshData={() => refreshAllDataFromDb(true)}
              />
            </AuthGuard>
          )}

          {/* Route: /doctor -> Doctor Consultation Panel */}
          {currentPath === '/doctor' && (
            <AuthGuard user={authUser} requiredRole="doctor" onNavigate={navigate}>
              <DoctorDashboard
                consultations={consultations}
                services={services}
                onIssuePrescription={handleDoctorIssueRx}
                onAddNewConsultation={handleCreateConsultation}
              />
            </AuthGuard>
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
              onLoginSuccess={handleLoginSuccess}
              nurses={nurses}
              onRefreshNurses={async () => {
                const [remoteNurses, remoteLeads] = await Promise.all([
                  dbFetchNurses(),
                  dbFetchLeads()
                ]);
                if (remoteNurses) setNurses(remoteNurses);
                if (remoteLeads) setLeads(remoteLeads);
              }}
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
      </PullToRefresh>

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

      {/* Floating 24/7 AI Clinical Assistant - Only on Patient Facing Routes */}
      {(currentPath === '/' || currentPath === '' || currentPath === '/empty') && !isBookingOpen && !isQrModalOpen && !activePolicy && (
        <AiAssistant
          onOpenBooking={() => setIsBookingOpen(true)}
          onOpenDoctorConsult={() => {
            setPreSelectedServiceId('doctor-consult');
            setIsBookingOpen(true);
          }}
        />
      )}

      {/* Corporate Footer with Working Modals & Routes */}
      <Footer
        onOpenBooking={() => setIsBookingOpen(true)}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        onNavigate={navigate}
        onOpenPolicy={setActivePolicy}
      />

      {/* Mobile Sticky Booking Bar - Only on Patient Facing Routes */}
      {(currentPath === '/' || currentPath === '' || currentPath === '/empty') && !isBookingOpen && !isQrModalOpen && !activePolicy && (
        <MobileBottomBar
          onOpenBooking={() => setIsBookingOpen(true)}
        />
      )}
    </div>
  );
};
export default App;
