import { store } from '../store.js';

const SCRIPT = [
  {
    q: 'Bu hafta merkez şubede has altın girişi ne kadar?',
    a: 'Merkez şubede bu hafta toplam 4.250 gr has altın girişi sağlanmıştır. Detaylı kasa raporunu ekrana getiriyorum. ✨',
  },
  {
    q: 'Bu ay en çok kâr getiren ürün grubu hangisi?',
    a: 'Bu ay en yüksek kârı 22 ayar bilezik grubu getirdi. Ürün grubu kârlılık raporunu açıyorum. 📊',
  },
  {
    q: 'Beni e-fatura ekranına götür.',
    a: 'Tabii! e-Dönüşüm › e-Fatura ekranına yönlendiriyorum; bekleyen 3 taslak faturanız var. 🧾',
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clock = () => new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

/** Scripted AI assistant conversation; drives the orb's energy while "thinking". */
export function initChat() {
  const body = document.getElementById('chatBody');
  const input = document.getElementById('chatInput');
  const status = document.getElementById('chatStatus');
  const section = document.getElementById('ai-asistan');
  const placeholder = input.textContent;
  let visible = false;
  let running = false;

  const whenVisible = async () => {
    while (!visible) await sleep(250);
  };

  const add = (who, text = '') => {
    const el = document.createElement('div');
    el.className = `msg msg--${who}`;
    el.innerHTML = `<p></p><time>${who === 'ai' ? 'AI Asistan · ' : ''}${clock()}</time>`;
    el.querySelector('p').textContent = text;
    body.appendChild(el);
    while (body.children.length > 4) body.firstElementChild.remove();
    return el.querySelector('p');
  };

  async function type(q) {
    input.classList.remove('chat__placeholder');
    input.textContent = '';
    for (const ch of q) {
      await whenVisible();
      input.textContent += ch;
      await sleep(28 + Math.random() * 40);
    }
    await sleep(350);
    input.textContent = placeholder;
    input.classList.add('chat__placeholder');
  }

  async function loop() {
    if (running) return;
    running = true;
    for (;;) {
      body.innerHTML = '';
      for (const { q, a } of SCRIPT) {
        await whenVisible();
        await type(q);
        add('user', q);
        await sleep(450);
        status.textContent = 'Analiz ediliyor…';
        store.ai.active = 1;
        const dots = document.createElement('div');
        dots.className = 'msg msg--ai msg--typing';
        dots.innerHTML = '<span></span><span></span><span></span>';
        body.appendChild(dots);
        await sleep(1500);
        dots.remove();
        const p = add('ai');
        for (const w of a.split(' ')) {
          await whenVisible();
          p.textContent += (p.textContent ? ' ' : '') + w;
          await sleep(55 + Math.random() * 60);
        }
        store.ai.active = 0.2;
        status.textContent = 'Aktif — Analiz hazır';
        await sleep(2300);
        store.ai.active = 0;
      }
      await sleep(1500);
    }
  }

  new IntersectionObserver(
    ([en]) => {
      visible = en.isIntersecting;
      if (visible) loop();
    },
    { threshold: 0.25 },
  ).observe(section);
}
