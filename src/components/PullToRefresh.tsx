import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, disabled = false, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const threshold = 70;

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only initiate pull-to-refresh if scroll is at the very top of the window
      if (window.scrollY <= 2 && e.touches.length === 1) {
        startYRef.current = e.touches[0].clientY;
        isPullingRef.current = true;
      } else {
        isPullingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshing || e.touches.length !== 1) return;
      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      // Only pull if moving downwards while still at the top
      if (diff > 0 && window.scrollY <= 2) {
        // Apply elastic resistance damping
        const damped = Math.min(diff * 0.45, 110);
        setPullDistance(damped);
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(threshold * 0.85);

        // Haptic feedback if supported on mobile
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(25); } catch {}
        }

        try {
          await onRefresh();
        } catch (err) {
          console.error('Refresh error:', err);
        } finally {
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
          }, 350);
        }
      } else {
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, onRefresh]);

  const isReadyToRelease = pullDistance >= threshold;

  return (
    <>
      {/* Floating Pull-to-Refresh Indicator */}
      {(pullDistance > 10 || isRefreshing) && (
        <div
          style={{
            position: 'fixed',
            top: `${Math.max(12, pullDistance - 25)}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999999,
            background: isReadyToRelease ? '#0284C7' : '#0F172A',
            color: '#FFFFFF',
            padding: '0.45rem 1.1rem',
            borderRadius: 9999,
            boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            fontSize: '0.82rem',
            fontWeight: 700,
            pointerEvents: 'none',
            transition: isRefreshing ? 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'background-color 0.2s',
            border: '1.5px solid rgba(255,255,255,0.2)'
          }}
        >
          {isRefreshing ? (
            <RefreshCw size={15} style={{ animation: 'spin 0.8s linear infinite', color: '#38BDF8' }} />
          ) : isReadyToRelease ? (
            <RefreshCw size={15} style={{ color: '#FFFFFF' }} />
          ) : (
            <ArrowDown
              size={15}
              style={{
                transform: `rotate(${Math.min(pullDistance * 2.5, 180)}deg)`,
                transition: 'transform 0.15s ease',
                color: '#38BDF8'
              }}
            />
          )}
          <span>
            {isRefreshing
              ? 'Refreshing...'
              : isReadyToRelease
              ? 'Release to refresh'
              : 'Pull down to refresh'}
          </span>
        </div>
      )}
      {children}
    </>
  );
};
