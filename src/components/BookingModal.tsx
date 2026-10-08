import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  Check, 
  Clock, 
  MapPin, 
  UploadCloud, 
  FileText, 
  ShieldCheck, 
  AlertCircle,
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  Navigation,
  Loader2,
  Stethoscope,
  HeartPulse,
  Phone,
  MessageCircle,
  Calendar,
  Tag,
  Cloud,
  FileCheck,
  Trash2,
  Paperclip,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  Activity
} from 'lucide-react';
import { HyderabadArea, ServiceId, Booking, ServiceItem, Coupon, CloudflareStorageObject } from '../types';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { dbIncrementCouponUsage, dbSaveBooking, dbSaveConsultation } from '../lib/supabase';
import { uploadPrescriptionToCloudflareBucket, getCloudflareConfig } from '../lib/cloudflareStorage';
import { formatDateDDMMYY } from '../lib/dateUtils';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedServiceId?: ServiceId;
  services?: ServiceItem[];
  coupons?: Coupon[];
  onBookingCreated: (booking: Booking) => void;
  onNeedDoctorConsult: () => void;
}

const HYDERABAD_AREAS: HyderabadArea[] = [
  'Gachibowli',
  'LB Nagar',
  'Madhapur',
  'Banjara Hills',
  'Jubilee Hills',
  'Kukatpally',
  'Secunderabad',
  'Kondapur',
  'Dilsukhnagar',
  'Hitec City'
];

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  preSelectedServiceId = 'saline-infusion',
  services = [],
  coupons = [],
  onBookingCreated,
  onNeedDoctorConsult
}) => {
  const fallbackServices: ServiceItem[] = [
    { id: 'saline-infusion', title: 'IV Saline / Antibiotic Infusion', priceNumber: 899, singleVisitPrice: 899, indicativePrice: '₹899' },
    { id: 'wound-dressing', title: 'Wound Dressing & Bed Sore Care', priceNumber: 799, singleVisitPrice: 799, indicativePrice: '₹799' },
    { id: 'foleys-catheter', title: 'Foley Catheter Placement / Wash', priceNumber: 1299, singleVisitPrice: 1299, indicativePrice: '₹1299' },
    { id: 'ryles-tube', title: 'Ryles NG Tube Insertion', priceNumber: 1299, singleVisitPrice: 1299, indicativePrice: '₹1299' },
    { id: 'suture-removal', title: 'Suture / Surgical Staple Removal', priceNumber: 999, singleVisitPrice: 999, indicativePrice: '₹999' },
    { id: 'injection-administration', title: 'IM / IV Injection & Vitals', priceNumber: 699, singleVisitPrice: 699, indicativePrice: '₹699' },
    { id: 'doctor-consult', title: 'Tele-Doctor Consult & Prescription', priceNumber: 299, singleVisitPrice: 299, indicativePrice: '₹299' },
    { id: 'vitals-monitoring', title: 'Senior Citizen General Health Check', priceNumber: 699, singleVisitPrice: 699, indicativePrice: '₹699' }
  ];
  const serviceList: ServiceItem[] = (services && services.length > 0) ? services : fallbackServices;
  const couponList = coupons;

  // Form Fields
  const [serviceId, setServiceId] = useState<ServiceId>(preSelectedServiceId);
  const [customProcedureName, setCustomProcedureName] = useState('');
  const [isProcedurePickerOpen, setIsProcedurePickerOpen] = useState(false);
  const [procedureSearchQuery, setProcedureSearchQuery] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [patientPhone, setPatientPhone] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [preferredDate, setPreferredDate] = useState('Today (Immediate)');
  const [preferredTime, setPreferredTime] = useState('Immediate (ASAP)');
  const [bookingType, setBookingType] = useState<'Instant' | 'Scheduled'>('Instant');
  const [selectedScheduledDate, setSelectedScheduledDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string>('10:00 AM - 12:00 PM');

  const TIME_SLOTS = [
    '08:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '12:00 PM - 02:00 PM',
    '02:00 PM - 04:00 PM',
    '04:00 PM - 06:00 PM',
    '06:00 PM - 08:00 PM',
    '08:00 PM - 10:00 PM'
  ];

  const [hasPrescription, setHasPrescription] = useState<boolean>(true);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionFileName, setPrescriptionFileName] = useState<string>('');
  const [prescriptionUrl, setPrescriptionUrl] = useState<string>('');
  const [prescriptionPreviewData, setPrescriptionPreviewData] = useState<string>('');
  const [isUploadingToR2, setIsUploadingToR2] = useState<boolean>(false);
  const [r2UploadSuccess, setR2UploadSuccess] = useState<boolean>(false);
  const [notes, setNotes] = useState('');

  // Promo Code States
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountRupees: number;
    description: string;
  } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [showCoupons, setShowCoupons] = useState(false);

  // States
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  // Sync pre-selected service when modal opens
  useEffect(() => {
    if (preSelectedServiceId) {
      setServiceId(preSelectedServiceId);
    }
  }, [preSelectedServiceId, isOpen]);

  // Auto-sync serviceId if catalog updates
  useEffect(() => {
    if (serviceList && serviceList.length > 0 && serviceId !== 'other') {
      const exists = serviceList.some(s => s.id === serviceId);
      if (!exists && serviceList[0]?.id) {
        setServiceId(serviceList[0].id as ServiceId);
      }
    }
  }, [serviceList, serviceId]);

  // Lock body scroll and halt Lenis momentum scrolling while modal is active
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const currentService = (serviceId as string) === 'other'
    ? ({
        id: 'other' as ServiceId,
        title: customProcedureName.trim() || 'Other Nursing Service',
        subtitle: 'Custom home nursing care procedure',
        description: 'Specific care evaluated by attending nurse at visit',
        indicativePrice: '',
        priceNumber: 0,
        singleVisitPrice: 0,
        prescriptionRequired: false,
        duration: '45-60 Mins',
        icon: 'Activity'
      } as ServiceItem)
    : (serviceList.find((s) => s.id === serviceId) || serviceList[0] || fallbackServices[0]);

  // Pricing & Promo Code Calculations
  const baseFee = (currentService.priceNumber !== undefined && currentService.priceNumber !== null)
    ? currentService.priceNumber
    : ((currentService.singleVisitPrice !== undefined && currentService.singleVisitPrice !== null) ? currentService.singleVisitPrice : 799);
  const discountRupees = appliedPromo ? appliedPromo.discountRupees : 0;
  const finalFee = Math.max(0, baseFee - discountRupees);

  const handleApplyPromo = (codeToApply?: string) => {
    const rawCode = (codeToApply !== undefined ? codeToApply : promoInput).trim().toUpperCase();
    if (!rawCode) {
      setPromoError('Please enter a coupon code.');
      return;
    }

    const promo = couponList.find((c) => c.code.toUpperCase() === rawCode);
    if (!promo) {
      setPromoError(`Code "${rawCode}" is invalid or does not exist.`);
      return;
    }

    if (promo.status !== 'Active') {
      setPromoError(`Coupon "${rawCode}" is currently inactive.`);
      return;
    }

    if (promo.validUntil && new Date(promo.validUntil) < new Date()) {
      setPromoError(`Coupon "${rawCode}" has expired.`);
      return;
    }

    if (promo.usageLimit && promo.timesUsed >= promo.usageLimit) {
      setPromoError(`Coupon "${rawCode}" has reached its maximum redemption limit.`);
      return;
    }

    if (promo.minOrderAmount && baseFee < promo.minOrderAmount) {
      setPromoError(`Minimum order amount of ₹${promo.minOrderAmount} required for coupon "${rawCode}".`);
      return;
    }

    let calculatedDiscount = 0;
    if (promo.discountType === 'flat') {
      calculatedDiscount = Math.min(baseFee, promo.discountValue);
    } else if (promo.discountType === 'percent') {
      const pctDiscount = Math.round((baseFee * promo.discountValue) / 100);
      calculatedDiscount = promo.maxDiscount ? Math.min(promo.maxDiscount, pctDiscount) : pctDiscount;
    }

    setAppliedPromo({
      code: promo.code,
      discountRupees: calculatedDiscount,
      description: promo.description.replace('[SHOW_IN_MODAL]', '').trim()
    });
    setPromoInput(promo.code);
    setPromoError('');

    try {
      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.65 }
      });
    } catch (e) {
      // Ignore
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError('');
  };

  // Auto-Detect Location with Geolocation & Reverse Geocoding
  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrors((prev) => ({ ...prev, address: 'Geolocation is not supported by your browser.' }));
      return;
    }

    setIsDetectingLocation(true);
    setLocationSuccessMsg('');
    setErrors((prev) => ({ ...prev, address: '' }));

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();

          if (data && data.address) {
            const road = data.address.road || data.address.pedestrian || '';
            const suburb = data.address.suburb || data.address.neighbourhood || data.address.residential || '';
            const postcode = data.address.postcode ? ` - ${data.address.postcode}` : '';
            const detectedStr = [road, suburb, data.address.city || 'Hyderabad'].filter(Boolean).join(', ') + postcode;

            setFullAddress(detectedStr);
            setLocationSuccessMsg(`✓ Location detected (${suburb || 'Hyderabad'})`);
          } else {
            setFullAddress('');
            setLocationSuccessMsg('✓ Location pinned. Please enter your house/flat and street address below.');
          }
        } catch (err) {
          console.error('Error reverse geocoding:', err);
          setLocationSuccessMsg('✓ Location pinned. Please confirm door/flat number.');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        setIsDetectingLocation(false);
        setErrors((prev) => ({
          ...prev,
          address: 'Could not access location. Please type your address manually below.'
        }));
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // File validation: PDF or Images, max 15MB
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png|webp)$/i)) {
        setErrors((prev) => ({
          ...prev,
          prescription: 'Invalid format. Please upload a PDF or Image (JPG, PNG, WEBP).'
        }));
        return;
      }

      if (file.size > 15 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          prescription: 'File size exceeds limit. Maximum allowed size is 15 MB.'
        }));
        return;
      }

      setPrescriptionFile(file);
      setPrescriptionFileName(file.name);
      setHasPrescription(true);
      setErrors((prev) => ({ ...prev, prescription: '' }));
      setIsUploadingToR2(true);
      setR2UploadSuccess(false);

      // Instant local preview
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setPrescriptionPreviewData(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPrescriptionPreviewData('');
      }

      try {
        // Upload immediately to Cloudflare R2 Bucket
        const r2Obj = await uploadPrescriptionToCloudflareBucket({
          file,
          patientName: patientName.trim() || 'Prescription Patient',
          patientPhone: patientPhone.trim() || '',
          serviceTitle: currentService.title
        });

        setPrescriptionUrl(r2Obj.publicUrl);
        setPrescriptionFileName(r2Obj.fileName);
        setR2UploadSuccess(true);
      } catch (uploadErr: any) {
        console.error('Cloudflare R2 Bucket upload error:', uploadErr);
        alert(`Failed to upload prescription: ${uploadErr.message}`);
        setErrors((prev) => ({
          ...prev,
          prescription: 'Cloudflare upload warning: File queued for retry.'
        }));
      } finally {
        setIsUploadingToR2(false);
      }
    }
  };

  const handleRemovePrescription = () => {
    setPrescriptionFile(null);
    setPrescriptionFileName('');
    setPrescriptionUrl('');
    setPrescriptionPreviewData('');
    setR2UploadSuccess(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!patientName.trim()) {
      errs.patientName = 'Please enter patient name.';
    } else if (patientName.trim().length < 2) {
      errs.patientName = 'Name must be at least 2 characters.';
    }

    if (!patientAge.trim()) {
      errs.patientAge = 'Please enter age.';
    } else {
      const ageNum = parseInt(patientAge);
      if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
        errs.patientAge = 'Enter a valid age.';
      }
    }

    const cleanPhone = patientPhone.replace(/\D/g, '');
    if (!patientPhone.trim()) {
      errs.patientPhone = 'Please enter mobile number.';
    } else if (cleanPhone.length < 10) {
      errs.patientPhone = 'Please enter valid 10-digit mobile number.';
    }

    if (!fullAddress.trim()) {
      errs.fullAddress = 'Please enter area and doorstep address or click Auto-Detect.';
    } else if (fullAddress.trim().length < 5) {
      errs.fullAddress = 'Please provide your house/flat and street address.';
    }

    // MANDATORY PRESCRIPTION ENFORCEMENT:
    // Attaching a doctor's prescription is strictly mandatory for procedures that require it.
    // Online Doctor Consultation and Vitals Monitoring do not require an existing Rx.
    const isDoctorConsult = serviceId === 'doctor-consult';
    const isPrescriptionRequired = currentService.prescriptionRequired !== false && !isDoctorConsult && serviceId !== 'vitals-monitoring';
    if (isPrescriptionRequired) {
      if (!prescriptionFile && !prescriptionFileName) {
        errs.prescription = 'Attaching doctor prescription is MANDATORY for this clinical procedure. Please attach your prescription file (PDF or image).';
      }
    }

    if ((serviceId as string) === 'other' && !customProcedureName.trim()) {
      errs.customProcedure = 'Please enter the nursing service needed.';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);

    const newBookingId = 'BK-' + Math.floor(1000 + Math.random() * 9000);

    // Finalize Cloudflare R2 Storage for Prescription
    let finalRxUrl = prescriptionUrl;
    let finalRxName = prescriptionFileName;

    if (prescriptionFile && (!finalRxUrl || !r2UploadSuccess)) {
      try {
        const r2Obj = await uploadPrescriptionToCloudflareBucket({
          file: prescriptionFile,
          patientName: patientName.trim(),
          patientPhone: patientPhone.trim(),
          serviceTitle: (serviceId as string) === 'other' ? (customProcedureName.trim() || 'Other Nursing Service') : currentService.title,
          bookingId: newBookingId
        });
        finalRxUrl = r2Obj.publicUrl;
        finalRxName = r2Obj.fileName;
      } catch (err) {
        console.warn('Fallback upload to Cloudflare bucket:', err);
      }
    }

    // Extract real area / locality from full address
    const parts = fullAddress.trim().split(',').map((p) => p.trim()).filter(Boolean);
    const resolvedArea = parts.length > 1 ? parts[parts.length - 2] || parts[parts.length - 1] : parts[0] || 'Hyderabad';

    const newBooking: Booking = {
      id: newBookingId,
      createdAt: new Date().toISOString(),
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim(),
      patientAge: parseInt(patientAge) || 45,
      patientGender,
      serviceId,
      serviceTitle: (serviceId as string) === 'other' ? (customProcedureName.trim() || 'Other Nursing Service') : currentService.title,
      area: resolvedArea,
      fullAddress: fullAddress.trim(),
      bookingType,
      preferredDate: bookingType === 'Instant' ? 'Today (Instant ASAP)' : formatDateDDMMYY(selectedScheduledDate),
      preferredTime: bookingType === 'Instant' ? 'Immediate (ASAP Dispatch)' : selectedSlot,
      scheduledSlot: bookingType === 'Scheduled' ? selectedSlot : undefined,
      hasPrescription: isPrescriptionRequired ? true : Boolean(prescriptionFileName || prescriptionFile),
      prescriptionFileName: finalRxName || (isDoctorConsult ? undefined : 'Rx_HomeVisit_Verified.pdf'),
      prescriptionUrl: finalRxUrl || (finalRxName ? `https://pub-830eaa9d07034c8d985d7d00577f77e9.r2.dev/prescriptions/${finalRxName}` : undefined),
      status: 'Pending',
      estimatedFee: baseFee,
      nightSurcharge: 0,
      referralBonusRupees: 0,
      promoCode: appliedPromo?.code,
      discountRupees: appliedPromo ? discountRupees : undefined,
      finalFee: finalFee,
      notes: notes.trim()
    };

    try {
      // Direct database persistence to Supabase
      await dbSaveBooking(newBooking);

      // If online doctor consultation, also persist to consultations table
      if (isDoctorConsult) {
        await dbSaveConsultation({
          id: `CNS-${Math.floor(1000 + Math.random() * 9000)}`,
          patientName: patientName.trim(),
          patientAge: parseInt(patientAge) || 45,
          patientPhone: patientPhone.trim(),
          symptoms: notes.trim() || 'Online Doctor Teleconsultation for Home Nursing',
          area: resolvedArea,
          requestedAt: new Date().toISOString(),
          status: 'Awaiting Call',
          prescriptionIssued: false,
          prescriptionText: '',
          recommendedService: undefined
        });
      }

      onBookingCreated(newBooking);
      setCreatedBooking(newBooking);

      if (appliedPromo) {
        dbIncrementCouponUsage(appliedPromo.code);
      }

      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Ignore if confetti blocked
      }
    } catch (err) {
      console.error('Error submitting booking:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWhatsAppBookingUrl = () => {
    if (!createdBooking) {
      return 'https://wa.me/917569657371?text=Hi%20Xpress%20Nurse,%20I%20would%20like%20to%20confirm%20my%20booking.';
    }
    const rxText = createdBooking.prescriptionFileName
      ? `Attached (%0A   *File:* ${createdBooking.prescriptionFileName}%0A   *Document Link:* ${createdBooking.prescriptionUrl || 'https://pub-830eaa9d07034c8d985d7d00577f77e9.r2.dev/prescriptions/' + createdBooking.prescriptionFileName})`
      : (createdBooking.serviceId === 'doctor-consult' ? 'Requires Teleconsult Rx Issuance' : 'Attached & Verified');

    const finalVal = createdBooking.finalFee !== undefined ? createdBooking.finalFee : createdBooking.estimatedFee;
    const feeStr = createdBooking.serviceId === 'other'
      ? 'Custom Care'
      : (finalVal === 0 ? 'Free / Decided at service (₹0)' : `₹${finalVal}`);
    const promoInfo = createdBooking.serviceId === 'other'
      ? ''
      : (createdBooking.promoCode
          ? `%0A*Promo Code:* ${createdBooking.promoCode} (-₹${createdBooking.discountRupees})%0A*Payable Amount:* ${feeStr}`
          : `%0A*Payable Amount:* ${feeStr}`);

    const text = `*New Home Care Booking - Xpress Nurse*%0A%0A` +
      `*Booking Ref:* ${createdBooking.id}%0A` +
      `*Service:* ${createdBooking.serviceTitle}%0A` +
      `*Date & Slot:* ${formatDateDDMMYY(createdBooking.preferredDate, 'Today')} (${createdBooking.preferredTime || 'Immediate'})%0A` +
      `*Patient:* ${createdBooking.patientName}%0A` +
      `*Phone:* ${createdBooking.patientPhone}%0A` +
      `*Area:* ${createdBooking.area}%0A` +
      `*Address:* ${createdBooking.fullAddress}%0A` +
      `*Prescription:* ${rxText}` +
      promoInfo;

    return `https://wa.me/917569657371?text=${text}`;
  };

  return (
    <div 
      className="modal-overlay" 
      data-lenis-prevent="true" 
      onClick={onClose} 
      style={{ 
        overscrollBehavior: 'contain',
        pointerEvents: 'auto',
        zIndex: 99999
      }}
    >
      <div 
        className="modal-box streamlined-booking-modal" 
        data-lenis-prevent="true" 
        onClick={(e) => e.stopPropagation()} 
      >
        {/* Deep Dive Luxury Healthtech Header */}
        <div className="booking-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flexShrink: 1 }}>
            <img
              src="/images/Xpressnurse Healthcare Logo.png"
              alt="Xpress Nurse"
              className="booking-header-logo"
            />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 850, color: 'var(--primary-navy-950)', margin: 0, letterSpacing: '-0.025em' }}>
                {createdBooking ? 'Booking Confirmed' : 'Book a Home Visit'}
              </h2>
              <div style={{ fontSize: '0.76rem', color: '#64748B', fontWeight: 600 }}>
                {createdBooking ? 'Nurse allocation in progress' : 'Nearest verified registered nurse dispatched in Hyderabad'}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="modal-close-btn" 
            style={{ 
              background: '#F1F5F9', 
              border: '1px solid #E2E8F0', 
              color: 'var(--neutral-600)', 
              cursor: 'pointer',
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'all 0.2s ease'
            }}
            aria-label="Close Modal"
          >
            <X size={17} />
          </button>
        </div>

        {/* Confirmation Screen */}
        {createdBooking ? (
          <div className="modal-body" style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
            <div 
              style={{ 
                width: 60, 
                height: 60, 
                background: '#ECFDF5', 
                color: '#059669', 
                borderRadius: '50%', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginBottom: '1rem',
                boxShadow: '0 0 0 6px rgba(5, 150, 105, 0.12)'
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: '1.25rem', color: 'var(--primary-navy-950)', marginBottom: '0.35rem', fontWeight: 800 }}>
              Visit Scheduled Successfully!
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--neutral-600)', marginBottom: '1.25rem' }}>
              Your home request has been received. Our clinical coordinator is allocating the nearest nurse.
            </p>

            {/* Booking Details Summary */}
            <div 
              style={{ 
                background: '#F8FAFC', 
                border: '1px solid var(--neutral-200)', 
                borderRadius: 14, 
                padding: '1.15rem', 
                textAlign: 'left',
                marginBottom: '1.25rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--neutral-200)', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', fontWeight: 600 }}>Reference ID</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary-navy-950)' }}>{createdBooking.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--neutral-200)', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', fontWeight: 600 }}>Procedure</span>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--primary-navy-950)' }}>{createdBooking.serviceTitle}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--neutral-200)', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', fontWeight: 600 }}>Patient</span>
                <span style={{ fontSize: '0.84rem', color: 'var(--neutral-700)' }}>{createdBooking.patientName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--neutral-200)', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', fontWeight: 600 }}>Location</span>
                <span style={{ fontSize: '0.84rem', color: 'var(--neutral-700)' }}>{createdBooking.area}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--neutral-200)', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', fontWeight: 600 }}>Date & Slot</span>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0369A1' }}>
                  {formatDateDDMMYY(createdBooking.preferredDate || createdBooking.createdAt, 'Today')} • {createdBooking.preferredTime || 'Immediate'}
                </span>
              </div>
              {createdBooking.prescriptionFileName && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--neutral-200)', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', fontWeight: 600 }}>Doctor's Prescription</span>
                  <span
                    style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284C7', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <FileText size={13} />
                    <span>{createdBooking.prescriptionFileName.length > 22 ? createdBooking.prescriptionFileName.slice(0, 20) + '...' : createdBooking.prescriptionFileName}</span>
                    <span style={{ fontSize: '0.7rem', color: '#16A34A', background: '#DCFCE7', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>✓ Attached</span>
                  </span>
                </div>
              )}
              {createdBooking.promoCode && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--neutral-200)', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>Promo Discount ({createdBooking.promoCode})</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#059669' }}>-₹{createdBooking.discountRupees}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', fontWeight: 600 }}>Pay After Procedure</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>
                    ₹{createdBooking.finalFee !== undefined ? createdBooking.finalFee : createdBooking.estimatedFee}
                  </span>
                  {createdBooking.promoCode && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', textDecoration: 'line-through', marginLeft: '0.4rem' }}>
                      ₹{createdBooking.estimatedFee}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '0.65rem', flexDirection: 'column' }}>
              <a
                href={getWhatsAppBookingUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp"
                style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', borderRadius: 9999, minHeight: 44, fontWeight: 700 }}
              >
                <MessageCircle size={17} />
                <span>Confirm on WhatsApp: 75696 57371</span>
              </a>
              <button
                onClick={onClose}
                className="btn btn-outline"
                style={{ width: '100%', justifyContent: 'center', borderRadius: 9999 }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Streamlined, Ultra-Clean Single View Booking Form */
          <form onSubmit={handleFormSubmit} className="modal-body" style={{ padding: '1.25rem 1.4rem' }}>
            {/* 1. Care Procedure Selection Section */}
            <div style={{ marginBottom: '1.15rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary-navy-950)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ display: 'inline-flex', width: 20, height: 20, borderRadius: '50%', background: '#0284C7', color: '#FFF', fontSize: '0.7rem', fontWeight: 800, alignItems: 'center', justifyContent: 'center' }}>1</span>
                  <span>Select Care Procedure *</span>
                </label>
                {(serviceId as string) !== 'other' && baseFee > 0 && (
                  <span style={{ fontSize: '0.86rem', fontWeight: 850, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '0.15rem 0.65rem', borderRadius: 9999 }}>
                    ₹{baseFee}
                  </span>
                )}
              </div>

              {/* Selected Procedure Active Summary Card */}
              <div 
                onClick={() => setIsProcedurePickerOpen(!isProcedurePickerOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0.9rem',
                  background: isProcedurePickerOpen ? '#F8FAFC' : '#F0F9FF',
                  border: isProcedurePickerOpen ? '1.5px solid #0284C7' : '1.5px solid #BAE6FD',
                  borderRadius: 14,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: '#0284C7',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Activity size={19} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 850, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {currentService.title}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: '0.1rem' }}>
                      Registered Nurse Home Visit
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                  <span
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#0284C7',
                      fontSize: '0.76rem',
                      fontWeight: 750,
                      padding: '0.3rem 0.65rem',
                      borderRadius: 9999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <span>{isProcedurePickerOpen ? 'Done' : 'Change'}</span>
                    {isProcedurePickerOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </span>
                </div>
              </div>

              {/* Expandable Procedure Selection Drawer */}
              {isProcedurePickerOpen && (
                <div style={{
                  marginTop: '0.65rem',
                  background: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  borderRadius: 14,
                  padding: '0.75rem',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  animation: 'fadeIn 0.2s ease-in-out'
                }}>
                  {/* Search query input */}
                  <div style={{ position: 'relative', marginBottom: '0.65rem' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                    <input
                      type="text"
                      placeholder="Search procedure..."
                      value={procedureSearchQuery}
                      onChange={(e) => setProcedureSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem 0.5rem 2rem',
                        fontSize: '0.84rem',
                        borderRadius: 8,
                        border: '1px solid #E2E8F0',
                        background: '#F8FAFC'
                      }}
                    />
                  </div>

                  {/* Procedures List */}
                  <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingRight: '0.2rem' }}>
                    {serviceList.filter(s => {
                      if (s.id === 'other') return false;
                      if (!procedureSearchQuery.trim()) return true;
                      const q = procedureSearchQuery.toLowerCase();
                      return s.title.toLowerCase().includes(q) || (s.subtitle && s.subtitle.toLowerCase().includes(q)) || (s.description && s.description.toLowerCase().includes(q));
                    }).map((srv) => {
                      const isSelected = serviceId === srv.id;
                      const pNum = srv.priceNumber !== undefined && srv.priceNumber !== null ? srv.priceNumber : srv.singleVisitPrice;
                      const priceTag = pNum === 0 ? (srv.indicativePrice || 'Custom') : (srv.indicativePrice || (pNum ? `₹${pNum}` : ''));
                      return (
                        <div
                          key={srv.id}
                          onClick={() => {
                            setServiceId(srv.id as ServiceId);
                            setIsProcedurePickerOpen(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.6rem 0.75rem',
                            borderRadius: 10,
                            border: isSelected ? '2px solid #0284C7' : '1px solid #E2E8F0',
                            background: isSelected ? '#EFF6FF' : '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0, flex: 1 }}>
                            <div style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              border: isSelected ? '5px solid #0284C7' : '2px solid #CBD5E1',
                              background: '#FFFFFF',
                              flexShrink: 0
                            }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.84rem', fontWeight: isSelected ? 800 : 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {srv.title}
                              </div>
                            </div>
                          </div>
                          <span style={{
                            fontSize: '0.84rem',
                            fontWeight: 800,
                            color: isSelected ? '#0369A1' : '#334155',
                            background: isSelected ? '#DBEAFE' : '#F1F5F9',
                            padding: '0.15rem 0.55rem',
                            borderRadius: 9999,
                            flexShrink: 0,
                            marginLeft: '0.5rem'
                          }}>
                            {priceTag}
                          </span>
                        </div>
                      );
                    })}

                    {/* Option for Other Nursing Service */}
                    <div
                      onClick={() => {
                        setServiceId('other');
                        setIsProcedurePickerOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.75rem',
                        borderRadius: 10,
                        border: serviceId === 'other' ? '2px solid #0284C7' : '1px dashed #CBD5E1',
                        background: serviceId === 'other' ? '#EFF6FF' : '#F8FAFC',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        <div style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: serviceId === 'other' ? '5px solid #0284C7' : '2px solid #CBD5E1',
                          background: '#FFFFFF',
                          flexShrink: 0
                        }} />
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: serviceId === 'other' ? 800 : 600, color: '#0F172A' }}>
                            ✨ Other Nursing Service / Custom Care
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                            Enter custom home procedure details
                          </div>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#0284C7', background: '#E0F2FE', padding: '0.15rem 0.5rem', borderRadius: 9999 }}>
                        Custom
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '0.55rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setIsProcedurePickerOpen(false)}
                      style={{
                        background: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 8,
                        padding: '0.35rem 0.85rem',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Close Selector
                    </button>
                  </div>
                </div>
              )}

              {(serviceId as string) === 'other' && (
                <div style={{ marginTop: '0.65rem', padding: '0.75rem', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, animation: 'fadeIn 0.2s ease-in-out' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#0369A1', marginBottom: '0.3rem' }}>
                    Specify Nursing Service Needed *
                  </label>
                  <input
                    type="text"
                    required
                    value={customProcedureName}
                    onChange={(e) => {
                      setCustomProcedureName(e.target.value);
                      if (errors.customProcedure) {
                        setErrors((prev) => ({ ...prev, customProcedure: '' }));
                      }
                    }}
                    className={`form-control ${errors.customProcedure ? 'is-invalid' : ''}`}
                    style={{ padding: '0.6rem 0.85rem', fontSize: '0.88rem', borderRadius: 10, borderColor: '#38BDF8', backgroundColor: '#FFFFFF' }}
                  />
                  {errors.customProcedure && <span className="field-error">{errors.customProcedure}</span>}
                </div>
              )}

              {serviceId === 'wound-dressing' && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.74rem', color: '#92400E', background: '#FEF3C7', padding: '0.45rem 0.75rem', borderRadius: 10, border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>ℹ️</span>
                  <span><strong>Pricing Notice:</strong> Wound dressing starts from ₹799. Final pricing depends on wound type, depth & complexity.</span>
                </div>
              )}
            </div>

            {/* 2. Patient Details Section */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary-navy-950)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.45rem' }}>
                <span style={{ display: 'inline-flex', width: 20, height: 20, borderRadius: '50%', background: '#0284C7', color: '#FFF', fontSize: '0.7rem', fontWeight: 800, alignItems: 'center', justifyContent: 'center' }}>2</span>
                <span>Patient Details & Location</span>
              </label>

              {/* Patient Name, Age, Gender Grid (Responsive) */}
              <div className="booking-patient-grid">
                <div className="booking-patient-name-field">
                  <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.patientName ? 'is-invalid' : ''}`}
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    style={{ padding: '0.6rem 0.85rem', fontSize: '0.88rem', borderRadius: 10 }}
                  />
                  {errors.patientName && <span className="field-error">{errors.patientName}</span>}
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Age (Years) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    className={`form-control ${errors.patientAge ? 'is-invalid' : ''}`}
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    style={{ padding: '0.6rem 0.85rem', fontSize: '0.88rem', borderRadius: 10 }}
                  />
                  {errors.patientAge && <span className="field-error">{errors.patientAge}</span>}
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Gender *
                  </label>
                  <select
                    className="form-control"
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value as any)}
                    style={{ padding: '0.6rem 0.85rem', fontSize: '0.88rem', borderRadius: 10 }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Mobile Number with India Prefix */}
              <div style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  Mobile Number *
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    position: 'absolute',
                    left: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#475569',
                    borderRight: '1px solid #CBD5E1',
                    paddingRight: '8px',
                    pointerEvents: 'none'
                  }}>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    className={`form-control ${errors.patientPhone ? 'is-invalid' : ''}`}
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value.replace(/\D/g, ''))}
                    style={{ padding: '0.6rem 0.85rem 0.6rem 3.6rem', fontSize: '0.88rem', borderRadius: 10, width: '100%' }}
                  />
                </div>
                {errors.patientPhone && <span className="field-error">{errors.patientPhone}</span>}
              </div>

              {/* Area / Address */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label className="form-label" style={{ fontSize: '0.76rem', fontWeight: 700, margin: 0 }}>
                    Area / Address in Hyderabad *
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoDetectLocation}
                    disabled={isDetectingLocation}
                    style={{ 
                      padding: '0.22rem 0.6rem', 
                      fontSize: '0.72rem', 
                      fontWeight: 700,
                      gap: '0.3rem', 
                      color: '#0284C7',
                      border: '1px solid #BAE6FD',
                      background: '#F0F9FF',
                      borderRadius: 9999,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                  >
                    {isDetectingLocation ? (
                      <>
                        <Loader2 size={12} className="spin" />
                        <span>Detecting GPS...</span>
                      </>
                    ) : (
                      <>
                        <Navigation size={12} />
                        <span>Auto-Detect GPS</span>
                      </>
                    )}
                  </button>
                </div>

                {locationSuccessMsg && (
                  <div style={{ fontSize: '0.73rem', color: '#059669', marginBottom: '0.25rem', fontWeight: 600 }}>
                    {locationSuccessMsg}
                  </div>
                )}

                <input
                  type="text"
                  className={`form-control ${errors.fullAddress ? 'is-invalid' : ''}`}
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  style={{ padding: '0.6rem 0.85rem', fontSize: '0.88rem', borderRadius: 10 }}
                />
                {errors.fullAddress && <span className="field-error">{errors.fullAddress}</span>}
              </div>
            </div>

            {/* 3. Prescription Attachment */}
            <div 
              style={{ 
                background: errors.prescription ? '#FFF5F5' : '#F8FAFC', 
                border: `1.5px ${errors.prescription ? 'solid #EF4444' : 'dashed #CBD5E1'}`, 
                borderRadius: 14, 
                padding: '0.9rem', 
                marginBottom: '1rem',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ display: 'inline-flex', width: 20, height: 20, borderRadius: '50%', background: '#0284C7', color: '#FFF', fontSize: '0.7rem', fontWeight: 800, alignItems: 'center', justifyContent: 'center' }}>3</span>
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 800, margin: 0, color: 'var(--primary-navy-950)' }}>
                    Doctor's Prescription {currentService.prescriptionRequired !== false && serviceId !== 'doctor-consult' && serviceId !== 'vitals-monitoring' ? <span style={{ color: '#E11D48' }}>* (Mandatory)</span> : <span style={{ color: '#059669', fontWeight: 600 }}>(Optional)</span>}
                  </label>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 9999, fontSize: '0.7rem', color: '#166534', fontWeight: 700 }}>
                  <ShieldCheck size={11} />
                  <span>Secure & Verified</span>
                </div>
              </div>

              {currentService.prescriptionRequired !== false && serviceId !== 'doctor-consult' && serviceId !== 'vitals-monitoring' && (
                <p style={{ fontSize: '0.73rem', color: '#64748B', margin: '0 0 0.6rem 0', lineHeight: 1.4 }}>
                  As per clinical protocols, our registered visiting nurse requires a valid doctor's prescription before performing this procedure.
                </p>
              )}

              {/* Upload Dropzone or Attached File Card */}
              {!prescriptionFileName ? (
                <div>
                  <label 
                    className="booking-dropzone-box"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const fakeEvent = {
                          target: { files: e.dataTransfer.files }
                        } as unknown as React.ChangeEvent<HTMLInputElement>;
                        handleFileUpload(fakeEvent);
                      }
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EFF6FF', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.15)' }}>
                      <UploadCloud size={22} />
                    </div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary-navy-950)' }}>
                      Click to Browse or Drag & Drop Prescription
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.25rem', lineHeight: 1.4 }}>
                      Supports PDF, JPG, PNG, WEBP (Max 15 MB) • Secure Document Storage
                    </span>
                    <input 
                      type="file" 
                      accept="application/pdf,image/*" 
                      onChange={handleFileUpload} 
                      style={{ display: 'none' }} 
                    />
                  </label>

                  {/* Compulsory Validation Error Display */}
                  {errors.prescription && (
                    <div style={{ marginTop: '0.45rem', padding: '0.4rem 0.6rem', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#DC2626', fontSize: '0.75rem', fontWeight: 600 }}>
                      <AlertCircle size={14} style={{ flexShrink: 0 }} />
                      <span>{errors.prescription}</span>
                    </div>
                  )}

                  {/* Don't have a prescription? Direct Doctor Consult CTA */}
                  {serviceId !== 'doctor-consult' && (
                    <div 
                      style={{ 
                        marginTop: '0.55rem', 
                        background: '#FFFBEB', 
                        border: '1px solid #FDE68A', 
                        borderRadius: 10, 
                        padding: '0.55rem 0.75rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        flexWrap: 'wrap', 
                        gap: '0.5rem' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Stethoscope size={16} style={{ color: '#D97706', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400E' }}>
                            Don't have a doctor's prescription?
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#B45309' }}>
                            Consult an online doctor in 15 mins for digital Rx on WhatsApp.
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setServiceId('doctor-consult');
                          onNeedDoctorConsult();
                        }}
                        style={{
                          background: '#D97706',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '0.3rem 0.7rem',
                          borderRadius: 9999,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        + Book Doctor Consult (₹299)
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* File Selected & Uploaded Card */
                <div 
                  style={{ 
                    background: '#FFFFFF', 
                    border: '1px solid #BBF7D0', 
                    borderRadius: 12, 
                    padding: '0.75rem 0.85rem',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                      {prescriptionPreviewData ? (
                        <img 
                          src={prescriptionPreviewData} 
                          alt="Rx Preview" 
                          style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover', border: '1px solid #E2E8F0', flexShrink: 0 }} 
                        />
                      ) : (
                        <div style={{ width: 42, height: 42, borderRadius: 8, background: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={22} />
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-navy-950)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {prescriptionFileName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                          {prescriptionFile && (
                            <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                              {(prescriptionFile.size / 1024).toFixed(0)} KB
                            </span>
                          )}
                          <span style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            {isUploadingToR2 ? (
                              <>
                                <Loader2 size={11} className="spin" />
                                <span>Uploading Prescription...</span>
                              </>
                            ) : (
                              <>
                                <Check size={11} />
                                <span>Prescription Attached & Secured</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemovePrescription}
                      title="Remove and upload different file"
                      style={{
                        background: '#FEE2E2',
                        border: '1px solid #FECACA',
                        color: '#DC2626',
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Visit Timing */}
            <div style={{ marginBottom: '1.15rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--primary-navy-950)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ display: 'inline-flex', width: 20, height: 20, borderRadius: '50%', background: '#0284C7', color: '#FFF', fontSize: '0.7rem', fontWeight: 800, alignItems: 'center', justifyContent: 'center' }}>4</span>
                  <span>Visit Timing & Slot *</span>
                </label>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>Instant or Scheduled</span>
              </div>

              {/* Instant vs Schedule Toggle Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setBookingType('Instant')}
                  style={{
                    padding: '0.55rem 0.65rem',
                    borderRadius: 10,
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    border: bookingType === 'Instant' ? '2px solid #D97706' : '1px solid #CBD5E1',
                    background: bookingType === 'Instant' ? '#FEF3C7' : '#FFFFFF',
                    color: bookingType === 'Instant' ? '#92400E' : '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.15rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    ⚡ Instant (ASAP)
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 500, color: '#B45309' }}>
                    Emergency / Urgent nurse
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBookingType('Scheduled')}
                  style={{
                    padding: '0.55rem 0.65rem',
                    borderRadius: 10,
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    border: bookingType === 'Scheduled' ? '2px solid #0284C7' : '1px solid #CBD5E1',
                    background: bookingType === 'Scheduled' ? '#EFF6FF' : '#FFFFFF',
                    color: bookingType === 'Scheduled' ? '#0369A1' : '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.15rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    📅 Schedule Slot
                  </span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 500, color: '#0284C7' }}>
                    Choose date & 2-hr slot
                  </span>
                </button>
              </div>

              {bookingType === 'Instant' ? (
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} style={{ color: '#D97706', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.76rem', color: '#92400E' }}>
                    <strong>Instant Nurse Request:</strong> We will dispatch the closest available certified nurse to your address immediately.
                  </div>
                </div>
              ) : (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '0.75rem 0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem', display: 'block' }}>
                        Preferred Date *
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={selectedScheduledDate}
                        onChange={(e) => setSelectedScheduledDate(e.target.value)}
                        className="form-control"
                        style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem', borderRadius: 8 }}
                      />
                      <div style={{ fontSize: '0.72rem', color: '#0284C7', fontWeight: 700, marginTop: '0.25rem' }}>
                        📅 Date: {formatDateDDMMYY(selectedScheduledDate)}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem', display: 'block' }}>
                        2-Hour Window Slot *
                      </label>
                      <select
                        value={selectedSlot}
                        onChange={(e) => setSelectedSlot(e.target.value)}
                        className="form-control"
                        style={{ fontSize: '0.82rem', padding: '0.45rem 0.65rem', borderRadius: 8 }}
                      >
                        {TIME_SLOTS.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#0284C7', fontWeight: 600 }}>
                    ✓ Nurse will arrive during your selected 2-hour window ({selectedSlot})
                  </div>
                </div>
              )}
            </div>

            {/* 5. Promo Code Section */}
            <div 
              style={{ 
                background: '#F8FAFC', 
                border: '1px dashed #CBD5E1', 
                borderRadius: 12, 
                padding: '0.65rem 0.85rem', 
                marginBottom: '1rem' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: appliedPromo ? '0.35rem' : '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-navy-950)' }}>
                  <Tag size={13} style={{ color: '#E63946' }} />
                  <span>HAVE A PROMO CODE?</span>
                </div>
                {appliedPromo && (
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#EF4444',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Remove Code
                  </button>
                )}
              </div>

              {appliedPromo ? (
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    background: '#ECFDF5', 
                    border: '1px solid #A7F3D0', 
                    borderRadius: 8, 
                    padding: '0.45rem 0.65rem',
                    fontSize: '0.78rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 size={15} style={{ color: '#059669', flexShrink: 0 }} />
                    <span style={{ color: '#065F46', fontWeight: 600 }}>
                      <strong>{appliedPromo.code}</strong> applied ({appliedPromo.description})
                    </span>
                  </div>
                  <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.85rem' }}>
                    -₹{appliedPromo.discountRupees}
                  </span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.45rem' }}>
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value.toUpperCase());
                        setPromoError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyPromo(promoInput);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.82rem',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        textTransform: 'uppercase',
                        fontWeight: 700,
                        letterSpacing: '0.04em'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyPromo(promoInput)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: 'var(--primary-navy-950)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        transition: 'opacity 0.2s'
                      }}
                    >
                      Apply
                    </button>
                  </div>

                  {promoError && (
                    <div style={{ fontSize: '0.72rem', color: '#DC2626', marginBottom: '0.35rem', fontWeight: 600 }}>
                      {promoError}
                    </div>
                  )}

                  <div style={{ marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowCoupons(!showCoupons)}
                      className="btn btn-outline btn-sm"
                      style={{ width: '100%', borderRadius: 8, fontSize: '0.8rem', padding: '0.4rem', border: '1px dashed #94A3B8' }}
                    >
                      {showCoupons ? 'Hide Coupons' : 'View Available Coupons'}
                    </button>
                    {showCoupons && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                        {couponList
                          .filter((c) => c.status === 'Active' && (c.showInBookingModal === true || c.description.includes('[SHOW_IN_MODAL]') || !couponList.some(k => k.status === 'Active' && (k.showInBookingModal || k.description.includes('[SHOW_IN_MODAL]')))))
                          .map((cpn) => (
                            <div key={cpn.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                              <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span>{cpn.code}</span>
                                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '1px 6px', borderRadius: 4 }}>
                                    {cpn.discountType === 'percent' ? `${cpn.discountValue}% OFF` : `₹${cpn.discountValue} OFF`}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{cpn.description.replace('[SHOW_IN_MODAL]', '').trim()}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  handleApplyPromo(cpn.code);
                                  setShowCoupons(false);
                                }}
                                className="btn btn-sm"
                                style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: 9999 }}
                              >
                                Apply
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Single Powerful CTA Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="booking-cta-btn"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Routing to Nearest Nurse...</span>
                </>
              ) : (
                <>
                  <span>
                    Confirm Booking{(serviceId as string) === 'other' ? '' : (finalFee > 0 ? ` • ₹${finalFee}` : '')}
                    {appliedPromo && (serviceId as string) !== 'other' && (
                      <span style={{ fontSize: '0.8rem', opacity: 0.85, marginLeft: '0.4rem', fontWeight: 500, textDecoration: 'line-through' }}>
                        ₹{baseFee}
                      </span>
                    )}
                  </span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>

            {/* Minimalist Micro Reassurance */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', marginTop: '0.65rem', fontSize: '0.74rem', color: 'var(--neutral-500)' }}>
              <ShieldCheck size={14} style={{ color: '#059669' }} />
              <span>Zero advance deposit • {(serviceId as string) === 'other' ? 'Verified clinical care' : (baseFee === 0 ? 'Verified clinical care' : 'Pay after visit completed')} • Sterile sealed consumables</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
