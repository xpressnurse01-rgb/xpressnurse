import { supabase } from './supabase';
import { AppUser } from '../types';

// ============================================================================
// HARDENED ENTERPRISE AUTHENTICATION SERVICE
// Enforces rate-limiting, server-backed JWT verification, and zero credential leakage
// ============================================================================

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

interface FailedAttemptRecord {
  count: number;
  lockedUntil?: number;
}

// In-memory rate limiting map for brute-force protection
const failedAttemptsMap = new Map<string, FailedAttemptRecord>();

/**
 * Check if the given identifier is currently rate-limited
 */
export function checkRateLimit(identifier: string): { isLocked: boolean; remainingSeconds: number } {
  const key = identifier.trim().toLowerCase();
  const record = failedAttemptsMap.get(key);

  if (!record || !record.lockedUntil) {
    return { isLocked: false, remainingSeconds: 0 };
  }

  const now = Date.now();
  if (now >= record.lockedUntil) {
    // Lockout expired
    failedAttemptsMap.delete(key);
    return { isLocked: false, remainingSeconds: 0 };
  }

  const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
  return { isLocked: true, remainingSeconds };
}

/**
 * Record a failed authentication attempt
 */
export function recordFailedAttempt(identifier: string): { isLocked: boolean; remainingAttempts: number; remainingSeconds: number } {
  const key = identifier.trim().toLowerCase();
  const now = Date.now();
  const current = failedAttemptsMap.get(key) || { count: 0 };
  
  current.count += 1;

  if (current.count >= MAX_FAILED_ATTEMPTS) {
    current.lockedUntil = now + LOCKOUT_DURATION_MS;
    failedAttemptsMap.set(key, current);
    return { 
      isLocked: true, 
      remainingAttempts: 0, 
      remainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000) 
    };
  }

  failedAttemptsMap.set(key, current);
  return { 
    isLocked: false, 
    remainingAttempts: MAX_FAILED_ATTEMPTS - current.count, 
    remainingSeconds: 0 
  };
}

/**
 * Clear failed attempts upon successful login
 */
export function clearFailedAttempts(identifier: string): void {
  const key = identifier.trim().toLowerCase();
  failedAttemptsMap.delete(key);
}

/**
 * Hardened Server-Backed Authentication
 * 1. Checks rate-limiting / brute-force throttle
 * 2. Authenticates through Supabase Auth (or secure database RPC)
 * 3. Never returns or stores credentials in plaintext
 */
export async function authenticateUserSecure(
  identifier: string,
  secret: string,
  expectedRole?: 'admin' | 'nurse' | 'doctor' | 'patient'
): Promise<{ success: boolean; user?: AppUser; message: string }> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanSecret = secret.trim();

  if (!cleanId || !cleanSecret) {
    return { success: false, message: 'Please enter both your identifier and credentials.' };
  }

  // 1. Rate-limit check
  const rateLimit = checkRateLimit(cleanId);
  if (rateLimit.isLocked) {
    return {
      success: false,
      message: `Account is temporarily locked due to multiple failed attempts. Try again in ${rateLimit.remainingSeconds} seconds.`
    };
  }

  try {
    // 2. Format identifier for Supabase Auth
    // If phone number or email, use Supabase Auth signInWithPassword
    const emailToAuth = cleanId.includes('@') 
      ? cleanId 
      : `${cleanId.replace(/\D/g, '')}@xpressnurse.in`;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailToAuth,
      password: cleanSecret
    });

    if (!authError && authData?.user) {
      clearFailedAttempts(cleanId);
      
      const roleFromMeta = (authData.user.app_metadata?.role || authData.user.user_metadata?.role || 'nurse') as AppUser['role'];
      
      if (expectedRole && roleFromMeta !== expectedRole && roleFromMeta !== 'admin') {
        return {
          success: false,
          message: `Access denied. Your account role (${roleFromMeta}) does not have permission for the ${expectedRole} portal.`
        };
      }

      const verifiedUser: AppUser = {
        id: authData.user.id,
        role: roleFromMeta,
        identifier: authData.user.email || cleanId,
        name: authData.user.user_metadata?.name || 'Authorized Staff',
        pin: '••••', // Never expose plaintext pin
        phone: authData.user.phone || authData.user.user_metadata?.phone,
        email: authData.user.email,
        designation: authData.user.user_metadata?.designation,
        serviceArea: authData.user.user_metadata?.service_area
      };

      return {
        success: true,
        user: verifiedUser,
        message: `Authenticated successfully as ${verifiedUser.role.toUpperCase()}.`
      };
    }

    // 3. Fallback to Supabase Database verification via secure RPC (if Auth users not yet migrated)
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('verify_staff_credentials', {
      p_identifier: cleanId,
      p_secret: cleanSecret,
      p_expected_role: expectedRole || null
    });

    if (!rpcErr && rpcRes && rpcRes.success) {
      clearFailedAttempts(cleanId);
      return {
        success: true,
        user: {
          id: rpcRes.user.id,
          role: rpcRes.user.role,
          identifier: rpcRes.user.identifier,
          name: rpcRes.user.name,
          pin: '••••',
          phone: rpcRes.user.phone,
          email: rpcRes.user.email,
          designation: rpcRes.user.designation,
          serviceArea: rpcRes.user.service_area
        },
        message: 'Authenticated successfully.'
      };
    }

    // Record failure for brute-force protection
    const attemptStatus = recordFailedAttempt(cleanId);
    if (attemptStatus.isLocked) {
      return {
        success: false,
        message: `Too many failed attempts. Account locked for 5 minutes.`
      };
    }

    return {
      success: false,
      message: `Invalid credentials. (${attemptStatus.remainingAttempts} attempts remaining before temporary lockout).`
    };
  } catch (err: any) {
    console.error('[Auth] Verification error:', err?.message || err);
    return {
      success: false,
      message: 'Authentication service temporarily unavailable. Please try again.'
    };
  }
}

/**
 * Hardened Sign Out
 * Purges tokens, revokes session, and notifies all listening windows
 */
export async function signOutSecure(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('[Auth] Signout warning:', err);
  }
}
