export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a));
export const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutBack = (t, s = 1.4) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);

/** Frame-rate independent exponential smoothing. */
export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));

/**
 * Stepped progress for pinned sections: returns a float in [0, n-1] that
 * dwells on each integer and eases between them around the step boundaries.
 */
export function stepped(p, n, soft = 0.3) {
  const s = clamp(p * n - 0.5, 0, n - 1);
  const i = Math.floor(s);
  const f = s - i;
  return Math.min(n - 1, i + smoothstep(soft, 1 - soft, f));
}

/** Progress of a tall sticky section while it is pinned (0 → 1). */
export function pinProgress(el, vh = window.innerHeight) {
  const r = el.getBoundingClientRect();
  const span = r.height - vh;
  return span > 0 ? clamp(-r.top / span) : 0;
}

/** 0 when the element's top touches the viewport bottom, 1 when it reaches the top. */
export function enterProgress(el, vh = window.innerHeight) {
  const r = el.getBoundingClientRect();
  return clamp(1 - r.top / vh);
}

/** -1 (below viewport) → 0 (centered) → 1 (above viewport). */
export function centerProgress(el, vh = window.innerHeight) {
  const r = el.getBoundingClientRect();
  const c = r.top + r.height / 2;
  return clamp((vh / 2 - c) / (vh / 2 + r.height / 2), -1, 1);
}
