import React from 'react';
import { ShieldAlert, Lock, ArrowRight, Home } from 'lucide-react';
import { AppUser } from '../types';

interface AuthGuardProps {
  user: AppUser | null;
  requiredRole: 'admin' | 'nurse' | 'doctor';
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  user,
  requiredRole,
  onNavigate,
  children
}) => {
  // If not logged in
  if (!user) {
    return (
      <div className="auth-guard-container" style={{
        minHeight: '75vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem'
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          background: 'var(--surface-card, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '16px',
          padding: '2.5rem',
          textAlign: 'center',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto'
          }}>
            <Lock size={32} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1e293b' }}>
            Authentication Required
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            The <strong>{requiredRole.toUpperCase()}</strong> portal is strictly protected by server-side authorization. Please log in with authorized credentials to access clinical or administrative records.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => onNavigate('/login')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.875rem 1.5rem',
                background: 'var(--primary-color, #0284c7)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              <span>Log in to {requiredRole.toUpperCase()} Portal</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => onNavigate('/')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontWeight: 500,
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              <Home size={18} />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user is logged in, but role is insufficient
  // Admin is superuser and can inspect nurse/doctor portals
  const hasAccess = user.role === requiredRole || user.role === 'admin';

  if (!hasAccess) {
    return (
      <div className="auth-guard-container" style={{
        minHeight: '75vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem'
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          background: 'var(--surface-card, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '16px',
          padding: '2.5rem',
          textAlign: 'center',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto'
          }}>
            <ShieldAlert size={32} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1e293b' }}>
            Access Denied
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            You are logged in as <strong>{user.name} ({user.role.toUpperCase()})</strong>. This account does not have sufficient permissions to view the <strong>{requiredRole.toUpperCase()}</strong> portal.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => onNavigate('/login')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.875rem 1.5rem',
                background: 'var(--primary-color, #0284c7)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              <span>Switch Account</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => onNavigate('/')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                color: '#64748b',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontWeight: 500,
                fontSize: '0.95rem',
                cursor: 'pointer'
              }}
            >
              <Home size={18} />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
