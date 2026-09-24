const WA = '905399310520';

export function initForm() {
  const form = document.getElementById('demoForm');
  const note = document.getElementById('formNote');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const invalid = [];
    if (!data.ad?.trim() || data.ad.trim().length < 3) invalid.push('ad');
    if (!data.isletme?.trim()) invalid.push('isletme');
    if ((data.telefon || '').replace(/\D/g, '').length < 10) invalid.push('telefon');

    form.querySelectorAll('.field').forEach((f) => f.classList.remove('is-invalid'));
    if (invalid.length) {
      invalid.forEach((n) => form.elements[n].closest('.field').classList.add('is-invalid'));
      form.elements[invalid[0]].focus();
      note.textContent = 'Lütfen işaretli alanları kontrol edin.';
      note.classList.add('is-error');
      return;
    }

    const msg = [
      'Merhaba, SZTSOFT için ücretsiz demo talep ediyorum.',
      `Ad Soyad: ${data.ad.trim()}`,
      `İşletme: ${data.isletme.trim()}`,
      `Telefon: ${data.telefon.trim()}`,
      `Şube sayısı: ${data.sube}`,
      data.mesaj?.trim() ? `Mesaj: ${data.mesaj.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    note.classList.remove('is-error');
    note.textContent = 'Teşekkürler! WhatsApp penceresinde mesajınızı gönderebilirsiniz.';
    form.classList.add('is-sent');
  });

  form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('is-invalid'));
}
