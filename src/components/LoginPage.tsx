import React, { useState } from 'react';
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
  FileText
} from 'lucide-react';
import { dbVerifyUserPin, dbInsertNurse, dbInsertAppUser } from '../lib/supabase';
import { uploadToCloudflareStorage } from '../lib/cloudflareStorage';
import { AppUser, NurseProfile } from '../types';

interface LoginPageProps {
  onNavigate: (path: string) => void;
  onLoginSuccess?: (user: AppUser) => void;
}

type LoginRole = 'nurse' | 'doctor' | 'admin';

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onLoginSuccess }) => {
  const [role, setRole] = useState<LoginRole>('nurse');
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
  const [regCertificate, setRegCertificate] = useState<File | null>(null);
  const [regDisclaimer, setRegDisclaimer] = useState(false);

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
      
      const newNurse: NurseProfile = {
        id: newId,
        name: regName.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim(),
        experienceYears: 0,
        qualification: 'Registered Nurse',
        serviceArea: 'Gachibowli',
        status: 'Pending Verification',
        totalLeads: 0,
        convertedLeads: 0,
        totalReferrals: 0,
        pointsEarned: 0,
        referralEarningsRupees: 0,
        rating: 0,
        certificateVerified: false,
        certificateUrl: certUrl,
        createdAt: new Date().toISOString()
      };
      
      const newAppUser: AppUser = {
        id: newId,
        role: 'nurse',
        identifier: regEmail.trim().toLowerCase(),
        name: regName.trim(),
        pin: regPin.trim(),
        phone: regPhone.trim(),
        email: regEmail.trim(),
        designation: 'Registered Nurse',
        serviceArea: 'Hyderabad Central'
      };
      
      await dbInsertNurse(newNurse);
      await dbInsertAppUser(newAppUser);
      
      setIsLoading(false);
      setSuccessMsg('Registration submitted! Your profile is pending Admin approval.');
      setRegName(''); setRegPhone(''); setRegEmail(''); setRegPin(''); setRegCertificate(null); setRegDisclaimer(false);
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
      // Authenticate directly against Supabase database with 4-digit PIN
      const authResult = await dbVerifyUserPin(role, identifier.trim(), cleanPin);

      if (!authResult.success) {
        setIsLoading(false);
        setErrorMsg(authResult.message);
        return;
      }

      setIsLoading(false);
      setSuccessMsg(`Welcome, ${authResult.user?.name || 'Authorized User'}!`);

      if (authResult.user) {
        localStorage.setItem('xn_auth_user', JSON.stringify(authResult.user));
        if (role === 'nurse') {
          localStorage.setItem('xn_active_nurse_id', authResult.user.id);
        }
        if (onLoginSuccess) {
          onLoginSuccess(authResult.user);
        }
      }

      setTimeout(() => {
        if (role === 'nurse') {
          onNavigate('/nurse');
        } else if (role === 'doctor') {
          onNavigate('/doctor');
        } else if (role === 'admin') {
          onNavigate('/admin');
        }
      }, 600);
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
                <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="form-control" placeholder="Nurse Name" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="form-control" placeholder="Email address" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} className="form-control" placeholder="Mobile" />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Set 4-Digit PIN</label>
                <input type="password" maxLength={4} value={regPin} onChange={e => setRegPin(e.target.value.replace(/\D/g, ''))} className="form-control" placeholder="••••" style={{ letterSpacing: '0.2rem' }} />
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
