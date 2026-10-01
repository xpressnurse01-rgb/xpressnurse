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
});
