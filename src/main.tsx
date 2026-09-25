import React from 'react';
import ReactDOM from 'react-dom/client';
import Lenis from 'lenis';
import { App } from './App';
import './styles/index.css';

// Desktop & Laptop: Use the luxury Lenis momentum scrolling engine (District / Apple Style)
// Mobile: Use native 120Hz kinetic touch scrolling so phone users experience 100% fluid, responsive scrolling
const isDesktopOrLaptop = 
  typeof window !== 'undefined' && 
  window.innerWidth >= 1024 && 
  !('ontouchstart' in window && navigator.maxTouchPoints > 1);

if (isDesktopOrLaptop) {
  try {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
      infinite: false
    });

    (window as any).__lenis = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
  } catch {
    // Graceful fallback to native
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

