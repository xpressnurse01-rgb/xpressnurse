let activeLockCount = 0;
let originalOverflow = '';
let originalPaddingRight = '';

export function lockBodyScroll(): void {
  if (typeof window === 'undefined') return;
  activeLockCount++;
  if (activeLockCount === 1) {
    originalPaddingRight = document.body.style.paddingRight || '';
    originalOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    try {
      (window as any).__lenis?.stop();
    } catch (_) {}
  }
}

export function unlockBodyScroll(): void {
  if (typeof window === 'undefined') return;
  activeLockCount = Math.max(0, activeLockCount - 1);
  if (activeLockCount === 0) {
    document.body.style.overflow = originalOverflow;
    document.documentElement.style.overflow = '';
    document.body.style.paddingRight = originalPaddingRight;
    try {
      (window as any).__lenis?.start();
    } catch (_) {}
  }
}
