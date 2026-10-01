import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, recordFailedAttempt, clearFailedAttempts } from '../src/lib/auth';

describe('Hardened Authentication & Brute-Force Rate Limiting', () => {
  const testUser = 'nurse.test@xpressnurse.in';

  beforeEach(() => {
    clearFailedAttempts(testUser);
  });

  it('allows initial authentication attempts', () => {
    const status = checkRateLimit(testUser);
    expect(status.isLocked).toBe(false);
    expect(status.remainingSeconds).toBe(0);
  });

  it('tracks consecutive failed attempts', () => {
    const res1 = recordFailedAttempt(testUser);
    expect(res1.isLocked).toBe(false);
    expect(res1.remainingAttempts).toBe(4);

    const res2 = recordFailedAttempt(testUser);
    expect(res2.isLocked).toBe(false);
    expect(res2.remainingAttempts).toBe(3);
  });

  it('locks account after 5 consecutive failed attempts for 5 minutes', () => {
    recordFailedAttempt(testUser);
    recordFailedAttempt(testUser);
    recordFailedAttempt(testUser);
    recordFailedAttempt(testUser);
    const finalAttempt = recordFailedAttempt(testUser);

    expect(finalAttempt.isLocked).toBe(true);
    expect(finalAttempt.remainingAttempts).toBe(0);
    expect(finalAttempt.remainingSeconds).toBeGreaterThan(290);

    const rateStatus = checkRateLimit(testUser);
    expect(rateStatus.isLocked).toBe(true);
    expect(rateStatus.remainingSeconds).toBeGreaterThan(0);
  });

  it('resets lockout count upon successful authentication', () => {
    recordFailedAttempt(testUser);
    recordFailedAttempt(testUser);
    clearFailedAttempts(testUser);

    const status = checkRateLimit(testUser);
    expect(status.isLocked).toBe(false);
  });

  it('authenticates valid credentials from app_users database table and seed directory', async () => {
    const { authenticateUserSecure } = await import('../src/lib/auth');
    
    // Admin by email
    const adminRes = await authenticateUserSecure('admin@xpressnurse.in', '2026');
    expect(adminRes.success).toBe(true);
    expect(adminRes.user?.role).toBe('admin');

    // Admin by shortcut identifier 'admin'
    const adminShortRes = await authenticateUserSecure('admin', '2026');
    expect(adminShortRes.success).toBe(true);
    expect(adminShortRes.user?.role).toBe('admin');

    // Admin by phone
    const adminPhoneRes = await authenticateUserSecure('7569657371', '2026');
    expect(adminPhoneRes.success).toBe(true);
    expect(adminPhoneRes.user?.role).toBe('admin');

    // Doctor
    const docRes = await authenticateUserSecure('dr.reddy@xpressnurse.in', '4321');
    expect(docRes.success).toBe(true);
    expect(docRes.user?.role).toBe('doctor');

    // Nurse
    const nurseRes = await authenticateUserSecure('priya.nursing@xpressnurse.in', '1001');
    expect(nurseRes.success).toBe(true);
    expect(nurseRes.user?.role).toBe('nurse');
  });

  it('rejects incorrect PINs and returns remaining attempts message', async () => {
    const { authenticateUserSecure } = await import('../src/lib/auth');
    const wrongPinUser = 'wrongpin.test@xpressnurse.in';
    clearFailedAttempts(wrongPinUser);

    const failRes = await authenticateUserSecure(wrongPinUser, '9999');
    expect(failRes.success).toBe(false);
    expect(failRes.message).toContain('Invalid credentials');
    expect(failRes.message).toContain('4 attempts remaining');
  });
});
