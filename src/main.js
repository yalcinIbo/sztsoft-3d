import 'lenis/dist/lenis.css';
import './style.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { store } from './store.js';
import { damp } from './utils/math.js';
import { createLoader } from './ui/loader.js';
import { initSections } from './ui/sections.js';
import { heroIntro, initReveals, splitWords } from './ui/reveal.js';
import { initCursor } from './ui/cursor.js';
import { initNav } from './ui/nav.js';
import { initChat } from './ui/chat.js';
import { initForm } from './ui/form.js';
import { initLightbox } from './ui/lightbox.js';
import { initMagnetic, initParallaxChips, initTilt } from './ui/interactions.js';

gsap.registerPlugin(ScrollTrigger);

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
document.getElementById('year').textContent = new Date().getFullYear();

const root = document.documentElement;
const canvas = document.getElementById('webgl');
const loader = createLoader();

// ── Smooth scroll ────────────────────────────────
const lenis = store.reducedMotion ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
lenis?.on('scroll', ScrollTrigger.update);
lenis?.stop();
const scrollTo = (y) => (lenis ? lenis.scrollTo(y, { duration: 1.6 }) : window.scrollTo({ top: y, behavior: 'smooth' }));

// ── WebGL ────────────────────────────────────────
const isSmall = window.matchMedia('(max-width: 900px)').matches;
const quality = isSmall || store.isTouch ? 'low' : 'high';
let experience = null;
let assetsReady;
const assetsPromise = new Promise((r) => (assetsReady = r));

try {
  const { Experience } = await import('./webgl/Experience.js');
  experience = new Experience({
    canvas,
    quality,
    onProgress: (p) => loader.setProgress(p * 0.95),
    onLoad: () => assetsReady(),
  });
  root.classList.add('has-webgl');
} catch (err) {
  console.warn('[SZTSOFT] WebGL devre dışı, statik görünüm kullanılıyor.', err);
  root.classList.add('no-webgl');
  canvas.remove();
  assetsReady();
}

// ── UI ───────────────────────────────────────────
splitWords(document.querySelector('.hero__title'));
const sections = initSections(scrollTo);
const updateNav = initNav(scrollTo, lenis);
const updateChips = initParallaxChips();
initCursor();
initTilt();
initMagnetic();
initChat();
initForm();
initLightbox(lenis);
initReveals();

window.addEventListener('pointermove', (e) => {
  store.mouseRaw.x = (e.clientX / window.innerWidth) * 2 - 1;
  store.mouseRaw.y = (e.clientY / window.innerHeight) * 2 - 1;
});
window.addEventListener('resize', () => {
  store.width = window.innerWidth;
  store.height = window.innerHeight;
});

// ── Main loop (Lenis → DOM state → WebGL) ─────────
let lastY = 0;
gsap.ticker.lagSmoothing(0);
gsap.ticker.add((time, deltaMS) => {
  lenis?.raf(time * 1000);
  frame(Math.min(deltaMS / 1000, 1 / 20));
});

function frame(dt) {

  store.scrollY = window.scrollY;
  store.velocity = damp(store.velocity, (store.scrollY - lastY) / Math.max(dt, 1e-3), 6, dt);
  lastY = store.scrollY;
  store.mouse.x = damp(store.mouse.x, store.mouseRaw.x, 4, dt);
  store.mouse.y = damp(store.mouse.y, store.mouseRaw.y, 4, dt);

  sections.update();
  updateNav();
  updateChips();

  if (experience?.ready) {
    experience.update(dt);
    experience.render();
  }
}

// Dev-only hook to inspect any scroll position deterministically (e.g. with a hidden preview pane).
if (import.meta.env.DEV) {
  window.__szt = {
    store,
    lenis,
    experience,
    settle(y, frames = 120) {
      lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : window.scrollTo(0, y);
      window.scrollTo(0, y);
      ScrollTrigger.update();
      gsap.globalTimeline.time(gsap.globalTimeline.time() + 4);
      for (let i = 0; i < frames; i++) frame(1 / 60);
      return { y: window.scrollY, modules: { ...store.modules }, features: { ...store.features }, phone: { ...store.phone } };
    },
  };
}

// ── Boot sequence ────────────────────────────────
const timeout = new Promise((r) => setTimeout(r, 9000));
await Promise.race([Promise.all([assetsPromise, document.fonts?.ready]), timeout]);
if (experience) {
  // Lay the scene out at the hero position, then compile everything before revealing it.
  sections.update();
  experience.update(1 / 60);
  await experience.warmup();
}
loader.setProgress(1);
if (import.meta.env.DEV && new URLSearchParams(location.search).has('instant')) {
  document.getElementById('loader').style.display = 'none';
} else {
  await new Promise((r) => setTimeout(r, 250));
  await loader.hide();
}

root.classList.add('is-ready');
heroIntro();
gsap.to(store, { intro: 1, duration: store.reducedMotion ? 0.01 : 2.6, ease: 'power3.out' });
lenis?.start();
ScrollTrigger.refresh();
