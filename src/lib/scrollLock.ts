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
  }
}

export function unlockBodyScroll(): void {
  if (typeof window === 'undefined') return;
  activeLockCount = Math.max(0, activeLockCount - 1);
  if (activeLockCount === 0) {
    document.body.style.overflow = originalOverflow;
    document.body.style.paddingRight = originalPaddingRight;
  }
}
