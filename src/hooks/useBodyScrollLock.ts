import { useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '../lib/scrollLock';

/**
 * React hook to effortlessly lock body scroll & pause Lenis when a modal/overlay is open.
 * Automatically unlocks body scroll on unmount or when isLocked transitions to false.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (isLocked) {
      lockBodyScroll();
      return () => {
        unlockBodyScroll();
      };
    }
  }, [isLocked]);
}
