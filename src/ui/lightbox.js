import gsap from 'gsap';
import { store } from '../store.js';
import { SCREENS, SCREEN_CAPTIONS } from '../content.js';

export function initLightbox(lenis) {
  const box = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  const caption = document.getElementById('lightboxCaption');
  const zone = document.getElementById('laptopZone');

  const open = () => {
    const i = Math.round(store.features.screen);
    img.src = SCREENS[i];
    img.alt = SCREEN_CAPTIONS[i];
    caption.textContent = SCREEN_CAPTIONS[i];
    box.classList.add('is-open');
    box.setAttribute('aria-hidden', 'false');
    lenis?.stop();
    gsap.fromTo(img, { rotateX: 25, scale: 0.7, opacity: 0, transformPerspective: 1200 }, { rotateX: 0, scale: 1, opacity: 1, duration: 0.9, ease: 'expo.out' });
  };
  const close = () => {
    box.classList.remove('is-open');
    box.setAttribute('aria-hidden', 'true');
    lenis?.start();
  };
  zone.addEventListener('click', open);
  box.addEventListener('click', (e) => e.target !== img && close());
  window.addEventListener('keydown', (e) => e.key === 'Escape' && close());
}
