import React from 'react';
import ReactDOM from 'react-dom/client';
import Lenis from 'lenis';
import { App } from './App';
import './styles/index.css';

// Initialize Lenis Smooth Inertia Momentum Scrolling Engine (District / Apple Style)
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  touchMultiplier: 1.5,
  infinite: false
});

// Expose globally for modal lock / resume orchestration
(window as any).__lenis = lenis;

function raf(time: number) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

