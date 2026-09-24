import * as THREE from 'three';

const FONT = 'Inter, "Helvetica Neue", Arial, sans-serif';
const DISPLAY = 'Sora, Inter, "Helvetica Neue", Arial, sans-serif';

/** Canvas texture that redraws itself once web fonts are ready. */
function canvasTexture(w, h, draw, { srgb = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  document.fonts?.ready.then(() => {
    g.clearRect(0, 0, w, h);
    draw(g, w, h);
    tex.needsUpdate = true;
  });
  return tex;
}

function rand(seed) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function goldGradient(g, x0, y0, x1, y1) {
  const grad = g.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0, '#b8860b');
  grad.addColorStop(0.45, '#ffd24a');
  grad.addColorStop(0.7, '#ffe98f');
  grad.addColorStop(1, '#c9971c');
  return grad;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** A4-ish e-document used by the e-Dönüşüm section. */
export function invoiceTexture(title, docNo, seed = 1) {
  return canvasTexture(512, 724, (g, W, H) => {
    const r = rand(seed);
    g.fillStyle = '#f6f2e9';
    g.fillRect(0, 0, W, H);

    // header band
    g.fillStyle = goldGradient(g, 0, 0, W, 110);
    g.fillRect(0, 0, W, 110);
    g.fillStyle = '#1b1405';
    g.font = `800 34px ${DISPLAY}`;
    g.textBaseline = 'alphabetic';
    g.fillText(title, 34, 62);
    g.font = `600 13px ${FONT}`;
    g.fillText('SZTSOFT  •  GİB ENTEGRE', 34, 88);
    g.textAlign = 'right';
    g.font = `700 13px ${FONT}`;
    g.fillText(`No: ${docNo}`, W - 34, 50);
    g.font = `500 12px ${FONT}`;
    g.fillText('ETTN doğrulandı', W - 34, 72);
    g.textAlign = 'left';

    // parties
    g.fillStyle = '#1c1f26';
    g.font = `700 13px ${FONT}`;
    g.fillText('SATICI', 34, 150);
    g.fillText('ALICI', 280, 150);
    g.fillStyle = '#c5bfb2';
    for (let i = 0; i < 3; i++) {
      g.fillRect(34, 164 + i * 18, 150 + r() * 60, 8);
      g.fillRect(280, 164 + i * 18, 120 + r() * 80, 8);
    }

    // table
    const top = 250;
    g.fillStyle = '#1c1f26';
    g.fillRect(34, top, W - 68, 30);
    g.fillStyle = '#ffd24a';
    g.font = `700 12px ${FONT}`;
    ['ÜRÜN', 'AYAR', 'GRAM', 'TUTAR'].forEach((t, i) => g.fillText(t, 46 + i * 112, top + 20));
    const items = ['22 Ayar Bilezik', 'Çeyrek Altın', '14 Ayar Kolye', 'Gram Altın', 'Has Külçe'];
    const ayar = ['22K', '22K', '14K', '24K', '995'];
    for (let i = 0; i < 5; i++) {
      const y = top + 58 + i * 34;
      g.fillStyle = i % 2 ? '#efe9dc' : '#f6f2e9';
      g.fillRect(34, y - 22, W - 68, 34);
      g.fillStyle = '#2a2d35';
      g.font = `500 12px ${FONT}`;
      g.fillText(items[(i + seed) % items.length], 46, y);
      g.fillText(ayar[(i + seed) % ayar.length], 158, y);
      g.fillText(`${(2 + r() * 40).toFixed(2)} gr`, 270, y);
      g.textAlign = 'right';
      g.fillText(`₺${Math.round(4000 + r() * 90000).toLocaleString('tr-TR')},00`, W - 46, y);
      g.textAlign = 'left';
    }

    // totals
    const ty = top + 250;
    g.strokeStyle = '#d9b44a';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(260, ty);
    g.lineTo(W - 34, ty);
    g.stroke();
    g.fillStyle = '#2a2d35';
    g.font = `600 13px ${FONT}`;
    g.fillText('KDV', 270, ty + 30);
    g.fillText('GENEL TOPLAM', 270, ty + 58);
    g.textAlign = 'right';
    g.fillText(`₺${Math.round(8000 + r() * 9000).toLocaleString('tr-TR')},00`, W - 46, ty + 30);
    g.font = `800 18px ${DISPLAY}`;
    g.fillStyle = '#9a6f06';
    g.fillText(`₺${Math.round(120000 + r() * 90000).toLocaleString('tr-TR')},00`, W - 46, ty + 60);
    g.textAlign = 'left';

    // QR-like block
    const qx = 34, qy = ty + 10, cell = 7;
    g.fillStyle = '#1c1f26';
    for (let y = 0; y < 13; y++) {
      for (let x = 0; x < 13; x++) {
        const finder = (x < 3 && y < 3) || (x > 9 && y < 3) || (x < 3 && y > 9);
        if (finder || r() > 0.52) g.fillRect(qx + x * cell, qy + y * cell, cell - 1, cell - 1);
      }
    }

    // stamp
    g.save();
    g.translate(W - 130, H - 90);
    g.rotate(-0.22);
    g.strokeStyle = 'rgba(176, 124, 6, 0.85)';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(0, 0, 54, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(0, 0, 45, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = 'rgba(176, 124, 6, 0.9)';
    g.textAlign = 'center';
    g.font = `800 20px ${DISPLAY}`;
    g.fillText('GİB', 0, -4);
    g.font = `700 11px ${FONT}`;
    g.fillText('ONAYLI ✓', 0, 16);
    g.restore();

    // footer
    g.fillStyle = '#9b958a';
    g.font = `500 11px ${FONT}`;
    g.fillText('Bu belge SZTSOFT e-Dönüşüm modülü ile otomatik oluşturulmuştur.', 34, H - 22);
  });
}

/** Height map for coin faces. */
export function coinBumpTexture() {
  return canvasTexture(
    256,
    256,
    (g, W, H) => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      g.strokeStyle = '#fff';
      g.lineWidth = 6;
      g.beginPath();
      g.arc(cx, cy, 108, 0, Math.PI * 2);
      g.stroke();
      // ray pattern
      g.lineWidth = 2;
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * 92, cy + Math.sin(a) * 92);
        g.lineTo(cx + Math.cos(a) * 102, cy + Math.sin(a) * 102);
        g.stroke();
      }
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `800 64px ${DISPLAY}`;
      g.fillText('SZT', cx, cy - 6);
      g.font = `700 20px ${FONT}`;
      g.fillText('995 HAS', cx, cy + 46);
    },
    { srgb: false },
  );
}

/** Soft radial glow for additive sprites / auras. */
export function glowTexture(inner = 'rgba(255,214,102,1)', outer = 'rgba(255,184,0,0)') {
  return canvasTexture(128, 128, (g, W) => {
    const grad = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2);
    grad.addColorStop(0, inner);
    grad.addColorStop(0.35, 'rgba(255,190,60,0.35)');
    grad.addColorStop(1, outer);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, W);
  });
}

/** Four-pointed star flare for diamond sparkles. */
export function starTexture() {
  return canvasTexture(128, 128, (g, W) => {
    const c = W / 2;
    const grad = g.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.15, 'rgba(255,240,200,0.6)');
    grad.addColorStop(1, 'rgba(255,220,150,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(c, 0);
    g.quadraticCurveTo(c + 6, c - 6, W, c);
    g.quadraticCurveTo(c + 6, c + 6, c, W);
    g.quadraticCurveTo(c - 6, c + 6, 0, c);
    g.quadraticCurveTo(c - 6, c - 6, c, 0);
    g.fill();
  });
}

export { roundRect };
