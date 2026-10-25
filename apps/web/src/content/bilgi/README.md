# Bilgi yazıları

Her yazı bu klasörde bir `.md` dosyası; dosyanın adı adresidir (`ogutme.md` → `/bilgi/ogutme`).
Yeni yazı için bir dosya ekle, başka bir şeye dokunma. İki tür var.

**Yazı:** düz paragraflar, en fazla 300 kelime.

```
---
title: Soru olarak kısa bir başlık? (en fazla 60 karakter)
summary: İki cümlelik cevap (en fazla 200 karakter).
readingMinutes: 2
order: 50
topic: temel
image: bilgi-ogutme
---

Paragraflar arasında bir boş satır bırak. Düz metin: kalın, bağlantı ya da liste yok.
```

**Demleme rehberi:** başlık bilgisinde `method:` ve tarifi olan yazı, en fazla 600 kelime. Tarif
sayfada başlığın altında bir kutuda, ana sayfada yöntemin kartında görünür. Metinde paragrafların
yanında `## ` ile başlayan ara başlıklar ve `1. ` ile başlayan satırlardan numaralı adımlar olabilir
(her biri kendi bloğunda, öncesinde ve sonrasında boş satır).

```
---
title: V60 nedir, nasıl demlenir?
summary: …
readingMinutes: 2
order: 10
topic: demleme
method: V60
dose: 15 g
water: 240 ml
temperature: 93 °C
time: 2,5–3 dk
grind: orta
icon: funnel
image: bilgi-v60
---

Giriş paragrafı.

## Nasıl demlenir?

1. Suyu ısıt.
2. Filtreyi ıslat.
```

`topic` zorunlu ve `/bilgi`'deki bölümü seçer: `demleme`, `cekirdek`, `tadim` ya da `temel`. `order`
listedeki sıradır (demleme 10'lar ve 20'ler, çekirdek 30'lar, tadım 40'lar, temel 50'ler); ana sayfa
ilk yedi rehberi ve her konunun ilk iki yazısını gösterir. `readingMinutes`, `image` ve
`temperature` isteğe bağlı. `image` yazının tek fotoğrafıdır, `src/content/photos.ts` içindeki
adıyla (dosyaları `public/images/` altında, 640 ve 1280 piksel genişlikte iki WebP). `icon`
rehberin kartındaki ikondur, `src/content/icons.ts` içindeki adıyla. Kahve bilgisi yalnızca
`design/icerik.md`'den gelir; yeni bir yazı önce oraya yazılır. Kurallara uymayan bir dosya
derlemeyi durdurur ve hatası neyin eksik olduğunu söyler.
