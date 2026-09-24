import gsap from 'gsap';
import { store } from '../store.js';

/** 3D tilt with moving glare for [data-tilt] cards. */
export function initTilt() {
  if (store.isTouch || store.reducedMotion) return;
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    const max = el.hasAttribute('data-tilt-soft') ? 4 : 11;
    el.classList.add('tilt');
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', `${(px - 0.5) * max * 2}deg`);
      el.style.setProperty('--rx', `${(0.5 - py) * max * 2}deg`);
      el.style.setProperty('--gx', `${px * 100}%`);
      el.style.setProperty('--gy', `${py * 100}%`);
      el.classList.add('is-tilting');
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--rx', '0deg');
      el.classList.remove('is-tilting');
    });
  });
}

/** Buttons that lean towards the pointer. */
export function initMagnetic() {
  if (store.isTouch || store.reducedMotion) return;
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.3);
      yTo((e.clientY - r.top - r.height / 2) * 0.4);
    });
    el.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

/** Floating chips drift with the pointer for depth. */
export function initParallaxChips() {
  const chips = [...document.querySelectorAll('[data-depth]')];
  return () => {
    const { x, y } = store.mouse;
    for (const c of chips) {
      const d = Number(c.dataset.depth);
      c.style.translate = `${(x * d * 22).toFixed(2)}px ${(y * d * 16).toFixed(2)}px`;
    }
  };
}
