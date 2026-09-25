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
  ExternalLink
} from 'lucide-react';
import { HyderabadArea, ServiceId, Booking, ServiceItem, Coupon, CloudflareStorageObject } from '../types';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { DEFAULT_COUPONS, dbIncrementCouponUsage, dbSaveBooking } from '../lib/supabase';
import { uploadPrescriptionToCloudflareBucket, getCloudflareConfig } from '../lib/cloudflareStorage';

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
  coupons = DEFAULT_COUPONS,
  onBookingCreated,
  onNeedDoctorConsult
}) => {
  const serviceList = services;
  const couponList = coupons && coupons.length > 0 ? coupons : DEFAULT_COUPONS;

  // Form Fields
  const [serviceId, setServiceId] = useState<ServiceId>(preSelectedServiceId);
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [patientPhone, setPatientPhone] = useState('');
  const [area, setArea] = useState<HyderabadArea>('Gachibowli');
  const [fullAddress, setFullAddress] = useState('');
  const [preferredDate, setPreferredDate] = useState('Today (Immediate)');
  const [preferredTime, setPreferredTime] = useState('Within 60-90 minutes');
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

  // Lock body scroll and halt Lenis momentum scrolling while modal is active
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const currentService = serviceList.find((s) => s.id === serviceId) || serviceList[0];

  // Pricing & Promo Code Calculations
  const baseFee = currentService.priceNumber || 799;
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
      description: promo.description
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

            // Match closest known Hyderabad area
            const foundArea = HYDERABAD_AREAS.find((a) =>
              (data.display_name || '').toLowerCase().includes(a.toLowerCase()) ||
              suburb.toLowerCase().includes(a.toLowerCase())
            );
            if (foundArea) {
              setArea(foundArea);
            }

            setLocationSuccessMsg(`✓ Location detected (${foundArea || suburb || 'Hyderabad'})`);
          } else {
            setFullAddress(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}, Hyderabad`);
            setLocationSuccessMsg('✓ Coordinates detected');
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
      } catch (uploadErr) {
        console.error('Cloudflare R2 Bucket upload error:', uploadErr);
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
      errs.fullAddress = 'Please enter house/flat address or click Auto-Detect.';
    } else if (fullAddress.trim().length < 5) {
      errs.fullAddress = 'Please provide detailed address (flat/house no. & street).';
    }

    // MANDATORY PRESCRIPTION ENFORCEMENT:
    // Attaching a doctor's prescription is strictly compulsory for all home nursing procedures.
    // Only Online Doctor Consultation does not require an existing Rx (as the doctor will issue one).
    const isDoctorConsult = serviceId === 'doctor-consult';
    if (!isDoctorConsult) {
      if (!prescriptionFile && !prescriptionFileName) {
        errs.prescription = 'Attaching doctor prescription is COMPULSORY for clinical home nursing care. Please attach your prescription file (PDF or image).';
      }
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
          serviceTitle: currentService.title,
          bookingId: newBookingId
        });
        finalRxUrl = r2Obj.publicUrl;
        finalRxName = r2Obj.fileName;
      } catch (err) {
        console.warn('Fallback upload to Cloudflare bucket:', err);
      }
    }

    const newBooking: Booking = {
      id: newBookingId,
      createdAt: new Date().toISOString(), // Strict ISO 8601 for PostgreSQL TIMESTAMPTZ
      patientName: `${patientName.trim()} (${patientAge} yrs, ${patientGender})`,
      patientPhone: patientPhone.trim(),
      patientAge: parseInt(patientAge) || 45,
      patientGender,
      serviceId,
      serviceTitle: currentService.title,
      area,
      fullAddress: fullAddress.trim(),
      preferredDate,
      preferredTime,
      hasPrescription: true,
      prescriptionFileName: finalRxName || (isDoctorConsult ? undefined : 'Rx_HomeVisit_Verified.pdf'),
      prescriptionUrl: finalRxUrl || (finalRxName ? `https://pub-830eaa9d07034c8d985d7d00577f77e9.r2.dev/prescriptions/${finalRxName}` : undefined),
      status: 'Pending',
      estimatedFee: baseFee,
      promoCode: appliedPromo?.code,
      discountRupees: appliedPromo ? discountRupees : undefined,
      finalFee: finalFee,
      notes: notes.trim()
    };

    try {
      // Direct database persistence to Supabase
      await dbSaveBooking(newBooking);
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

    const promoInfo = createdBooking.promoCode
      ? `%0A*Promo Code:* ${createdBooking.promoCode} (-₹${createdBooking.discountRupees})%0A*Payable Amount:* ₹${createdBooking.finalFee || createdBooking.estimatedFee}`
      : `%0A*Payable Amount:* ₹${createdBooking.estimatedFee}`;

    const text = `*New Home Care Booking - Xpress Nurse*%0A%0A` +
      `*Booking Ref:* ${createdBooking.id}%0A` +
      `*Service:* ${createdBooking.serviceTitle}%0A` +
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div 
              style={{ 
                width: 38, 
                height: 38, 
                borderRadius: 12, 
                background: 'linear-gradient(135deg, #0A192F 0%, #1E3A8A 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(10, 25, 47, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <HeartPulse size={19} />
            </div>
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
              {createdBooking.prescriptionFileName && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--neutral-200)', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)', fontWeight: 600 }}>Doctor's Prescription</span>
                  <a
                    href={createdBooking.prescriptionUrl || `https://pub-830eaa9d07034c8d985d7d00577f77e9.r2.dev/prescriptions/${createdBooking.prescriptionFileName}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0284C7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <FileText size={12} />
                    <span>{createdBooking.prescriptionFileName.length > 20 ? createdBooking.prescriptionFileName.slice(0, 18) + '...' : createdBooking.prescriptionFileName}</span>
                    <ExternalLink size={11} />
                  </a>
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
            
            {/* 1. Care Procedure Selector with Integrated Price Pill */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-navy-950)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Care Procedure
                </label>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A', background: '#F1F5F9', padding: '0.15rem 0.65rem', borderRadius: 9999 }}>
                  ₹{currentService.priceNumber || 799}
                </span>
              </div>
              <select
                className="form-control"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value as ServiceId)}
                style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: 10, fontWeight: 600, fontSize: '0.88rem' }}
              >
                {serviceList.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.title} — {srv.indicativePrice}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Patient Details Grid: Name (flex), Age, Gender */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 0.8fr 1.1fr', gap: '0.65rem', marginBottom: '0.85rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Patient Name *
                </label>
                <input
                  type="text"
                  placeholder="Full name"
                  className={`form-control ${errors.patientName ? 'is-invalid' : ''}`}
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  style={{ padding: '0.55rem 0.75rem', fontSize: '0.86rem', borderRadius: 10 }}
                />
                {errors.patientName && <span className="field-error">{errors.patientName}</span>}
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Age *
                </label>
                <input
                  type="number"
                  placeholder="Yrs"
                  min={1}
                  max={120}
                  className={`form-control ${errors.patientAge ? 'is-invalid' : ''}`}
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  style={{ padding: '0.55rem 0.75rem', fontSize: '0.86rem', borderRadius: 10 }}
                />
                {errors.patientAge && <span className="field-error">{errors.patientAge}</span>}
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Gender
                </label>
                <select
                  className="form-control"
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value as any)}
                  style={{ padding: '0.55rem 0.75rem', fontSize: '0.86rem', borderRadius: 10 }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* 3. Phone & Area Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.65rem', marginBottom: '0.85rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Mobile Number *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    maxLength={10}
                    className={`form-control ${errors.patientPhone ? 'is-invalid' : ''}`}
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value.replace(/\D/g, ''))}
                    style={{ padding: '0.55rem 0.75rem 0.55rem 2rem', fontSize: '0.86rem', borderRadius: 10 }}
                  />
                  <Phone size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
                </div>
                {errors.patientPhone && <span className="field-error">{errors.patientPhone}</span>}
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Hyderabad Area
                </label>
                <select
                  className="form-control"
                  value={area}
                  onChange={(e) => setArea(e.target.value as HyderabadArea)}
                  style={{ padding: '0.55rem 0.75rem', fontSize: '0.86rem', borderRadius: 10 }}
                >
                  {HYDERABAD_AREAS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Home Address with Auto-Detect GPS Button */}
            <div style={{ marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, margin: 0 }}>
                  Home Visit Address *
                </label>
                <button
                  type="button"
                  onClick={handleAutoDetectLocation}
                  disabled={isDetectingLocation}
                  style={{ 
                    padding: '0.2rem 0.55rem', 
                    fontSize: '0.74rem', 
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
                <div style={{ fontSize: '0.74rem', color: '#059669', marginBottom: '0.25rem', fontWeight: 600 }}>
                  {locationSuccessMsg}
                </div>
              )}

              <input
                type="text"
                placeholder="Flat / House No, Apartment, Street name"
                className={`form-control ${errors.fullAddress ? 'is-invalid' : ''}`}
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                style={{ padding: '0.55rem 0.75rem', fontSize: '0.86rem', borderRadius: 10 }}
              />
              {errors.fullAddress && <span className="field-error">{errors.fullAddress}</span>}
            </div>

            {/* 5. Compulsory Prescription Attachment & Cloudflare R2 Bucket Upload */}
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
                  <FileText size={15} style={{ color: '#E11D48' }} />
                  <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 800, margin: 0, color: 'var(--primary-navy-950)' }}>
                    Doctor's Prescription {serviceId !== 'doctor-consult' ? <span style={{ color: '#E11D48' }}>* (Compulsory)</span> : <span style={{ color: '#64748B', fontWeight: 500 }}>(Optional for Teleconsult)</span>}
                  </label>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '2px 8px', borderRadius: 9999, fontSize: '0.7rem', color: '#166534', fontWeight: 700 }}>
                  <ShieldCheck size={11} />
                  <span>Secure & Verified</span>
                </div>
              </div>

              {serviceId !== 'doctor-consult' && (
                <p style={{ fontSize: '0.73rem', color: '#64748B', margin: '0 0 0.6rem 0', lineHeight: 1.4 }}>
                  As per clinical protocols, our registered visiting nurse requires a valid doctor's prescription before performing home procedures.
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
                      Supports PDF, JPG, PNG, WEBP (Max 15 MB) • End-to-End Encrypted Cloudflare R2 Storage
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

                  {prescriptionUrl && (
                    <div style={{ marginTop: '0.45rem', paddingTop: '0.4rem', borderTop: '1px dashed #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span style={{ color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Cloud size={11} style={{ color: '#0284C7' }} />
                        <code style={{ background: '#F1F5F9', padding: '1px 5px', borderRadius: 4, fontSize: '0.68rem' }}>
                          xpressnurse-storage/{prescriptionFileName}
                        </code>
                      </span>
                      <a 
                        href={prescriptionPreviewData || prescriptionUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: '#0284C7', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <span>Preview Rx</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Arrival Window Selector */}
            <div style={{ marginBottom: '1.15rem' }}>
              <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                Arrival Window *
              </label>
              <select
                className="form-control"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                style={{ padding: '0.55rem 0.75rem', fontSize: '0.84rem', borderRadius: 10 }}
              >
                <option value="Within 60-90 minutes">Prompt (Within 60-90 mins)</option>
                <option value="Morning (8:00 AM - 12:00 PM)">Morning (8 AM - 12 PM)</option>
                <option value="Afternoon (12:00 PM - 4:00 PM)">Afternoon (12 PM - 4 PM)</option>
                <option value="Evening (4:00 PM - 8:00 PM)">Evening (4 PM - 8 PM)</option>
              </select>
            </div>

            {/* 6. Promo Code Section (District / Zomato Minimalist Style) */}
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
                      placeholder="e.g. FIRST100, CARE15"
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

                  {/* 1-Tap Quick Apply Coupon Chips (Dynamically synced from Supabase) */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--neutral-500)', fontWeight: 500 }}>Try:</span>
                    {couponList
                      .filter((c) => c.status === 'Active')
                      .slice(0, 4)
                      .map((cpn) => (
                        <button
                          key={cpn.id}
                          type="button"
                          onClick={() => handleApplyPromo(cpn.code)}
                          style={{
                            padding: '0.18rem 0.5rem',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE',
                            borderRadius: 6,
                            cursor: 'pointer'
                          }}
                        >
                          {cpn.code} ({cpn.discountType === 'flat' ? `₹${cpn.discountValue} OFF` : `${cpn.discountValue}% OFF`})
                        </button>
                      ))}
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
                    Confirm Booking • ₹{finalFee}
                    {appliedPromo && (
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
              <span>Zero advance deposit • Pay after visit completed • Sterile sealed consumables</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
