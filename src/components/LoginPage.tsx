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
  EyeOff
} from 'lucide-react';
import { dbVerifyUserPin } from '../lib/supabase';
import { AppUser } from '../types';

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

  // Switch roles and reset inputs cleanly (no pins or ids shown)
  const handleRoleChange = (newRole: LoginRole) => {
    setRole(newRole);
    setIdentifier('');
    setPin('');
    setErrorMsg('');
    setSuccessMsg('');
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
                <span>Authenticating with Database...</span>
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

          {/* Security & Compliance Footer */}
          <div className="login-card-footer">
            <ShieldCheck size={16} style={{ color: 'var(--success-green)' }} />
            <span>256-Bit Encrypted • DPDP Act & NABH Hospital Asepsis Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};
