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
  // Priority 1: Check if the currently supplied user satisfies the required role or is superuser admin
  const directAccess = user && (user.role === requiredRole || (requiredRole !== 'admin' && user.role === 'admin'));

  // Priority 2: If currently supplied user is not authorized, check role-scoped session storage safely
  let effectiveUser = user;
  if (!directAccess) {
    try {
      let rawRole: string | null = null;
      if (requiredRole === 'admin') {
        rawRole =
          sessionStorage.getItem('xn_auth_user_admin') ||
          localStorage.getItem('xn_auth_user_admin');
        if (!rawRole) {
          const tabU = sessionStorage.getItem('xn_auth_user') || localStorage.getItem('xn_auth_user');
          if (tabU && tabU.includes('"role":"admin"')) {
            rawRole = tabU;
          }
        }
      } else {
        const roleKey = `xn_auth_user_${requiredRole}`;
        rawRole =
          sessionStorage.getItem(roleKey) ||
          localStorage.getItem(roleKey) ||
          sessionStorage.getItem('xn_auth_user_admin') ||
          localStorage.getItem('xn_auth_user_admin');
      }

      if (rawRole) {
        const parsed = JSON.parse(rawRole);
        if (parsed && (parsed.role === requiredRole || (requiredRole !== 'admin' && parsed.role === 'admin'))) {
          effectiveUser = parsed;
        }
      }
    } catch {}
  }

  const hasAccess = effectiveUser && (effectiveUser.role === requiredRole || (requiredRole !== 'admin' && effectiveUser.role === 'admin'));

  if (hasAccess) {
    return <>{children}</>;
  }

  // If not logged in at all for this portal
  if (!effectiveUser) {
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
            background: 'rgba(2, 132, 199, 0.1)',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto'
          }}>
            <Lock size={32} />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1e293b' }}>
            {requiredRole.toUpperCase()} Portal Access
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            Please log in with your authorized <strong>{requiredRole.toUpperCase()}</strong> credentials to access clinical or administrative records in this tab.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => onNavigate(`/login?portal=${requiredRole}`)}
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

  // If user is logged in with another role in this tab and no session exists for requiredRole
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
          background: 'rgba(2, 132, 199, 0.1)',
          color: '#0284c7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          <Lock size={32} />
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1e293b' }}>
          Switch to {requiredRole.toUpperCase()} Portal
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          You are currently signed in as <strong>{effectiveUser.name} ({effectiveUser.role.toUpperCase()})</strong>.
          To view the <strong>{requiredRole.toUpperCase()}</strong> portal in this tab, please log in with your {requiredRole} account. (Your other session remains active).
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={() => onNavigate(`/login?portal=${requiredRole}`)}
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
            <span>Log in with {requiredRole.toUpperCase()} Credentials</span>
            <ArrowRight size={18} />
          </button>

          <button
            onClick={() => onNavigate(`/${effectiveUser.role}`)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              color: '#0284c7',
              border: '1px solid #bae6fd',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            <Home size={18} />
            <span>Go to My {effectiveUser.role.toUpperCase()} Dashboard</span>
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
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  );

  return <>{children}</>;
};
