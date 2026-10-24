# Espressoir tasarım dili

Bu dosya sitenin tek tasarım kaynağıdır. Renk, boşluk, köşe, hareket ve font değerleri yalnızca `tokens.css` içindedir; kodda hex renk ya da sabit ölçü yazma, token kullan. `components.css` bileşenlerin referans uygulamasıdır: görünüm ve ölçüler onunla aynı olmalı, ama projenin stil sistemine (ör. Tailwind) uyarlanabilir.

Espressoir bir kahve tadım defteri ve arkadaş çevresine açılan kahve atölyeleridir. Okuyan kişi kahveyi seven ama uzman olmayan biri: arayüz onu sınava sokmaz, sohbet eder. Dil sıcak, sade ve okunur: krem zemin (`--bg`), espresso kahverengisi metin (`--ink`), tek bir tarçın vurgusu (`--accent`).

## İlkeler

1. **Her ekranda tek birincil eylem.** Bir ekranda yalnızca bir birincil buton olur. Diğer her şey ikincil buton ya da metin bağlantısıdır.
2. **Önce kahve, sonra arayüz.** Kahvenin adı ve tadı konuşur, arayüz geri çekilir. `--accent` yalnızca eylem ve etkin durum içindir; başlık, kahve adı ya da alt çizgi boyamaz.
3. **Açıklama gerektirmeyen görseller.** Puan her zaman sayı + tek renkli çubuktur. Renk kodu, efsane ya da "puan skalası" bölümü yok.
4. **Önce okunurluk.** Gövde 16px, en küçük metin 14px. BÜYÜK HARF etiket ve monospace yazı yok; mono yalnızca sayılar için.
5. **Kısa, sıcak Türkçe.** Başlıklar kısa cümle ya da soru. "01 —" gibi bölüm numaraları ve istatistik bantları ana sayfada yer almaz.

## Ses ve yazı

- "Sen" diliyle, kısa cümlelerle yaz. Ünlem ve emoji kullanma.
- Başlıklar cümle düzeninde: "Son tadımlar", "SON TADIMLAR" değil.
- Bilgi başlıklarını soru olarak kur: "Kahve ne kadar taze olmalı?"
- Teknik terimin yanına açıklamasını yaz: "ekstraksiyon (kahvenin suya geçme oranı)".
- Sayılar Türkçe biçimde ve birimiyle: `8,5`, `15 g`, `250 ml`, `93 °C`, `1:16`. Tarih uzun hâliyle "22 Kasım Pazar", kısa hâliyle "22 Kas".
- Buton etiketi bir fiildir: "Başvur", "Tadım ekle", "Devamını oku".

| Yer | Metin |
| --- | --- |
| Hero başlığı | İçtiğin her kahveyi kaydet. |
| Hero alt cümlesi | Puanla, iki cümle not düş, arkadaşlarının ne içtiğine bak. |
| Boş akış | Henüz tadım yok. İlk fincanını ekle. |
| Atölye başlığı | Kahveye giriş atölyesi |
| Atölye alt cümlesi | İki saatte üç demleme yöntemi ve bir mini tadım. |
| Başvuru alındı | Başvurun alındı. İki gün içinde sana yazacağım. |
| Kontenjan doldu | Bu atölye doldu. Bir sonrakinde ilk sana haber vereyim mi? |
| Alt bilgi sloganı | Her fincanın bir hatırası var. |

## Renk

| Token | Kullanım |
| --- | --- |
| `--bg` | Sayfa zemini. Saf beyaz kullanma. |
| `--surface` | Kartlar ve formlar, her zaman 1px `--line` kenarlıkla. |
| `--sunk` | Chip zemini, puan ve kontenjan çubuğunun izi, ikincil butonun hover zemini. |
| `--line` | Dekoratif ayraçlar, kart kenarlıkları. |
| `--line-strong` | Input, seçilebilir chip ve ikincil buton kenarlığı (3:1). |
| `--ink` / `--ink-2` / `--ink-3` | Ana metin / meta ve yardım metni / placeholder ve boş puan. |
| `--accent` | Yalnızca birincil buton, etkin menü çizgisi, puan çubuğu, odak halkası. Üzerindeki metin `--on-accent`. |
| `--accent-ink` | Metin bağlantıları, tat notası metni, birincil butonun hover zemini. |
| `--accent-soft` | Tat notası chip zemini (üzerinde `--accent-ink`). |
| `--crema` | Tarih karosu, hero bandı gibi geniş sıcak zeminler (üzerinde yalnızca `--on-crema`). |
| `--leaf` / `--leaf-soft` | Başarı ve uygunluk: başvuru alındı, kontenjan çubuğu. |
| `--danger` | Form hatası; her zaman açıklayıcı bir cümleyle. |
| `--focus` | Odak halkası (`--accent`in takma adı). |

