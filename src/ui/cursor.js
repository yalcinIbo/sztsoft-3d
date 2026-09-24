import gsap from 'gsap';
import { store } from '../store.js';

/** Gold dot + lagging ring cursor for fine pointers. */
export function initCursor() {
  if (store.isTouch) return;
  const root = document.querySelector('.cursor');
  const dot = root.querySelector('.cursor__dot');
  const ring = root.querySelector('.cursor__ring');
  const label = root.querySelector('.cursor__label');
  document.documentElement.classList.add('has-cursor');

  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const lag = { x: pos.x, y: pos.y };

  window.addEventListener('pointermove', (e) => {
    pos.x = e.clientX;
    pos.y = e.clientY;
    root.classList.add('is-visible');
  });
  document.addEventListener('pointerleave', () => root.classList.remove('is-visible'));
  window.addEventListener('pointerdown', () => root.classList.add('is-down'));
  window.addEventListener('pointerup', () => root.classList.remove('is-down'));

  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('a, button, [data-cursor], input, textarea, select, .ring-card, #featureList li, #phoneSteps li');
    root.classList.toggle('is-link', !!t && !t.matches('input, textarea, select'));
    root.classList.toggle('is-text', !!t && t.matches('input, textarea'));
    const text = t?.closest('[data-cursor]')?.dataset.cursor || '';
    label.textContent = text;
    root.classList.toggle('has-label', !!text);
  });

  gsap.ticker.add(() => {
    lag.x += (pos.x - lag.x) * 0.16;
    lag.y += (pos.y - lag.y) * 0.16;
    dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    ring.style.transform = `translate3d(${lag.x}px, ${lag.y}px, 0)`;
  });
}
