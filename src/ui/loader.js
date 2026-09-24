import gsap from 'gsap';

export function createLoader() {
  const root = document.getElementById('loader');
  const bar = document.getElementById('loaderBar');
  const pct = document.getElementById('loaderPct');
  const path = root.querySelector('.loader__path');
  const len = path.getTotalLength();
  path.style.strokeDasharray = `${len}`;
  path.style.strokeDashoffset = `${len}`;

  const state = { shown: 0, target: 0 };
  const tick = () => {
    state.shown += (state.target - state.shown) * 0.12;
    const p = state.shown;
    bar.style.transform = `scaleX(${p})`;
    pct.textContent = `${Math.round(p * 100)}%`;
    path.style.strokeDashoffset = `${len * (1 - p)}`;
  };
  gsap.ticker.add(tick);

  return {
    setProgress(p) {
      state.target = Math.max(state.target, Math.min(1, p));
    },
    async hide() {
      state.target = 1;
      await new Promise((r) => {
        const wait = () => (state.shown > 0.985 ? r() : requestAnimationFrame(wait));
        wait();
      });
      gsap.ticker.remove(tick);
      state.shown = 1;
      tick();
      const tl = gsap.timeline();
      tl.to(path, { fillOpacity: 1, duration: 0.45 })
        .to('.loader__inner', { scale: 0.9, opacity: 0, duration: 0.6, ease: 'power3.in' }, '+=0.15')
        .to(root, { clipPath: 'circle(0% at 50% 50%)', duration: 1.1, ease: 'expo.inOut' }, '-=0.2')
        .set(root, { display: 'none' });
      await new Promise((r) => tl.eventCallback('onComplete', r));
    },
  };
}
