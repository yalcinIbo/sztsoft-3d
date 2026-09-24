import { store } from '../store.js';
import { SCREENS } from '../content.js';
import { centerProgress, clamp, enterProgress, pinProgress, smoothstep, stepped } from '../utils/math.js';

const RING_N = 6;
const SCREEN_N = 11;
const PHONE_N = 6;
// laptop screen index → feature list item
const SCREEN_TO_ITEM = [0, 1, 1, 2, 2, 3, 4, 5, 6, 7, 8];

const pad = (n) => String(n).padStart(2, '0');

/** Scroll-driven state for the pinned 3D sections, shared with WebGL through the store. */
export function initSections(scrollTo) {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const modules = $('#moduller');
  const ring = $('#ring');
  const cards = $$('.ring-card');
  const dots = $$('#ringDots i');
  const ringCurrent = $('#ringCurrent');

  const features = $('#ozellikler');
  const featureItems = $$('#featureList li');
  const featureCount = $('#featureCount');
  const featureBar = $('#featureBar');
  const fallback = $('#featureFallback');

  const phone = $('#mobil');
  const phoneSteps = $$('#phoneSteps li');

  const edon = $('#e-donusum');
  const finale = $('#finale');
  const finaleContent = $('.finale__content');
  const integrations = $('#entegrasyonlar');
  const progress = $('#scrollProgress');

  let radius = 400;
  const layoutRing = () => {
    const w = cards[0].offsetWidth;
    radius = Math.round((w / 2) / Math.tan(Math.PI / RING_N) + Math.min(60, w * 0.12));
    cards.forEach((c, i) => {
      c.style.transform = `rotateY(${i * (360 / RING_N)}deg) translateZ(${radius}px)`;
    });
  };
  layoutRing();
  window.addEventListener('resize', layoutRing);

  /** Scroll so that step `i` of a pinned section is centred in its dwell zone. */
  const goToStep = (section, i, n) => {
    const top = section.getBoundingClientRect().top + window.scrollY;
    const span = section.offsetHeight - window.innerHeight;
    scrollTo(top + ((i + 0.5) / n) * span);
  };
  dots.forEach((d, i) => d.addEventListener('click', () => goToStep(modules, i, RING_N)));
  featureItems.forEach((li) =>
    li.addEventListener('click', () => goToStep(features, Number(li.dataset.step), SCREEN_N)),
  );
  phoneSteps.forEach((li, i) => li.addEventListener('click', () => goToStep(phone, i, PHONE_N)));

  let lastRing = -1;
  let lastItem = -1;
  let lastScreen = -1;
  let lastPhone = -1;

  function update() {
    const vh = window.innerHeight;

    // ── Modules ring ─────────────────────────────
    const m = store.modules;
    m.enter = enterProgress(modules, vh);
    m.p = pinProgress(modules, vh);
    m.step = stepped(m.p, RING_N, 0.26);
    m.angle = -m.step * (360 / RING_N);
    const tiltX = (1 - smoothstep(0.4, 1, m.enter)) * 18;
    ring.style.transform = `translateZ(${-radius}px) rotateX(${tiltX - 4}deg) rotateY(${m.angle}deg)`;
    for (let i = 0; i < cards.length; i++) {
      const rel = ((((i * 360) / RING_N + m.angle) % 360) + 540) % 360 - 180;
      const o = clamp(1 - Math.abs(rel) / 95);
      cards[i].style.opacity = (0.15 + 0.85 * o * o).toFixed(3);
      cards[i].classList.toggle('is-front', Math.abs(rel) < 18);
    }
    const ri = Math.round(m.step);
    if (ri !== lastRing) {
      lastRing = ri;
      ringCurrent.textContent = pad(ri + 1);
      dots.forEach((d, i) => d.classList.toggle('is-active', i === ri));
    }

    // ── Features / laptop ────────────────────────
    const f = store.features;
    f.enter = enterProgress(features, vh);
    f.p = pinProgress(features, vh);
    f.screen = stepped(f.p, SCREEN_N, 0.3);
    const si = Math.round(f.screen);
    const item = SCREEN_TO_ITEM[si];
    if (item !== lastItem) {
      lastItem = item;
      featureItems.forEach((li, i) => li.classList.toggle('is-active', i === item));
      featureCount.textContent = pad(item + 1);
    }
    if (si !== lastScreen) {
      lastScreen = si;
      if (fallback && document.documentElement.classList.contains('no-webgl')) fallback.src = SCREENS[si];
    }
    featureBar.style.transform = `scaleX(${Math.max(0.02, f.p)})`;

    // ── Phone ────────────────────────────────────
    const ph = store.phone;
    ph.enter = enterProgress(phone, vh);
    ph.p = pinProgress(phone, vh);
    ph.screen = stepped(ph.p, PHONE_N, 0.3);
    const pi = Math.round(ph.screen);
    if (pi !== lastPhone) {
      lastPhone = pi;
      phoneSteps.forEach((li, i) => li.classList.toggle('is-active', i === pi));
    }

    // ── Misc ─────────────────────────────────────
    store.edon.center = centerProgress(edon, vh);
    store.globe.center = centerProgress(integrations, vh);

    const fi = store.finale;
    fi.enter = enterProgress(finale, vh);
    fi.p = pinProgress(finale, vh);
    const show = smoothstep(0.7, 1, fi.enter) * (1 - smoothstep(0.45, 0.7, fi.p));
    finaleContent.style.opacity = show.toFixed(3);
    finaleContent.style.transform = `translate3d(0, ${(1 - show) * 30}px, 0) scale(${0.94 + show * 0.06})`;
    finaleContent.style.pointerEvents = show > 0.5 ? 'auto' : 'none';

    const max = document.documentElement.scrollHeight - vh;
    progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  }

  return { update };
}
