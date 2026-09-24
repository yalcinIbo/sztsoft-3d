/** Shared, mutable state read by both the DOM layer and the WebGL layer. */
export const store = {
  width: window.innerWidth,
  height: window.innerHeight,
  scrollY: 0,
  velocity: 0,
  mouse: { x: 0, y: 0 }, // normalized -1..1, smoothed
  mouseRaw: { x: 0, y: 0 },
  intro: 0, // 0 → 1 once the loader is gone
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  isTouch: window.matchMedia('(hover: none), (pointer: coarse)').matches,

  // section driven values (written by ui/sections.js every frame)
  modules: { enter: 0, p: 0, step: 0, angle: 0 },
  features: { enter: 0, p: 0, screen: 0 },
  phone: { enter: 0, p: 0, screen: 0 },
  edon: { center: -1, enter: 0 },
  finale: { enter: 0, p: 0 },
  ai: { active: 0 },
  globe: { center: -1 },
};
