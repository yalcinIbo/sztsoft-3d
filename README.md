# SZTSOFT — 3D Web Sitesi

sztsoft.com'un Three.js + GSAP ile baştan yazılmış, tamamen 3D sürümü.

## Çalıştırma

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # çıktı: dist/
npm run preview    # derlenmiş sürümü test et
```

Vercel'e yüklerken: Framework **Vite**, build komutu `npm run build`, çıktı klasörü `dist`.

## Sahne akışı

| Bölüm | 3D öğe | Etkileşim |
| --- | --- | --- |
| Hero | Pahlı, altın 3D "S" logo + yörüngede sikke/külçeler | Fare ile eğilir, açılışta dönerek gelir |
| Modüller | S logo, 6 kartlık CSS 3D halkanın içine uçar | Kaydırdıkça halka döner (sabitlenmiş bölüm) |
| e-Dönüşüm | Yelpaze gibi açılan e-Fatura/e-Arşiv belgeleri + "GİB onaylı" altın mühür | Kaydırmaya bağlı |
| Özellikler | Prosedürel laptop, kapağı açılır; ekranda 11 gerçek program görüntüsü | Kaydırdıkça ekran geçişi, tıklayınca büyütme |
| Mobil | Altın çerçeveli telefon, 6 uygulama ekranı arasında kaydırma | Dönerek gelir, adım adım ekran değişir |
| AI Asistan | Gürültü shader'lı "yapay zeka çekirdeği" + halkalar | Sohbet yazarken çekirdek parlar |
| Entegrasyonlar | Noktalı dünya, Türkiye merkezli veri akışı yayları | Fare/kaydırma ile döner |
| Final | Pırlantalı altın yüzük sloganı çerçeveler, sonra kamera içinden geçer | Kaydırmaya bağlı |

Tüm sayfa boyunca derinliğe göre paralaks yapan altın toz partikülleri vardır.

## Klasörler

- `src/webgl/` — 3D sahne (`Experience.js` renderer + DOM↔3D eşleme, her obje ayrı dosya)
- `src/ui/` — kaydırma durumu, reveal animasyonları, imleç, sohbet, form, lightbox
- `src/content.js` — laptop ve telefon ekran görüntülerinin sırası / başlıkları
- `public/gorseller/` — program ekran görüntüleri (aynı isimle değiştirmeniz yeterli)

Her 3D obje, HTML'deki `data-gl="..."` yer tutucusunun konumunu ve boyutunu takip eder; yani yerleşim CSS ile
değiştirilebilir ve 3D otomatik uyum sağlar.

## Notlar

- Demo formu sunucu gerektirmez: bilgileri doldurulmuş bir WhatsApp mesajı açar (+90 539 931 05 20).
- Mobil / dokunmatik cihazlarda performans için bloom kapatılır ve partikül sayısı azaltılır.
- WebGL yoksa statik görsellere, "hareketi azalt" ayarı açıksa animasyonsuz görünüme düşer.
- Geliştirme modunda `?instant` parametresi yükleme ekranını atlar; `window.__szt.settle(y)` belirli bir kaydırma
  konumunu anında hesaplar (production paketine girmez).
