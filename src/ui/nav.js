import { store } from '../store.js';

export function initNav(scrollTo, lenis) {
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobileMenu');
  const links = [...document.querySelectorAll('[data-nav]')];

  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    menu.setAttribute('aria-hidden', String(!open));
    if (open) lenis?.stop();
    else lenis?.start();
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  window.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

  // Smooth in-page anchors
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id === '#' ? document.body : document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      setMenu(false);
      const y = id === '#hero' || id === '#' ? 0 : target.getBoundingClientRect().top + window.scrollY;
      scrollTo(y);
    });
  });

  // Active section highlight
  const map = new Map(links.map((l) => [l.getAttribute('href').slice(1), l]));
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-active'));
        map.get(en.target.id)?.classList.add('is-active');
      });
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  ['moduller', 'e-donusum', 'ozellikler', 'mobil', 'ai-asistan', 'entegrasyonlar', 'finale', 'iletisim'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) io.observe(el);
  });

  // Hide on scroll down, reveal on scroll up
  let last = 0;
  return () => {
    const y = store.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    if (Math.abs(y - last) > 6) {
      nav.classList.toggle('is-hidden', y > last && y > 400 && !document.body.classList.contains('menu-open'));
      last = y;
    }
  };
}
