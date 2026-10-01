import { describe, it, expect } from 'vitest';
import { AppUser } from '../src/types';

describe('Role-Based Access Control (RBAC) & Portal Authorization', () => {
  // Authorization helper matching AuthGuard rules
  function isRouteAuthorized(user: AppUser | null, allowedRoles: AppUser['role'][]): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true; // Admins have master supervision capability
    return allowedRoles.includes(user.role);
  }

  const mockAdmin: AppUser = {
    id: 'user-admin-1',
    role: 'admin',
    identifier: 'admin@xpressnurse.in',
    name: 'Admin User',
    pin: '••••'
  };

  const mockNurse: AppUser = {
    id: 'user-nurse-1',
    role: 'nurse',
    identifier: 'nurse@xpressnurse.in',
    name: 'Nurse User',
    pin: '••••'
  };

  const mockDoctor: AppUser = {
    id: 'user-doc-1',
    role: 'doctor',
    identifier: 'doc@xpressnurse.in',
    name: 'Doctor User',
    pin: '••••'
  };

  const mockPatient: AppUser = {
    id: 'user-patient-1',
    role: 'patient',
    identifier: '9876543210',
    name: 'Patient User',
    pin: '••••'
  };

  describe('Admin Portal Route Protection (/admin)', () => {
    it('allows admin users access', () => {
      expect(isRouteAuthorized(mockAdmin, ['admin'])).toBe(true);
    });

    it('denies nurse users access', () => {
      expect(isRouteAuthorized(mockNurse, ['admin'])).toBe(false);
    });

    it('denies doctor users access', () => {
      expect(isRouteAuthorized(mockDoctor, ['admin'])).toBe(false);
    });

    it('denies patient users access', () => {
      expect(isRouteAuthorized(mockPatient, ['admin'])).toBe(false);
    });

    it('denies unauthenticated users access', () => {
      expect(isRouteAuthorized(null, ['admin'])).toBe(false);
    });
  });

  describe('Nurse Portal Route Protection (/nurse)', () => {
    it('allows nurse users access', () => {
      expect(isRouteAuthorized(mockNurse, ['nurse'])).toBe(true);
    });

    it('allows admin supervisor access', () => {
      expect(isRouteAuthorized(mockAdmin, ['nurse'])).toBe(true);
    });

    it('denies doctor users access', () => {
      expect(isRouteAuthorized(mockDoctor, ['nurse'])).toBe(false);
    });

    it('denies patient users access', () => {
      expect(isRouteAuthorized(mockPatient, ['nurse'])).toBe(false);
    });

    it('denies unauthenticated users access', () => {
      expect(isRouteAuthorized(null, ['nurse'])).toBe(false);
    });
  });

  describe('Doctor Consultation Portal Route Protection (/doctor)', () => {
    it('allows doctor users access', () => {
      expect(isRouteAuthorized(mockDoctor, ['doctor'])).toBe(true);
    });

    it('allows admin supervisor access', () => {
      expect(isRouteAuthorized(mockAdmin, ['doctor'])).toBe(true);
    });

    it('denies nurse users access', () => {
      expect(isRouteAuthorized(mockNurse, ['doctor'])).toBe(false);
    });

    it('denies patient users access', () => {
      expect(isRouteAuthorized(mockPatient, ['doctor'])).toBe(false);
    });

    it('denies unauthenticated users access', () => {
      expect(isRouteAuthorized(null, ['doctor'])).toBe(false);
    });
  });
});