İki tema var: açık (varsayılan) ve koyu. Koyu tema `[data-theme="dark"]` ile ya da sistem tercihiyle gelir; aynı token adları kullanılır. Koyu temada `--on-accent` koyu bir renktir, butona beyaz yazma.

## Tipografi

Üç aile: `--font-display` (Fraunces) başlıklar ve kahve adları; `--font-sans` (Archivo) diğer her şey; `--font-mono` (IBM Plex Mono) yalnızca puan ve ölçüler. Fontlar Google Fonts'tan, `latin` + `latin-ext` alt kümeleriyle yüklenir (ğ, ş, ı, İ için şart): Fraunces 500/600, Archivo 400/500/600, IBM Plex Mono 400/500. Next.js'te `next/font/google` kullan ve verdiği değişkenleri `--font-display`, `--font-sans`, `--font-mono`'ya bağla.

| Stil | Aile | Mobil | ≥768px | Ağırlık | Kullanım |
| --- | --- | --- | --- | --- | --- |
| display | display | 40/44 | 56/60 | 600 | Sayfa başına bir kez: hero, atölye başlığı |
| title | display | 28/34 | 32/40 | 600 | Bölüm başlıkları |
| card-title | display | 22/28 | 22/28 | 600 | Kahve adı, kart başlığı |
| lead | sans | 18/28 | 18/28 | 400 | Başlığın altındaki tek cümle |
| body | sans | 16/24 | 16/24 | 400 | Gövde, tadım notu, form girdisi |
| label | sans | 14/20 | 14/20 | 600 | Form etiketi, küçük buton |
| meta | sans | 14/20 | 14/20 | 400 | Kavurucu · yöntem · tarih, renk `--ink-2` |
| score | mono | 28/32 | 28/32 | 500 | Puan sayısı (küçük hâli 20/24) |
| figure | mono | 14/20 | 14/20 | 400 | 15 g · 250 ml · 93 °C · 1:16 |

`components.css` bu stilleri `.es-display`, `.es-title`, `.es-card-title`, `.es-lead`, `.es-label`, `.es-meta`, `.es-figure` sınıflarıyla verir.

## Boşluk, köşe, gölge

- 4px tabanlı ölçek: `--space-1` (4) … `--space-16` (64). Kart iç boşluğu mobilde `--space-4`, masaüstünde `--space-6`. Bölümler arası mobilde `--space-12`, masaüstünde `--space-16`.
- Köşeler: chip, avatar, çubuk `--radius-full`; buton, input, tarih karosu `--radius-md`; kart ve kapak görseli `--radius-lg`.
- Ayrımı kenarlıkla yap. Tek gölge `--shadow-sticky`: mobilde altta sabit duran başvuru çubuğu.

## Yerleşim

- Mobil önce: tek kolon, 16px yan boşluk. Okuma sütunu en fazla 640px, kart ızgaraları en fazla 1080px.
- Üst menü: Tadımlar, Atölye, Bilgi + Giriş. Kafeler ve İstatistik profil menüsünde. Hamburger menü yok; 560px altında bağlantılar ikinci satıra iner.

## Görseller ve ikonlar

- Gerçek fotoğraf: fincan, çekirdek, demleme anı; doğal ışık, sıcak ton; kapakta 16:9 ve `--radius-lg`. Fotoğraf yoksa `--crema` ya da `--sunk` düz zemin. Stok illüstrasyon yok.
- Fotoğraflar Unsplash'ten (ücretsiz lisans) seçilir, sitenin kendi dosyası olarak durur: kırpılmış, metadata'sız, 640 ve 1280 piksel genişlikte iki WebP. Her birinin Türkçe açıklaması ve fotoğrafçısı tek listede tutulur; büyük gösterildiği yerde altında "Fotoğraf: Ad / Unsplash" yazar. Kartta başlık her şeyi söylediği için fotoğraf süstür (boş `alt`).
- İkonlar Lucide, 1.5px çizgi, 20px. Emoji yok.

