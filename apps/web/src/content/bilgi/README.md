# Bilgi yazıları

Her yazı bu klasörde bir `.md` dosyası; dosyanın adı adresidir (`ogutme.md` → `/bilgi/ogutme`).
Yeni yazı için bir dosya ekle, başka bir şeye dokunma. Üstteki alanlar:

```
---
title: Soru olarak kısa bir başlık? (en fazla 60 karakter)
summary: İki cümlelik cevap (en fazla 200 karakter).
readingMinutes: 2
order: 5
---

Paragraflar arasında bir boş satır bırak. Düz metin: kalın, bağlantı ya da liste yok.
Yazı en fazla 300 kelime. Kahve bilgisi yalnızca design/icerik.md'den.
```

`readingMinutes` isteğe bağlı; `order` listedeki sıradır. Kurallara uymayan bir dosya derlemeyi
durdurur ve hatası neyin eksik olduğunu söyler.
