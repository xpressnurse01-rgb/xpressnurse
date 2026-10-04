import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  User, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Stethoscope, 
  UserCheck, 
  KeyRound,
  ArrowLeft,
  Eye,
  EyeOff,
  UploadCloud,
  FileText,
  Sparkles
} from 'lucide-react';
import { 
  supabase,
  dbVerifyUserPin, 
  dbInsertNurse, 
  dbInsertAppUser, 
  dbInsertLead, 
  dbUpdateNurseById, 
  findNurseByReferralCode, 
  generateNurseReferralCode 
} from '../lib/supabase';
import { uploadToCloudflareStorage } from '../lib/cloudflareStorage';
import { AppUser, NurseProfile, NurseLead } from '../types';

interface LoginPageProps {
  onNavigate: (path: string) => void;
  onLoginSuccess?: (user: AppUser) => void;
  nurses?: NurseProfile[];
  onRefreshNurses?: () => void;
}

type LoginRole = 'nurse' | 'doctor' | 'admin';

export const LoginPage: React.FC<LoginPageProps> = ({ 
  onNavigate, 
  onLoginSuccess,
  nurses = [],
  onRefreshNurses
}) => {
  const [role, setRole] = useState<LoginRole>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const portal = (urlParams.get('portal') || urlParams.get('role'))?.toLowerCase();
        if (portal === 'admin' || portal === 'doctor' || portal === 'nurse') {
          return portal as LoginRole;
        }
      }
    } catch {}
    return 'nurse';
  });
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Nurse Registration States
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regExperienceYears, setRegExperienceYears] = useState<number>(3);
  const [regServiceArea, setRegServiceArea] = useState<string>('Gachibowli');
  const [regQualification, setRegQualification] = useState<string>('B.Sc Nursing (Registered RN)');
  const [regReferralCode, setRegReferralCode] = useState('');
  const [regCertificate, setRegCertificate] = useState<File | null>(null);
  const [regDisclaimer, setRegDisclaimer] = useState(false);

  // Check URL query parameters for portal / role or referral link (e.g. ?portal=admin or ?ref=XN-PRIYA101)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const portal = (urlParams.get('portal') || urlParams.get('role'))?.toLowerCase();
      if (portal === 'admin' || portal === 'doctor' || portal === 'nurse') {
        setRole(portal as LoginRole);
      }
      const refCode = urlParams.get('ref') || urlParams.get('referral');
      if (refCode) {
        setRole('nurse');
        setIsRegistering(true);
        setRegReferralCode(refCode.trim().toUpperCase());
      }
    } catch {
      // ignore
    }
  }, []);

  const activeNursesList = nurses || [];
  const matchedReferringNurse = regReferralCode.trim()
    ? findNurseByReferralCode(regReferralCode.trim(), activeNursesList)
    : undefined;

  // Switch roles and reset inputs cleanly (no pins or ids shown)
  const handleRoleChange = (newRole: LoginRole) => {
    setRole(newRole);
    setIdentifier('');
    setPin('');
    setErrorMsg('');
    setSuccessMsg('');
    setIsRegistering(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!regName.trim() || !regPhone.trim() || !regEmail.trim()) {
      setErrorMsg('Please fill in all personal details.');
      return;
    }
    if (!/^\d{4}$/.test(regPin)) {
      setErrorMsg('PIN must be exactly 4 numeric digits.');
      return;
    }
    if (!regCertificate) {
      setErrorMsg('Please upload your nursing certificate.');
      return;
    }
    if (!regDisclaimer) {
      setErrorMsg('You must agree to the clinical disclaimer.');
      return;
    }

    setIsLoading(true);
    try {
      let certUrl = '';
      if (regCertificate) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(regCertificate);
        });
        
        if (dataUrl) {
          const uploadRes = await uploadToCloudflareStorage({
            fileName: regCertificate.name,
            category: 'certificates',
            contentType: regCertificate.type,
            sizeBytes: regCertificate.size,
            dataUrl
          });
          certUrl = uploadRes.publicUrl;
        }
      }

      const newId = `NUR-${Math.floor(1000 + Math.random() * 9000)}`;
      const myReferralCode = generateNurseReferralCode(regName.trim(), newId, regPhone.trim());
      
      const cleanPhone = regPhone.replace(/\D/g, '');
      const cleanEmail = regEmail.trim().toLowerCase();
      const newNurse: NurseProfile = {
        id: newId,
        name: regName.trim(),
        phone: cleanPhone || regPhone.trim(),
        email: cleanEmail,
        experienceYears: Number(regExperienceYears) || 1,
        qualification: regQualification.trim() || 'Registered Nurse (B.Sc)',
        serviceArea: regServiceArea || 'Gachibowli',
        pin: regPin.trim(),
        status: 'Pending Verification',
        totalLeads: 0,
        convertedLeads: 0,
        totalReferrals: 0,
        pointsEarned: 300,
        referralEarningsRupees: 0,
        rating: 4.9,
        certificateVerified: false,
        certificateUrl: certUrl,
        createdAt: new Date().toISOString(),
        referredByNurseId: matchedReferringNurse?.id || undefined,
        referredByNurseName: matchedReferringNurse?.name || undefined,
        referralCode: myReferralCode
      };
      
      const newAppUser: AppUser = {
        id: newId,
        role: 'nurse',
        identifier: cleanEmail,
        name: regName.trim(),
        pin: regPin.trim(),
        phone: cleanPhone || regPhone.trim(),
        email: cleanEmail,
        designation: regQualification.trim() || 'Registered Nurse (B.Sc)',
        serviceArea: regServiceArea || 'Gachibowli'
      };
      
      await dbInsertNurse(newNurse);
      await dbInsertAppUser(newAppUser);

      // Record referral in leads table so referring nurse and admin track it in real-time
      if (matchedReferringNurse) {
        const refLead: NurseLead = {
          id: `RN-${Date.now().toString().slice(-6)}`,
          nurseId: matchedReferringNurse.id,
          nurseName: matchedReferringNurse.name,
          patientName: regName.trim(),
          patientPhone: regPhone.trim(),
          area: regServiceArea || 'Gachibowli',
          qualification: 'Registered Nurse',
          status: 'Pending Approval',
          leadValueRupees: 500,
          pointsAwarded: 50,
          referralCommissionRupees: 500,
          referralType: 'nurse',
          referredNurseName: regName.trim(),
          referredNursePhone: regPhone.trim(),
          submittedAt: new Date().toISOString()
        };
        await dbInsertLead(refLead);

        // Update referring nurse pending stats in DB (Points are credited strictly AFTER Admin approval)
        await dbUpdateNurseById(matchedReferringNurse.id, {
          totalReferrals: (matchedReferringNurse.totalReferrals || 0) + 1
        });
      }
      
      onRefreshNurses?.();
      setIsLoading(false);
      setSuccessMsg(matchedReferringNurse 
        ? `Application submitted with referral from ${matchedReferringNurse.name}! Profile pending verification.`
        : 'Registration submitted! Your profile is pending Admin approval.'
      );
      setRegName(''); setRegPhone(''); setRegEmail(''); setRegPin(''); setRegCertificate(null); setRegDisclaimer(false); setRegReferralCode(''); setRegExperienceYears(3); setRegServiceArea('Gachibowli');
      setTimeout(() => setIsRegistering(false), 3000);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg('Error submitting application. Please try again.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!identifier.trim()) {
      setErrorMsg('Please enter your registered staff email or phone number.');
      return;
    }

    const cleanPin = pin.trim();
    if (!cleanPin) {
      setErrorMsg('Please enter your 4-digit security PIN.');
      return;
    }

    if (!/^\d{4}$/.test(cleanPin)) {
      setErrorMsg('PIN must be exactly 4 numeric digits (0-9).');
      return;
    }

    setIsLoading(true);

    try {
      // Authenticate strictly against the active portal role (nurse, doctor, or admin)
      const authResult = await dbVerifyUserPin(role, identifier.trim(), cleanPin);

      if (!authResult.success) {
        setIsLoading(false);
        setErrorMsg(authResult.message);
        return;
      }

      const matchedUser = authResult.user;
      const detectedRole = (matchedUser?.role as LoginRole) || role;

      if (detectedRole === 'nurse' && matchedUser) {
        try {
          const { data: nurseData } = await supabase
            .from('nurses')
            .select('id, name, phone, email, status')
            .or(`id.eq.${matchedUser.id},phone.eq.${matchedUser.phone || matchedUser.identifier},email.eq.${matchedUser.email || matchedUser.identifier}`)
            .limit(1)
            .maybeSingle();

          if (!nurseData) {
            setIsLoading(false);
            setErrorMsg('Access denied. This nurse profile has been removed or deleted.');
            return;
          }

          if (nurseData.status === 'Pending Verification') {
            setIsLoading(false);
            setErrorMsg('Your profile is pending Admin verification. Please wait for approval before logging in.');
            return;
          }

          if (nurseData.status !== 'Active') {
            setIsLoading(false);
            setErrorMsg(`Access denied. Nurse profile status is "${nurseData.status}". Only Active nurses can log in.`);
            return;
          }
        } catch (err) {
          const nurseProfile = activeNursesList.find(n => 
            n.id === matchedUser.id || 
            (n.phone && matchedUser.phone && n.phone.replace(/\D/g, '') === matchedUser.phone.replace(/\D/g, ''))
          );
          if (!nurseProfile) {
            setIsLoading(false);
            setErrorMsg('Access denied. This nurse profile has been removed or deleted.');
            return;
          }
          if (nurseProfile.status === 'Pending Verification') {
            setIsLoading(false);
            setErrorMsg('Your profile is pending Admin verification. Please wait for approval before logging in.');
            return;
          }
          if (nurseProfile.status !== 'Active') {
            setIsLoading(false);
            setErrorMsg(`Access denied. Nurse profile status is "${nurseProfile.status}".`);
            return;
          }
        }
      }

      setIsLoading(false);
      setSuccessMsg(`Welcome, ${matchedUser?.name || 'Staff Member'}! Redirecting to ${detectedRole.toUpperCase()} Dashboard...`);

      if (matchedUser) {
        const { pin: _pin, ...safeUser } = matchedUser;
        localStorage.setItem('xn_auth_user', JSON.stringify(safeUser));
        if (detectedRole === 'nurse') {
          localStorage.setItem('xn_active_nurse_id', matchedUser.id);
        }
        if (onLoginSuccess) {
          onLoginSuccess(matchedUser);
        }
      }

      setTimeout(() => {
        if (detectedRole === 'nurse') {
          onNavigate('/nurse');
        } else if (detectedRole === 'doctor') {
          onNavigate('/doctor');
        } else if (detectedRole === 'admin') {
          onNavigate('/admin');
        } else {
          onNavigate('/admin');
        }
      }, 100);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Authentication error. Please try again.');
    }
  };

  return (
    <div className="login-page-wrap">
      <div className="container" style={{ maxWidth: 480, padding: '3rem 1.25rem' }}>
        {/* Back Link */}
        <button
          onClick={() => onNavigate('/')}
          className="btn btn-outline btn-sm"
          style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </button>

        {/* Login Card */}
        <div className="login-card">
          {/* Header */}
          <div className="login-card-header">
            <div className="brand-logo" style={{ justifyContent: 'center', marginBottom: '0.75rem' }}>
              <div className="logo-badge" style={{ width: 42, height: 42 }}>
                <HeartPulse size={22} />
              </div>
              <div className="brand-text" style={{ textAlign: 'left' }}>
                <div className="brand-title" style={{ fontSize: '1.35rem' }}>
                  Xpress<span>Nurse</span>
                </div>
                <div className="brand-subtitle">Clinical Portal Access</div>
              </div>
            </div>

            <h1 style={{ fontSize: '1.25rem', color: 'var(--primary-navy-900)', fontWeight: 700, marginBottom: '0.35rem' }}>
              Sign In to Your Account
            </h1>
            <p style={{ fontSize: '0.86rem', color: 'var(--neutral-500)', margin: 0 }}>
              Secure access for certified nurses, doctors, and medical administrators
            </p>
          </div>

          {/* Role Switcher Tabs */}
          <div className="login-role-tabs">
            <button
              type="button"
              className={`login-role-tab ${role === 'nurse' ? 'active' : ''}`}
              onClick={() => handleRoleChange('nurse')}
            >
              <UserCheck size={15} />
              <span>Nurse</span>
            </button>

            <button
              type="button"
              className={`login-role-tab ${role === 'doctor' ? 'active' : ''}`}
              onClick={() => handleRoleChange('doctor')}
            >
              <Stethoscope size={15} />
              <span>Doctor</span>
            </button>

            <button
              type="button"
              className={`login-role-tab ${role === 'admin' ? 'active' : ''}`}
              onClick={() => handleRoleChange('admin')}
            >
              <KeyRound size={15} />
              <span>Admin</span>
            </button>
          </div>

          {/* Form */}
          {!isRegistering ? (
            <form onSubmit={handleLoginSubmit} className="login-form">
              {/* Error Message */}
              {errorMsg && (
                <div className="login-alert-box error">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Success Message */}
              {successMsg && (
                <div className="login-alert-box success">
                  <CheckCircle2 size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Field: Identifier */}
              <div className="form-group">
                <label className="form-label">
                  {role === 'admin' 
                    ? 'Admin Email / Staff ID' 
                    : role === 'doctor'
                    ? 'Doctor Email or Mobile'
                    : 'Nurse Email or Phone'}
                </label>
                <div className="login-input-wrap">
                  <User size={17} className="input-icon" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={
                      role === 'nurse'
                        ? 'e.g. nurse@xpressnurse.in'
                        : role === 'doctor'
                        ? 'e.g. doctor@xpressnurse.in'
                        : 'e.g. admin@xpressnurse.in'
                    }
                    autoComplete="username"
                    className={`login-input ${errorMsg && !identifier ? 'is-invalid' : ''}`}
                  />
                </div>
              </div>

              {/* Field: 4-Digit Security PIN */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">
                    4-Digit Security PIN
                  </label>
                </div>
                <div className="login-input-wrap" style={{ position: 'relative' }}>
                  <Lock size={17} className="input-icon" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={4}
                    pattern="\d{4}"
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setPin(val);
                    }}
                    placeholder="••••"
                    autoComplete="current-password"
                    style={{ letterSpacing: '0.45rem', fontSize: '1.2rem', fontWeight: 700 }}
                    className={`login-input ${errorMsg && pin.length !== 4 ? 'is-invalid' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--neutral-400)',
                      cursor: 'pointer',
                      padding: 4
                    }}
                    aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginTop: '0.35rem' }}>
                  Enter your confidential 4-digit PIN to authenticate.
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-danger btn-lg"
                style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', gap: '0.5rem' }}
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>
                      Sign In to{' '}
                      {role === 'nurse'
                        ? 'Nurse Dashboard'
                        : role === 'doctor'
                        ? 'Doctor Panel'
                        : 'Admin Dispatch'}
                    </span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="login-form">
              {/* Error Message */}
              {errorMsg && (
                <div className="login-alert-box error">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Success Message */}
              {successMsg && (
                <div className="login-alert-box success">
                  <CheckCircle2 size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  name="nurse_reg_fullname"
                  autoComplete="off"
                  value={regName} 
                  onChange={e => setRegName(e.target.value)} 
                  className="form-control" 
                  placeholder="Nurse Name" 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    name="nurse_reg_email"
                    autoComplete="off"
                    value={regEmail} 
                    onChange={e => setRegEmail(e.target.value)} 
                    className="form-control" 
                    placeholder="nurse.name@gmail.com" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input 
                    type="tel" 
                    name="nurse_reg_phone"
                    autoComplete="off"
                    value={regPhone} 
                    onChange={e => setRegPhone(e.target.value)} 
                    className="form-control" 
                    placeholder="10-digit Mobile" 
                  />
                </div>
              </div>

              {/* Colleague Referral Code Input */}
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 0.35rem 0' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.82rem' }}>
                    <Sparkles size={14} style={{ color: '#9333EA' }} />
                    <span>Colleague Referral Code (Optional)</span>
                  </span>
                  {matchedReferringNurse && (
                    <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 750 }}>
                      ✓ Verified Colleague
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={regReferralCode}
                  onChange={(e) => setRegReferralCode(e.target.value.toUpperCase())}
                  className="form-control"
                  placeholder="e.g. XN-PRIYA101"
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 700,
                    borderColor: matchedReferringNurse ? '#10B981' : undefined,
                    background: matchedReferringNurse ? '#F0FDF4' : undefined
                  }}
                />
                {matchedReferringNurse ? (
                  <div style={{ fontSize: '0.76rem', color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '0.45rem 0.65rem', borderRadius: 8, marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                    <span>
                      Referred by <strong>{matchedReferringNurse.name}</strong> ({matchedReferringNurse.serviceArea}). Joining benefits will be activated!
                    </span>
                  </div>
                ) : regReferralCode.trim().length >= 4 ? (
                  <div style={{ fontSize: '0.74rem', color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '0.35rem 0.65rem', borderRadius: 6, marginTop: '0.35rem' }}>
                    ℹ️ Code not found in registered fleet, but you can continue registration as an individual nurse.
                  </div>
                ) : (
                  <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
                    Enter the referral code sent by an existing nurse to link your registration.
                  </div>
                )}
              </div>

              {/* Service Area & Years of Experience */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Service Area (Hyderabad)</label>
                  <input list="hyderabad-areas" placeholder="Select or enter area"
                    value={regServiceArea}
                    onChange={(e) => setRegServiceArea(e.target.value)}
                    className="form-control"
                    style={{ fontWeight: 600 }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Years of Experience</label>
                  <select
                    value={regExperienceYears}
                    onChange={(e) => setRegExperienceYears(Number(e.target.value))}
                    className="form-control"
                    style={{ fontWeight: 600 }}
                  >
                    <option value="1">1 Year Experience</option>
                    <option value="2">2 Years Experience</option>
                    <option value="3">3 Years Experience</option>
                    <option value="4">4 Years Experience</option>
                    <option value="5">5 Years Experience</option>
                    <option value="6">6 Years Experience</option>
                    <option value="7">7 Years Experience</option>
                    <option value="8">8 Years Experience</option>
                    <option value="9">9 Years Experience</option>
                    <option value="10">10+ Years Experience</option>
                    <option value="15">15+ Years Experience</option>
                  </select>
                </div>
              </div>

              {/* Qualification */}
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Nursing Qualification</label>
                <select
                  value={regQualification}
                  onChange={(e) => setRegQualification(e.target.value)}
                  className="form-control"
                >
                  <option value="B.Sc Nursing (Registered RN)">B.Sc Nursing (Registered RN)</option>
                  <option value="General Nursing & Midwifery (GNM)">General Nursing & Midwifery (GNM)</option>
                  <option value="Post Basic B.Sc Nursing">Post Basic B.Sc Nursing</option>
                  <option value="M.Sc Nursing">M.Sc Nursing</option>
                  <option value="ANM (Auxiliary Nurse)">ANM (Auxiliary Nurse)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Set 4-Digit Security PIN (Used for Staff Login)</label>
                <input 
                  type="password" 
                  maxLength={4} 
                  value={regPin} 
                  onChange={e => setRegPin(e.target.value.replace(/\D/g, ''))} 
                  className="form-control" 
                  placeholder="••••" 
                  style={{ letterSpacing: '0.2rem', fontWeight: 700, fontSize: '1.1rem' }} 
                />
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '0.25rem' }}>
                  Remember this 4-digit PIN along with your phone number for future logins.
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Nursing Certificate Upload (Required)</label>
                <div style={{ background: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: 8, padding: '1rem', textAlign: 'center' }}>
                  <input type="file" id="cert-upload" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { if(e.target.files && e.target.files[0]) setRegCertificate(e.target.files[0]) }} />
                  <label htmlFor="cert-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    {regCertificate ? (
                      <>
                        <FileText size={24} style={{ color: '#0284C7' }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-navy-900)' }}>{regCertificate.name}</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud size={24} style={{ color: '#64748B' }} />
                        <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Click to upload Nursing Certificate</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem', background: '#FEF2F2', padding: '0.85rem', borderRadius: 8, border: '1px solid #FCA5A5' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={regDisclaimer} onChange={e => setRegDisclaimer(e.target.checked)} style={{ marginTop: '0.25rem', transform: 'scale(1.2)' }} />
                  <span style={{ fontSize: '0.88rem', color: '#991B1B', lineHeight: 1.45, fontWeight: 600 }}>
                    I confirm that I am a registered nurse and hold a valid nursing license. I understand that I am solely responsible for the clinical care provided to patients. Xpress Nurse is a technology platform connecting patients with nurses, and I agree to indemnify the platform against any clinical liabilities or malpractices. My submitted credentials are authentic.
                  </span>
                </label>
              </div>

              <button type="submit" disabled={isLoading} className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
                {isLoading ? 'Submitting Application...' : 'Submit Application'}
              </button>
            </form>
          )}

          {/* Registration Toggle for Nurses */}
          {role === 'nurse' && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              {!isRegistering ? (
                <div style={{ fontSize: '0.86rem', color: 'var(--neutral-600)' }}>
                  New to Xpress Nurse?{' '}
                  <button type="button" onClick={() => { setIsRegistering(true); setErrorMsg(''); setSuccessMsg(''); }} style={{ background: 'none', border: 'none', color: '#0284C7', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                    Register as Nurse
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '0.86rem', color: 'var(--neutral-600)' }}>
                  Already registered?{' '}
                  <button type="button" onClick={() => { setIsRegistering(false); setErrorMsg(''); setSuccessMsg(''); }} style={{ background: 'none', border: 'none', color: '#0284C7', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                    Sign In
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Security & Compliance Footer */}
          <div className="login-card-footer">
            <ShieldCheck size={16} style={{ color: 'var(--success-green)' }} />
            <span>Verified Medical Professional Portal • DPDP Act Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};