## Logo

- **İşaret:** yukarıdan bakılan bir fincan, sağda kulpu. Kremanın içinde sitenin puan çubuklarıyla yazılmış bir E: bir gövde ve uzunlukları farklı üç yuvarlak uçlu çubuk. Kahve ile defter aynı işarette.
- **Renkler:** ağız ve kulp `--ink`, krema `--crema`, E `--on-crema`; koyu temada da aynı token'lar. Uygulama ikonunda zemin `--ink`, fincan `--bg`.
- **Yazı:** işaretin yanında "Espressoir", `--font-display`, 600 ağırlık, cümle düzeninde. Üst menüde işaret 36px; alt bilgide sloganın yanında tek başına.
- İşaret tek bir çizimdir (40 birimlik kare); site, ikonlar ve paylaşım görselleri aynı çizimi kullanır. Başka renk, gölge ya da eğim verme.

## Durumlar ve hareket

- Her etkileşimli öğede 2px `--focus` odak halkası, 2px boşlukla (`:focus-visible`).
- Hover: birincil buton `--accent-ink`, ikincil buton `--sunk` zemin, menü bağlantısı `--ink-2` → `--ink`.
- Süreler ve eğri `tokens.css`'te: `--motion-fast` (150ms) hover, odak ve menü için; `--motion-slow` (700ms) sayfayla gelen hareket için; ikisi de `--motion-ease` ile yavaşlayarak biter.
- Sayfa açılınca başlık, alt cümle ve kart listeleri sırayla hafifçe yukarı kayarak belirir (60ms arayla); puan ve kontenjan çubukları soldan dolar; kapak fotoğrafı çerçevesine yerleşir. Hepsi bir kez oynar.
- Hover: kart 2px yükselir ve kenarlığı `--line-strong` olur; karttaki fotoğraf hafifçe büyür; menü bağlantısının alt çizgisi soldan uzar; logonun E çubukları yeniden dolar; birincil butondaki ok sağa kayar. Butona basınca 1px iner.
- "Hareketi azalt" tercihi açıksa hiçbiri oynamaz; sayfa ilk hâliyle durur.
- Kaydırmaya bağlı animasyon, açılır pencere ve modal yok; çerez bildirimi altta tek satır.

## Bileşenler

Sınıf adları `components.css` ile aynıdır.

**Button** (`.es-btn`): `--primary` ekrandaki tek ana eylem; `--secondary` diğer eylemler; `--text` satır içi bağlantı; `--sm` (36px) yalnızca menüdeki Giriş; `--block` mobilde tam genişlik. Devre dışıyken durumu söyleyen etiket ("Kontenjan doldu"). Sayfa değiştiriyorsa `<a>`, işlem yapıyorsa `<button>`.

**ScoreBadge** (`.es-score`): puan 0,5 adımlı, virgülle yazılır; çubuk genişliği puan × %10; `role="img"` + `aria-label="Puan: 8,5 / 10"`. `--sm` listelerde; `--empty` puansız kahvede "—". Puana göre renk değiştirme.

