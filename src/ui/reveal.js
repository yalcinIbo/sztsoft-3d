import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Wraps every word in `.w > .wi` spans (keeps gold spans gold) and returns the inner spans. */
export function splitWords(el) {
  if (el.dataset.splitDone) return [...el.querySelectorAll('.wi')];
  el.dataset.splitDone = '1';
  const words = [];
  const walk = (node, gold) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
            return;
          }
          const w = document.createElement('span');
          w.className = 'w';
          const i = document.createElement('span');
          i.className = gold ? 'wi gold-text' : 'wi';
          i.textContent = part;
          w.appendChild(i);
          frag.appendChild(w);
          words.push(i);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        const isGold = child.classList.contains('gold-text');
        if (isGold) child.classList.replace('gold-text', 'gold-group');
        walk(child, gold || isGold);
      }
    });
  };
  walk(el, false);
  return words;
}

export function initReveals() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-split]').forEach((el) => {
    const words = splitWords(el);
    if (el.closest('.hero') || reduced) return;
    gsap.from(words, {
      rotateX: -95,
      yPercent: 70,
      opacity: 0,
      transformOrigin: '50% 100% -20px',
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.045,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });

  if (reduced) return;

  document.querySelectorAll('main .eyebrow').forEach((el) => {
    if (el.closest('.hero')) return;
    gsap.from(el, {
      opacity: 0,
      y: 20,
      rotateX: -60,
      transformPerspective: 600,
      duration: 1,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });

  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      y: 50,
      rotateX: -22,
      transformPerspective: 900,
      transformOrigin: '50% 0%',
      duration: 1.2,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });

  document.querySelectorAll('[data-reveal-stagger]').forEach((el) => {
    gsap.from(el.children, {
      opacity: 0,
      y: 40,
      rotateY: -25,
      rotateX: 12,
      transformPerspective: 800,
      duration: 1.1,
      ease: 'expo.out',
      stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });

  document.querySelectorAll('.partner, .demo-form').forEach((el, i) => {
    gsap.from(el, {
      opacity: 0,
      z: -300,
      rotateY: i % 2 ? 30 : -30,
      transformPerspective: 1200,
      duration: 1.4,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      clearProps: 'transform',
    });
  });
}

/** Hero entrance once the loader is gone. */
export function heroIntro() {
  const title = document.querySelector('.hero__title');
  const words = splitWords(title);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(title, { opacity: 1 });
    return gsap.timeline();
  }
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.set(title, { opacity: 1 })
    .from(words, {
      rotateX: -100,
      yPercent: 80,
      z: -120,
      opacity: 0,
      transformOrigin: '50% 100% -30px',
      duration: 1.6,
      stagger: 0.06,
    })
    .from(
      '.hero [data-intro]',
      { opacity: 0, y: 40, rotateX: -30, transformPerspective: 900, duration: 1.3, stagger: 0.1 },
      0.35,
    )
    .from('.nav', { yPercent: -120, opacity: 0, duration: 1.2, clearProps: 'transform,opacity' }, 0.2)
    .from('.scroll-cue', { opacity: 0, y: 20, duration: 1 }, 1);
  return tl;
}
