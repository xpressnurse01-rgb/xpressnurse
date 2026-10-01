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
  SEED_APP_USERS,
  BASELINE_NURSES,
  BASELINE_BOOKINGS,
  BASELINE_LEADS,
  BASELINE_COUPONS,
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
    } catch {}
    return [];
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const cached = localStorage.getItem('xn_cached_bookings');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return BASELINE_BOOKINGS;
  });

  const [nurses, setNurses] = useState<NurseProfile[]>(() => {
    try {
      const cached = localStorage.getItem('xn_cached_nurses');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return BASELINE_NURSES;
  });

  const [leads, setLeads] = useState<NurseLead[]>(() => {
    try {
      const cached = localStorage.getItem('xn_cached_leads');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return BASELINE_LEADS;
  });

  const [consultations, setConsultations] = useState<DoctorConsultation[]>(() => {
    try {
      const cached = localStorage.getItem('xn_cached_consultations');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [coupons, setCoupons] = useState<Coupon[]>(() => {
    try {
      const cached = localStorage.getItem('xn_cached_coupons');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return BASELINE_COUPONS;
  });

  const [appUsers, setAppUsers] = useState<AppUser[]>(() => {
    try {
      const cached = localStorage.getItem('xn_cached_app_users');
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return SEED_APP_USERS;
  });

  const [dbLoading, setDbLoading] = useState(false);

  // Synchronize collections to localStorage on every change
  useEffect(() => {
    try { localStorage.setItem('xn_cached_services', JSON.stringify(services)); } catch {}
  }, [services]);

  useEffect(() => {
    try { localStorage.setItem('xn_cached_bookings', JSON.stringify(bookings)); } catch {}
  }, [bookings]);

  useEffect(() => {
    try { localStorage.setItem('xn_cached_nurses', JSON.stringify(nurses)); } catch {}
  }, [nurses]);

  useEffect(() => {
    try { localStorage.setItem('xn_cached_leads', JSON.stringify(leads)); } catch {}
  }, [leads]);

  useEffect(() => {
    try { localStorage.setItem('xn_cached_consultations', JSON.stringify(consultations)); } catch {}
  }, [consultations]);

  useEffect(() => {
    try { localStorage.setItem('xn_cached_coupons', JSON.stringify(coupons)); } catch {}
  }, [coupons]);

  useEffect(() => {
    try { localStorage.setItem('xn_cached_app_users', JSON.stringify(appUsers)); } catch {}
  }, [appUsers]);

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
    } catch {}
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
    referralEarningsRupees: 2400,
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
      status: 'Active' as const,
      totalLeads: 0,
      convertedLeads: 0,
      totalReferrals: 0,
      pointsEarned: 0,
      referralEarningsRupees: 0,
      rating: 4.9,
      certificateVerified: true
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
          // If authUser is logged in as a nurse, sync active nurse ID
          const savedAuth = localStorage.getItem('xn_auth_user');
          if (savedAuth) {
            try {
              const u = JSON.parse(savedAuth);
              if (u.role === 'nurse') {
                const found = remoteNurses.find(
                  (n) => n.id === u.id || (n.email && n.email.toLowerCase() === (u.email || u.identifier || '').toLowerCase()) || (n.phone && n.phone.replace(/\D/g, '') === (u.phone || '').replace(/\D/g, ''))
                );
                if (found) {
                  setActiveNurseId(found.id);
                  localStorage.setItem('xn_active_nurse_id', found.id);
                }
              }
            } catch {}
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
    } catch {}
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('xn_realtime_sync_event', JSON.stringify(payload));
      }
    } catch {}
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
        setBookings((prev) => {
          if (prev.length === remoteBookings.length && JSON.stringify(prev) === JSON.stringify(remoteBookings)) {
            return prev;
          }
          return remoteBookings;
        });
      }
      if (remoteNurses !== null) {
        setNurses((prev) => {
          if (prev.length === remoteNurses.length && JSON.stringify(prev) === JSON.stringify(remoteNurses)) {
            return prev;
          }
          return remoteNurses;
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
    } catch {}

    // 2. Storage event listener (fires across all tabs/windows in the browser)
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'xn_realtime_sync_event' && e.newValue) {
        try {
          const { type, data } = JSON.parse(e.newValue);
          handleSyncEvent(type, data);
        } catch {}
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
                bookingType: raw.booking_type || 'instant',
                scheduledSlot: raw.scheduled_slot,
                rejectionReason: raw.rejection_reason || undefined
              };
              const exists = prev.some((b) => b.id === mapped.id);
              return exists ? prev.map((b) => (b.id === mapped.id ? mapped : b)) : [mapped, ...prev];
            });
            const fresh = await dbFetchBookings();
            if (fresh && fresh.length > 0) setBookings(fresh);
          } else if (payload.eventType === 'DELETE') {
            const delId = (payload.old as any)?.id;
            if (delId) {
              setBookings((prev) => prev.filter((b) => b.id !== delId));
            } else {
              const fresh = await dbFetchBookings();
              if (fresh) setBookings(fresh);
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
            const fresh = await dbFetchNurses();
            if (fresh && fresh.length > 0) setNurses(fresh);
          } else if (payload.eventType === 'DELETE') {
            const delId = (payload.old as any)?.id;
            if (delId) {
              setNurses((prev) => prev.filter((n) => n.id !== delId));
            } else {
              const fresh = await dbFetchNurses();
              if (fresh) setNurses(fresh);
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
            const fresh = await dbFetchLeads();
            if (fresh && fresh.length > 0) setLeads(fresh);
          } else if (payload.eventType === 'DELETE') {
            const delId = (payload.old as any)?.id;
            if (delId) {
              setLeads((prev) => prev.filter((l) => l.id !== delId));
            } else {
              const fresh = await dbFetchLeads();
              if (fresh) setLeads(fresh);
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
            const fresh = await dbFetchConsultations();
            if (fresh && fresh.length > 0) setConsultations(fresh);
          } else if (payload.eventType === 'DELETE') {
            const delId = (payload.old as any)?.id;
            if (delId) {
              setConsultations((prev) => prev.filter((c) => c.id !== delId));
            } else {
              const fresh = await dbFetchConsultations();
              if (fresh) setConsultations(fresh);
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
            } else {
              const fresh = await dbFetchServices();
              if (fresh) setServices(fresh);
            }
          } else {
            const fresh = await dbFetchServices();
            if (fresh && fresh.length > 0) setServices(fresh);
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
            } else {
              const fresh = await dbFetchCoupons();
              if (fresh) setCoupons(fresh);
            }
          } else {
            const fresh = await dbFetchCoupons();
            if (fresh && fresh.length > 0) setCoupons(fresh);
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
    broadcastRealtimeUpdate('BOOKING_CREATE', finalizedBooking);
    dbSaveBooking(finalizedBooking);
  };

  // Handler: Nurse submits a lead (Direct to Admin - NOT auto-assigned to any nurse)
  const handleAddNewLead = (newLead: NurseLead) => {
    // Lead enters "Pending Approval" state directly for Admin review; NOT assigned to any nurse
    const pendingLead: NurseLead = {
      ...newLead,
      assignedNurseId: undefined, // Explicitly not assigned to any nurse; Admin will decide
      status: 'Pending Approval',
      pointsAwarded: 50,
      referralCommissionRupees: 0
    };

    setLeads((prev) => [pendingLead, ...prev]);
    broadcastRealtimeUpdate('LEAD_CREATE', pendingLead);
    dbSaveLead(pendingLead);

    // Increment nurse's total submitted leads / referrals counter
    const referringNurse = nurses.find((n) => n.id === newLead.nurseId);
    if (referringNurse) {
      const updatedReferringNurse: NurseProfile = {
        ...referringNurse,
        totalLeads: referringNurse.totalLeads + 1,
        totalReferrals: (referringNurse.totalReferrals || 0) + 1,
        earningsPending: referringNurse.earningsPending || 0
      };
      setNurses((prev) => prev.map((n) => (n.id === updatedReferringNurse.id ? updatedReferringNurse : n)));
      broadcastRealtimeUpdate('NURSE_UPDATE', updatedReferringNurse);
      dbUpdateNurse(updatedReferringNurse);
    }
  };

  // Handler: Admin Approves Lead & awards strictly 50 Reward Points
  const handleAdminApproveLead = async (
    leadId: string,
    pointsAwarded: number = 50,
    referralRupees: number = 0,
    adminNotes?: string
  ) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const pointsToCredit = pointsAwarded > 0 ? pointsAwarded : 50;

    const approvedLead: NurseLead = {
      ...lead,
      status: 'Approved',
      pointsAwarded: pointsToCredit,
      referralCommissionRupees: referralRupees || 0,
      approvedAt: new Date().toISOString(),
      approvedBy: 'Admin',
      adminNotes: adminNotes || `Approved (+${pointsToCredit} points credited)`
    };

    setLeads((prev) => prev.map((l) => (l.id === leadId ? approvedLead : l)));
    broadcastRealtimeUpdate('LEAD_UPDATE', approvedLead);
    await dbUpdateLeadById(leadId, approvedLead);

    // Credit Referring Nurse with strictly 50 points
    const leadNursePhone = (lead.referredNursePhone || lead.patientPhone || '').replace(/\D/g, '');
    const referringNurse = nurses.find((n) => 
      n.id === lead.nurseId || 
      (leadNursePhone && n.phone && n.phone.replace(/\D/g, '') === leadNursePhone)
    );
    if (referringNurse) {
      const updatedNurse: NurseProfile = {
        ...referringNurse,
        pointsEarned: (referringNurse.pointsEarned || 0) + pointsToCredit,
        referralEarningsRupees: (referringNurse.referralEarningsRupees || 0) + (referralRupees || 0),
        convertedLeads: (referringNurse.convertedLeads || 0) + 1,
        totalReferrals: (referringNurse.totalReferrals || 0) + 1
      };
      setNurses((prev) => {
        const next = prev.map((n) => (n.id === updatedNurse.id ? updatedNurse : n));
        try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch {}
        return next;
      });
      broadcastRealtimeUpdate('NURSE_UPDATE', updatedNurse);
      await dbUpdateNurse(updatedNurse);
    }

    // Update matching booking's referral bonus record
    setBookings((prev) =>
      prev.map((b) => {
        if (b.patientPhone === lead.patientPhone || (b.referringNurseId === lead.nurseId && b.patientName === lead.patientName)) {
          const updatedB = {
            ...b,
            referralBonusRupees: referralRupees || 0,
            notes: `${b.notes || ''} [Approved: +${pointsToCredit} reward points credited]`.trim()
          };
          broadcastRealtimeUpdate('BOOKING_UPDATE', updatedB);
          return updatedB;
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
      rejectedBy: 'Admin',
      rejectionReason: adminNotes || 'Rejected by Admin review',
      adminNotes: adminNotes || 'Rejected by Admin review'
    };

    setLeads((prev) => prev.map((l) => (l.id === leadId ? rejectedLead : l)));
    broadcastRealtimeUpdate('LEAD_UPDATE', rejectedLead);
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
      try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch {}
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
      try { localStorage.setItem('xn_cached_app_users', JSON.stringify(next)); } catch {}
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
        try { localStorage.setItem('xn_auth_user', JSON.stringify(next)); } catch {}
        return next;
      }
      return prev;
    });
    broadcastRealtimeUpdate('NURSE_UPDATE', updated);
    dbUpdateNurse(updated);
  };

  // Handler: Admin assigns or reassigns order
  const handleAdminAssignOrder = (bookingId: string, nurseId: string, ruleExplanation: string) => {
    const nurseObj = nurses.find((n) => n.id === nurseId);
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          const wasRejected = b.status === 'Rejected' || b.nurseAcceptanceStatus === 'Rejected';
          const auditMsg = wasRejected 
            ? `Referred & reassigned to Nurse ${nurseObj?.name || nurseId} by Admin (${ruleExplanation})`
            : undefined;
          const updatedNotes = auditMsg ? (b.notes ? `${b.notes} • ${auditMsg}` : auditMsg) : b.notes;

          const updated: Booking = {
            ...b,
            status: 'Assigned',
            nurseAcceptanceStatus: 'Pending',
            assignedNurseId: nurseId,
            assignedNurseName: `${nurseObj?.name || 'Nurse'} (${ruleExplanation})`,
            rejectedBy: undefined,
            rejectionReason: undefined,
            rejectedNurseId: undefined,
            rejectedNurseName: undefined,
            rejectedAt: undefined,
            notes: updatedNotes
          };
          broadcastRealtimeUpdate('BOOKING_UPDATE', updated);
          dbSaveBooking(updated);
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
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    broadcastRealtimeUpdate('BOOKING_UPDATE', { id, ...updates });
    await dbUpdateBooking(id, updates);
  };
  const handleDeleteBooking = async (id: string) => {
    setBookings((prev) => prev.filter((b) => b.id !== id));
    broadcastRealtimeUpdate('BOOKING_DELETE', { id });
    await dbDeleteBooking(id);
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
      try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch {}
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
      try { localStorage.setItem('xn_cached_app_users', JSON.stringify(next)); } catch {}
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
        try { localStorage.setItem('xn_auth_user', JSON.stringify(next)); } catch {}
        return next;
      }
      return prev;
    });
    broadcastRealtimeUpdate('NURSE_UPDATE', { id, ...updates });
    await dbUpdateNurseById(id, updates);
  };
  const handleDeleteNurse = async (id: string) => {
    setNurses((prev) => {
      const next = prev.filter((n) => n.id !== id);
      try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch {}
      return next;
    });
    setAppUsers((prev) => {
      const next = prev.filter((u) => u.id !== id);
      try { localStorage.setItem('xn_cached_app_users', JSON.stringify(next)); } catch {}
      return next;
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
    setLeads((prev) => prev.filter((l) => l.id !== id));
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
      try { localStorage.setItem('xn_cached_app_users', JSON.stringify(next)); } catch {}
      return next;
    });
    setNurses((prev) => {
      const next = prev.filter((n) => n.id !== id);
      try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch {}
      return next;
    });
    broadcastRealtimeUpdate('APP_USER_DELETE', { id });
    await dbDeleteAppUser(id);
  };

  // Batch Delete Handlers for Admin Dashboard Selected & Delete All
  const handleDeleteMultipleBookings = async (ids: string[]) => {
    const idSet = new Set(ids);
    setBookings((prev) => {
      const next = prev.filter((b) => !idSet.has(b.id));
      try { localStorage.setItem('xn_cached_bookings', JSON.stringify(next)); } catch {}
      return next;
    });
    ids.forEach((id) => broadcastRealtimeUpdate('BOOKING_DELETE', { id }));
    await dbDeleteMultipleBookings(ids);
  };

  const handleDeleteMultipleNurses = async (ids: string[]) => {
    const idSet = new Set(ids);
    setNurses((prev) => {
      const next = prev.filter((n) => !idSet.has(n.id));
      try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch {}
      return next;
    });
    setAppUsers((prev) => {
      const next = prev.filter((u) => !idSet.has(u.id));
      try { localStorage.setItem('xn_cached_app_users', JSON.stringify(next)); } catch {}
      return next;
    });
    ids.forEach((id) => broadcastRealtimeUpdate('NURSE_DELETE', { id }));
    await dbDeleteMultipleNurses(ids);
  };

  const handleDeleteMultipleLeads = async (ids: string[]) => {
    const idSet = new Set(ids);
    setLeads((prev) => {
      const next = prev.filter((l) => !idSet.has(l.id));
      try { localStorage.setItem('xn_cached_leads', JSON.stringify(next)); } catch {}
      return next;
    });
    ids.forEach((id) => broadcastRealtimeUpdate('LEAD_DELETE', { id }));
    await dbDeleteMultipleLeads(ids);
  };

  const handleDeleteMultipleServices = async (ids: string[]) => {
    const idSet = new Set(ids);
    setServices((prev) => {
      const next = prev.filter((s) => !idSet.has(s.id));
      try { localStorage.setItem('xn_cached_services', JSON.stringify(next)); } catch {}
      return next;
    });
    ids.forEach((id) => broadcastRealtimeUpdate('SERVICE_DELETE', { id }));
    await dbDeleteMultipleServices(ids);
  };

  const handleDeleteMultipleConsultations = async (ids: string[]) => {
    const idSet = new Set(ids);
    setConsultations((prev) => {
      const next = prev.filter((c) => !idSet.has(c.id));
      try { localStorage.setItem('xn_cached_consultations', JSON.stringify(next)); } catch {}
      return next;
    });
    ids.forEach((id) => broadcastRealtimeUpdate('CONSULTATION_DELETE', { id }));
    await dbDeleteMultipleConsultations(ids);
  };

  const handleDeleteMultipleCoupons = async (ids: string[]) => {
    const idSet = new Set(ids);
    setCoupons((prev) => {
      const next = prev.filter((c) => !idSet.has(c.id));
      try { localStorage.setItem('xn_cached_coupons', JSON.stringify(next)); } catch {}
      return next;
    });
    ids.forEach((id) => broadcastRealtimeUpdate('COUPON_DELETE', { id }));
    await dbDeleteMultipleCoupons(ids);
  };

  const handleDeleteMultipleAppUsers = async (ids: string[]) => {
    const idSet = new Set(ids);
    setAppUsers((prev) => {
      const next = prev.filter((u) => !idSet.has(u.id));
      try { localStorage.setItem('xn_cached_app_users', JSON.stringify(next)); } catch {}
      return next;
    });
    setNurses((prev) => {
      const next = prev.filter((n) => !idSet.has(n.id));
      try { localStorage.setItem('xn_cached_nurses', JSON.stringify(next)); } catch {}
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
          <AuthGuard user={authUser} requiredRole="nurse" onNavigate={navigate}>
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
              onUpdateBooking={handleUpdateBooking}
            />
          </AuthGuard>
        )}

        {/* Route: /admin -> Admin Operations & Dispatch */}
        {currentPath === '/admin' && (
          <AuthGuard user={authUser} requiredRole="admin" onNavigate={navigate}>
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
              onDeleteMultipleBookings={handleDeleteMultipleBookings}
              onDeleteMultipleNurses={handleDeleteMultipleNurses}
              onDeleteMultipleLeads={handleDeleteMultipleLeads}
              onDeleteMultipleServices={handleDeleteMultipleServices}
              onDeleteMultipleConsultations={handleDeleteMultipleConsultations}
              onDeleteMultipleCoupons={handleDeleteMultipleCoupons}
              onDeleteMultipleAppUsers={handleDeleteMultipleAppUsers}
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