**Chip** (`.es-chip`): varsayılan bilgi etiketi (yöntem, menşe); `--note` tat notası (küçük harf: "bal"); `--select` formda çoklu seçim (gizli checkbox'lı `<label>`, seçilince `--ink` zemin). Satırda en fazla beş chip.

**TastingCard** (`.es-card.es-tasting`): kahve adı (`card-title`), `Kavurucu · Yöntem` (`meta`), ScoreBadge, 0–5 tat notası, en fazla üç satır not, `@kullanıcı · 23 Eki` ve `3 beğeni · 1 yorum`. Kartın tamamı detaya giden tek `<a>`; içinde başka bağlantı yok. Not ya da tat notası yoksa o satır hiç çizilmez.

**TasteProfile** (`.es-profile`): Gövde (Hafif/Orta/Yoğun), Asidite (Yumuşak/Dengeli/Canlı), Tatlılık (Az/Orta/Çok), Acılık (Az/Orta/Çok); her biri 1–5, beş nokta (`.on` dolu) ve kelime karşılığı. Her satıra `aria-label="Gövde: 2/5, hafif"`. Radar grafik yok.

**EventCard** (`.es-card.es-event`): `--crema` tarih karosu ("Kas" + "22"), "22 Kasım Pazar · 14:00–16:30", başlık, "Konum, başvurun onaylanınca paylaşılır.", `--leaf` kontenjan çubuğu ve "8 kişilik · 3 yer kaldı", buton. Atölye sayfasında buton birincil "Başvur"; ana sayfada ikincil "Detaylar". Dolunca buton devre dışı "Kontenjan doldu".

**ApplyForm** (`.es-form`): Adın (`name`), Sana nasıl ulaşalım? (`contact`, telefon ya da Instagram), Kahveyle aran nasıl? (`experience`: `new` / `regular` / `home_brewer`, seçenek kartları), Hangi tarihler uyar? (`dates[]`, chip), Merak ettiğin bir şey var mı? (`question`, isteğe bağlı), onay kutusu (`consent`). Etiket üstte, hata altta bir cümleyle (`aria-invalid`, `aria-describedby`), gönderince ilk hatalı alana odak. Başarıda formun yerine `.es-notice`. Placeholder etiket yerine kullanılmaz.

**InfoCard** (`.es-card.es-info`): üstte kenardan kenara 16:9 yazı fotoğrafı (varsa), soru başlığı (≤60 karakter), iki cümlelik cevap (≤200 karakter), isteğe bağlı "2 dakikalık okuma", "Devamını oku" metin bağlantısı. Tek bağlantı "Devamını oku"dur ve kartın tamamını kaplar.

**SiteHeader** (`.es-header`): logo (işaret + "Espressoir"), üç bağlantı (etkin olana `aria-current="page"`: `--ink` + 2px `--accent` alt çizgi), sağda "Giriş" (`es-btn--secondary es-btn--sm`) ya da 32px avatar.

## Sayfalar

**Ana sayfa:** SiteHeader → hero (`--crema` bant: solda `display` başlık, tek `lead` cümle, tek birincil buton: açık atölye varken "Atölyeye başvur", yoksa "Tadım ekle"; yanında yalnızca "Nasıl çalışır?" bağlantısı; sağda 4:3 demleme fotoğrafı, mobilde metnin altında) → sıradaki atölye (EventCard, ikincil buton; atölye yoksa gizli) → son tadımlar (üç TastingCard + "Tümünü gör") → iki üç InfoCard → alt bilgi (slogan, KVKK, Gizlilik, Koşullar).

**Atölye (/atolye):** kapak fotoğrafı → `display` başlık + `lead` → tarih karosu, saat, konum, kontenjan → birincil "Başvur" (mobilde altta sabit `.es-sticky`, forma kayar) → "Ne yapacağız?" numaralı akış, süreler `figure` → "Yanında getir" / "Biz hazırlıyoruz" → sık sorulanlar → ApplyForm.

**Tadım detayı:** kahve adı (`display`), kavurucu ve yöntem, büyük ScoreBadge, TasteProfile, tat notaları, not, beğeni ve yorumlar.

**Bilgi (/bilgi):** InfoCard ızgarası; her yazı en fazla 300 kelime ve tek görsel (yazı sayfasında başlığın altında, fotoğrafçısıyla).

## Eski tasarımdan kaldırılacaklar

- Monospace ve büyük harfli etiketler, menü ve butonlar.
- "01 —" numaralı bölüm başlıkları.
- Kahve adı ve kavurucu altındaki kırmızı çizgiler.
- Puan renk kodu (beyaz/kırmızı/çerçeveli/kesik kutular) ve "Puan skalası" bölümü.
- Ana sayfadaki istatistik bandı, en yüksek puanlılar listesi ve demleme yöntemleri listesi (İstatistik sayfasına taşınır).
- Hero'daki üç eşit buton ve menüde tekrarlanan "Giriş".
- Beğeni/yorum için çerçeveli butonlar.
