/** Public-dir image URL that also works when the site is served from a sub-path (GitHub Pages). */
const img = (name) => `${import.meta.env.BASE_URL}gorseller/${name}`;

/** Product screenshots shown on the 3D laptop (order = scroll order). */
export const SCREENS = [
  'canli-kur-ana-menu.png',
  'alis-satis-modulu.png',
  'alis-modulu.png',
  'cari-musteri-yonetimi.png',
  'cari-bakiye-ozeti.png',
  'raporlama-merkezi.png',
  'kasa-gelir-gider.png',
  'e-donusum-efatura.png',
  'coklu-sube-yonetimi.png',
  'bilanco-finans-merkezi.png',
  'personel-yetki-yonetimi.png',
].map(img);

export const SCREEN_CAPTIONS = [
  'Canlı Kur ve Esnek Yönetim',
  'Gelişmiş Alış & Satış Modülü — Satış ekranı',
  'Gelişmiş Alış & Satış Modülü — Alış ekranı',
  'Cari & Bakiye Kontrolü — Müşteri yönetimi',
  'Cari & Bakiye Kontrolü — Bakiye özeti',
  'Kapsamlı Raporlama Merkezi',
  'Kasa ve Gelir/Gider Takibi',
  'Tam Entegre e-Dönüşüm',
  'Çoklu Şube Yönetimi',
  'Bilanço ve Finans Merkezi',
  'Personel & Yetki Yönetimi',
];

/** Mobile app screens shown on the 3D phone. */
export const PHONE_SCREENS = [
  'szt1.jpeg',
  'szt5.jpeg',
  'szt4.jpeg',
  'szt6.jpeg',
  'szt2.jpeg',
  'szt3.jpeg',
].map(img);
