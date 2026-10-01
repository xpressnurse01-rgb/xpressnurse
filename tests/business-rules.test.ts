import { describe, it, expect } from 'vitest';

describe('Healthcare Clinical & Business Invariant Rules', () => {
  // Coupon calculation logic replicating atomic stored procedure
  function calculateCouponDiscount(
    coupon: {
      status: string;
      discountType: 'flat' | 'percent';
      discountValue: number;
      maxDiscount?: number;
      minOrderAmount?: number;
      validUntil?: string;
      usageLimit?: number;
      timesUsed: number;
    },
    orderAmount: number
  ): { valid: boolean; discount: number; finalAmount: number; error?: string } {
    if (coupon.status !== 'Active') {
      return { valid: false, discount: 0, finalAmount: orderAmount, error: 'Coupon inactive' };
    }
    if (coupon.validUntil && new Date(coupon.validUntil) < new Date()) {
      return { valid: false, discount: 0, finalAmount: orderAmount, error: 'Coupon expired' };
    }
    if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
      return { valid: false, discount: 0, finalAmount: orderAmount, error: 'Usage limit reached' };
    }
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      return { valid: false, discount: 0, finalAmount: orderAmount, error: 'Minimum order amount not met' };
    }

    let discount = 0;
    if (coupon.discountType === 'flat') {
      discount = Math.min(coupon.discountValue, orderAmount);
    } else if (coupon.discountType === 'percent') {
      const computed = (orderAmount * coupon.discountValue) / 100;
      discount = Math.min(computed, coupon.maxDiscount ?? orderAmount);
    }

    const finalAmount = Math.max(0, orderAmount - discount);
    return { valid: true, discount, finalAmount };
  }

  // Nurse referral commission rule: 10% on successful cross-area referrals
  function calculateReferralCommission(orderAmount: number, commissionRate: number = 0.10): number {
    return Math.round(orderAmount * commissionRate * 100) / 100;
  }

  describe('Coupon Calculations', () => {
    it('applies flat discount accurately without allowing negative totals', () => {
      const coupon = {
        status: 'Active',
        discountType: 'flat' as const,
        discountValue: 150,
        timesUsed: 0
      };

      const result = calculateCouponDiscount(coupon, 800);
      expect(result.valid).toBe(true);
      expect(result.discount).toBe(150);
      expect(result.finalAmount).toBe(650);

      // Order amount smaller than flat discount
      const smallResult = calculateCouponDiscount(coupon, 100);
      expect(smallResult.valid).toBe(true);
      expect(smallResult.discount).toBe(100);
      expect(smallResult.finalAmount).toBe(0);
    });

    it('applies percentage discount capped by maxDiscount', () => {
      const coupon = {
        status: 'Active',
        discountType: 'percent' as const,
        discountValue: 20, // 20%
        maxDiscount: 200,
        timesUsed: 0
      };

      // 20% of 1500 is 300, should be capped at 200
      const result = calculateCouponDiscount(coupon, 1500);
      expect(result.valid).toBe(true);
      expect(result.discount).toBe(200);
      expect(result.finalAmount).toBe(1300);
    });

    it('enforces minimum order amount constraint', () => {
      const coupon = {
        status: 'Active',
        discountType: 'flat' as const,
        discountValue: 100,
        minOrderAmount: 1000,
        timesUsed: 0
      };

      const invalidResult = calculateCouponDiscount(coupon, 800);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.discount).toBe(0);

      const validResult = calculateCouponDiscount(coupon, 1200);
      expect(validResult.valid).toBe(true);
      expect(validResult.discount).toBe(100);
      expect(validResult.finalAmount).toBe(1100);
    });

    it('rejects expired coupons and coupons exceeding usage limit', () => {
      const expiredCoupon = {
        status: 'Active',
        discountType: 'flat' as const,
        discountValue: 100,
        validUntil: '2020-01-01',
        timesUsed: 0
      };

      const resExpired = calculateCouponDiscount(expiredCoupon, 1000);
      expect(resExpired.valid).toBe(false);

      const maxedCoupon = {
        status: 'Active',
        discountType: 'flat' as const,
        discountValue: 100,
        usageLimit: 10,
        timesUsed: 10
      };

      const resMaxed = calculateCouponDiscount(maxedCoupon, 1000);
      expect(resMaxed.valid).toBe(false);
    });
  });

  describe('Nurse Referral Commission Rules', () => {
    it('calculates 10% referral commission accurately', () => {
      const comm1 = calculateReferralCommission(1299);
      expect(comm1).toBe(129.9);

      const comm2 = calculateReferralCommission(800);
      expect(comm2).toBe(80);

      const comm3 = calculateReferralCommission(899);
      expect(comm3).toBe(89.9);
    });
  });
});
