# Espressoir tasarım dili

Bu dosya sitenin tek tasarım kaynağıdır. Renk, boşluk, köşe, hareket ve font değerleri yalnızca `tokens.css` içindedir; kodda hex renk ya da sabit ölçü yazma, token kullan. `components.css` bileşenlerin referans uygulamasıdır: görünüm ve ölçüler onunla aynı olmalı, ama projenin stil sistemine (ör. Tailwind) uyarlanabilir.

Espressoir önce kişisel bir kahve tadım defteri; yanında kahve keşfi, demleme rehberleri, topluluk ve arkadaş çevresine açılan atölyeler var. Okuyan kişi kahveyi seven ama uzman olmayan biri: arayüz onu sınava sokmaz, sohbet eder. Dil editoryal, sıcak, sade ve okunur: sıcak krem zemin (`--bg`, Warm Cream), espresso kahverengisi metin ve birincil buton (`--ink`, `--primary`), az kullanılan bir yanık bakır vurgu (`--accent`, Burnt Copper) ve demleme yöntemleriyle filtreler için ikinci, sakin bir adaçayı yeşili (`--sage`). Açık yüzeyler baskındır; koyu kahve metinde ve güçlü eylemlerde, bakır ve adaçayı küçük vurgularda.

## İlkeler

1. **Her ekranda tek birincil eylem.** Bir ekranda yalnızca bir birincil buton olur. Diğer her şey ikincil buton ya da metin bağlantısıdır.
2. **Önce kahve, sonra arayüz.** Kahvenin adı ve tadı konuşur, arayüz geri çekilir. `--accent` yalnızca etkin durum, puan çubuğu, bağlantı ve odak içindir; başlık, kahve adı ya da gövde metni boyamaz. `--sage` yalnızca demleme yöntemi, filtre ve "uygun / tamam" durumları içindir.
3. **Açıklama gerektirmeyen görseller.** Puan her zaman sayı + tek renkli çubuktur. Renk kodu, efsane ya da "puan skalası" bölümü yok.
4. **Önce okunurluk.** Gövde 16px, en küçük metin 14px. BÜYÜK HARF etiket ve monospace yazı yok; sayılar gövde fontunun eşit genişlikli rakamlarıyla (`tabular-nums`) dizilir.
5. **Kısa, sıcak Türkçe.** Başlıklar kısa cümle ya da soru. "01 —" gibi bölüm numaraları ve istatistik bantları ana sayfada yer almaz.
6. **Her şey kutu değil.** Kart yalnızca tek başına bir şey olan içerik içindir (bir tadım, bir kahve, bir yazı). Adımlar, listeler ve bölümler çizgi ve boşlukla ayrılır. Gerçekte olmayan bir şeyi gösterme: örnek içerik "Örnek" diye işaretlenir, eksik veri sıfır gibi gösterilmez ("Henüz puanlanmadı").

## Ses ve yazı

- "Sen" diliyle, kısa cümlelerle yaz. Ünlem ve emoji kullanma.
- Başlıklar cümle düzeninde: "Son tadımlar", "SON TADIMLAR" değil.
- Bilgi başlıklarını soru olarak kur: "Kahve ne kadar taze olmalı?"
- Teknik terimin yanına açıklamasını yaz: "ekstraksiyon (kahvenin suya geçme oranı)".
- Sayılar Türkçe biçimde ve birimiyle: `8,5`, `15 g`, `250 ml`, `93 °C`, `1:16`. Tarih uzun hâliyle "22 Kasım Pazar", kısa hâliyle "22 Kas".
- Buton etiketi bir fiildir: "Başvur", "Tadım ekle", "Devamını oku".

| Yer | Metin |
| --- | --- |
| Hero üst satırı | Kişisel kahve defterin |
| Hero başlığı | İçtiğin kahveleri kaydet. *Her fincanı hatırla.* (ikinci cümle italik) |
| Hero alt cümlesi | Denediğin kahveleri puanla, demleme yöntemini ve aklında kalan tatları not et. Zamanla kendi kahve hafızanı oluştur. |
| Hero eylemleri | İlk tadımını kaydet (üyeye: Tadım ekle) · Kahveleri keşfet |
| Boş akış | Henüz herkese açık tadım yok. |
| Puansız tadım / kahve | Puan verilmedi / Henüz puanlanmadı |
| Atölye başlığı | Kahve 101 |
| Atölye alt cümlesi | Kahveye giriş: V60 ve French press ile demleme pratiği ve bir mini tadım. |
| Başvuru alındı | Başvurun alındı. İki gün içinde sana yazacağım. |
| Kontenjan doldu | Bu atölye doldu. Bir sonrakinde ilk sana haber vereyim mi? |
| Alt bilgi sloganı | Her fincanın bir hatırası var. |

## Renk

| Token | Kullanım |
| --- | --- |
| `--bg` | Sayfa zemini, Warm Cream `#F6F1E9`. Saf beyaz kullanma. |
| `--surface` | Kartlar, formlar, açılır paneller ve alt bilgi, Soft White `#FFFDF9`; kartta her zaman 1px `--line` kenarlıkla. |
| `--sunk` | Chip zemini, puan ve kontenjan çubuğunun izi, ikincil butonun hover zemini, iskelet yükleme. |
| `--line` | Dekoratif ayraçlar, kart kenarlıkları (`#E4D9CC`). |
| `--line-strong` | Input, seçilebilir chip ve ikincil buton kenarlığı (3:1). |
| `--ink` / `--ink-2` / `--ink-3` | Ana metin, Espresso Brown `#3B2B22` / meta ve yardım metni / placeholder. Hepsi zeminde en az 4,5:1. |
| `--primary` / `--primary-hover` / `--on-primary` | Birincil buton: espresso zemin, krem yazı (koyu temada krem zemin, koyu yazı). |
| `--accent` | Burnt Copper `#9A5535`: etkin menü çizgisi, puan çubuğu, logo, odak halkası, seçili sekme ikonu. Geniş alanı doldurmaz. |
| `--accent-ink` | Metin bağlantıları, tat notası metni, üst satır (kicker). Bakırın küçük metinde okunur koyu tonu. |
| `--accent-soft` | Tat notası chip zemini (üzerinde `--accent-ink`). |
| `--sage` / `--sage-ink` / `--sage-soft` | Sage Green `#737B59`: demleme yöntemi chip'leri, seçili filtreler, yöntem ikonlarının dairesi, kontenjan çubuğu, başarı mesajları. Metinde her zaman `--sage-ink` (zeminde 6:1). |
| `--crema` | Tarih karosu gibi küçük sıcak zeminler (üzerinde yalnızca `--on-crema`). |
| `--danger` | Form hatası; her zaman açıklayıcı bir cümleyle. |
| `--focus` | Odak halkası (`--accent`in takma adı). |

İki tema var: açık (varsayılan) ve koyu. Koyu tema `[data-theme="dark"]` ile ya da sistem tercihiyle gelir; aynı token adları kullanılır. Koyu tema siyah değil, sıcak koyu kahvedir (`--bg #1A1411`, kartlar bir ton açık `--surface`); başlık ve gövde krem, bakır ve adaçayı açılmış tonlarıyla. Koyu temada birincil buton krem zeminde koyu yazıdır, `--on-accent` koyu bir renktir.

## Tipografi

İki aile: `--font-display` (Fraunces) başlıklar, kahve adları ve hero'nun italik ikinci cümlesi; `--font-sans` (Manrope) diğer her şey: gövde, menü, buton, form, puan ve ölçüler. Sayılar Manrope'un eşit genişlikli rakamlarıyla (`tabular-nums`) yazılır, monospace yok. Fontlar Google Fonts'tan, `latin` + `latin-ext` alt kümeleriyle yüklenir (ğ, ş, ı, İ için şart): Fraunces 500/600 (normal ve italik), Manrope 400/500/600/700. Next.js'te `next/font/google` kullan ve verdiği değişkenleri `--font-display`, `--font-sans`'a bağla. Paylaşım görselleri aynı iki aileyi `src/assets/fonts` içindeki dosyalardan çizer.

| Stil | Aile | Mobil | ≥768px | Ağırlık | Kullanım |
| --- | --- | --- | --- | --- | --- |
| display | display | 40/44 | 56/60 | 600 | Sayfa başına bir kez: hero, atölye başlığı |
| title | display | 28/34 | 32/40 | 600 | Bölüm başlıkları |
| card-title | display | 20/26 | 22/28 | 600 | Kahve adı, kart başlığı |
| lead | sans | 18/28 | 18/28 | 400 | Başlığın altındaki tek cümle |
| body | sans | 16/24 | 16/24 | 400 | Gövde, tadım notu, form girdisi |
| kicker | sans | 14/20 | 14/20 | 600 | Başlığın üstündeki satır ("Kişisel kahve defterin"), `--accent-ink`, cümle düzeninde |
| label | sans | 14/20 | 14/20 | 600 | Form etiketi, küçük buton |
| meta | sans | 14/20 | 14/20 | 400 | Kavurucu · yöntem · tarih, renk `--ink-2` |
| score | sans, tabular | 28/32 | 28/32 | 600 | Puan sayısı (küçük hâli 20/24) |
| figure | sans, tabular | 14/20 | 14/20 | 500 | 15 g · 250 ml · 93 °C · 1:16 |

Kodda bu stiller `type-display`, `type-title`, `type-card-title`, `type-lead`, `type-kicker`, `type-label`, `type-meta`, `type-figure` yardımcı sınıflarıdır.

## Boşluk, köşe, gölge

- 4px tabanlı ölçek: `--space-1` (4) … `--space-24` (96): 4, 8, 12, 16, 24, 32, 48, 64, 80, 96. Kart iç boşluğu mobilde `--space-4`, masaüstünde `--space-6`. Bölümler arası mobilde `--space-12` (48), masaüstünde `--space-20` (80); alt bilgi masaüstünde `--space-24` aşağıda başlar.
- Köşeler: chip, avatar, çubuk `--radius-full`; buton, input, tarih karosu `--radius-md`; kart ve kapak görseli `--radius-lg`.
- Ayrımı kenarlıkla yap; kartta gölge yok. İki gölge var: `--shadow-raised` sayfanın üstünde süzülen yüzeyler için (Keşfet paneli, hesap menüsü, hero'daki örnek tadım kartı), `--shadow-sticky` altta sabit duran çubuklar için (başvuru, kaydet, üye sekme çubuğu).

## Yerleşim

- Mobil önce: tek kolon, 16px yan boşluk. Okuma sütunu en fazla 640px, sayfa en fazla 1152px (`max-w-grid`).
- Üst menü, solda: logo, **Keşfet** (açılır panel: Kahveler, Tadım notları, Kafeler, İstatistik; her biri bir satır açıklamayla), **Rehberler** (/bilgi), **Atölye**. Sağda arama düğmesi, üyeye "Tadım ekle" (ikincil, küçük; yalnızca ≥768px) ve Giriş ya da profil resmi. Hamburger menü yok; 560px altında menü ikinci satıra iner.
- Üye sekme çubuğu (yalnızca oturum açmış üyeye, 768px altında): Akış, Keşfet, Ekle (ortada espresso daire), Defterim (/panel). Altta sabit, güvenli alan boşluğuyla; sayfanın sonu onun altında kalmaz. Kendi alt çubuğu olan sayfalarda (tadım ve ziyaret formları, atölye) ve giriş, kurulum, yönetim sayfalarında görünmez.
- Alt bilgi `--surface` bir bant: solda işaret, slogan ve bir cümle; sağda dört grup (Espressoir, Keşfet, Öğren, Yasal metinler); en altta yıl ve tema seçimi. Gerçek bir iletişim adresi yoksa iletişim satırı da yok.

## Görseller ve ikonlar

- Gerçek fotoğraf: fincan, çekirdek, demleme anı; doğal ışık, sıcak ton; kapakta 16:9 ve `--radius-lg`. Fotoğraf yoksa `--crema` ya da `--sunk` düz zemin. Stok illüstrasyon yok.
- Fotoğraflar Unsplash'ten (ücretsiz lisans) seçilir, sitenin kendi dosyası olarak durur: kırpılmış, metadata'sız, 640 ve 1280 piksel genişlikte iki WebP. Her birinin Türkçe açıklaması ve fotoğrafçısı tek listede tutulur; büyük gösterildiği yerde altında "Fotoğraf: Ad / Unsplash" yazar. Kartta başlık her şeyi söylediği için fotoğraf süstür (boş `alt`).
- İkonlar Lucide, 1.5px çizgi, 20px. Emoji yok.

## Logo

- **İşaret (veri çekirdeği):** sitenin puan çubuklarından örülmüş, dik duran bir kahve çekirdeği. Sekiz sıra yuvarlak uçlu çubuk bir oval doldurur; çubukların arasından sağa sola kıvrılarak geçen boşluk çekirdeğin yarığıdır. Kahve ile istatistik aynı işarette.
- **Renkler:** çubuklar `--accent` (puan çubuğuyla aynı renk; koyu temada koyu temanın `--accent`'i). Uygulama ikonunda zemin `--ink`, çubuklar koyu temanın `--accent`'i.
- **Yazı:** işaretin yanında "Espressoir", `--font-display`, 600 ağırlık, cümle düzeninde. Üst menüde işaret 36px yüksekliğinde; alt bilgide sloganın yanında tek başına.
- İşaret tek bir çizimdir; site, ikonlar ve paylaşım görselleri aynı çubukları kullanır. Başka renk, gölge, eğim ya da çerçeve verme.

## Durumlar ve hareket

- Her etkileşimli öğede 2px `--focus` odak halkası, 2px boşlukla (`:focus-visible`).
- Hover: birincil buton `--accent-ink`, ikincil buton `--sunk` zemin, menü bağlantısı `--ink-2` → `--ink`.
- Süreler ve eğri `tokens.css`'te: `--motion-fast` (150ms) hover, odak ve menü için; `--motion-slow` (700ms) sayfayla gelen hareket için; ikisi de `--motion-ease` ile yavaşlayarak biter.
- Sayfa açılınca başlık, alt cümle ve kart listeleri sırayla hafifçe yukarı kayarak belirir (60ms arayla); puan ve kontenjan çubukları soldan dolar; kapak fotoğrafı çerçevesine yerleşir. Hepsi bir kez oynar.
- Hover: kart 2px yükselir ve kenarlığı `--line-strong` olur; karttaki fotoğraf hafifçe büyür; menü bağlantısının alt çizgisi soldan uzar; logonun çubukları yukarıdan aşağı sırayla yeniden dolar; birincil butondaki ok sağa kayar. Butona basınca 1px iner.
- Sayfa değişirken eski sayfanın içeriği hızla (`--motion-fast`) solar, yenisi tarayıcının kendi geçişiyle belirir. Yalnızca bir bağlantıya tıklayınca; ilk açılışta ve yenilemede geçiş yok.
- "Hareketi azalt" tercihi açıksa hiçbiri oynamaz; sayfa ilk hâliyle durur.
- Kaydırmaya bağlı animasyon, açılır pencere ve modal yok; çerez bildirimi altta tek satır: bir cümle, "Ayrıntılar" bağlantısı, eşit ağırlıkta "Reddet" ve "Kabul et" (ikisi de ikincil buton). Yalnızca Google Analytics tanımlıyken ve ziyaretçi henüz cevap vermemişken görünür.

## Bileşenler

Sınıf adları `components.css` ile aynıdır.

**Button** (`.es-btn`): `--primary` ekrandaki tek ana eylem, espresso zemin krem yazı; `--secondary` diğer eylemler, `--surface` zemin ve `--line-strong` kenar; `--text` satır içi bağlantı; `--sm` (36px) yalnızca üst menüde (Giriş, Tadım ekle) ve çerez çubuğunda; `--block` mobilde tam genişlik. Devre dışıyken durumu söyleyen etiket ("Kontenjan doldu"). Sayfa değiştiriyorsa `<a>`, işlem yapıyorsa `<button>`.

**ScoreBadge** (`.es-score`): tam puan, ortalama tek ondalıkla ve virgülle yazılır; çubuk genişliği puan × %10; `role="img"` + `aria-label="Puan: 8,5 / 10"`. `--sm` listelerde. Puan yoksa çizgi ya da "—" değil, sözcük: tadımda "Puan verilmedi", kahve ve kafede "Henüz puanlanmadı". Puana göre renk değiştirme.

**Chip** (`.es-chip`): varsayılan bilgi etiketi (menşe, form, "Örnek kayıt"); `--note` tat notası (küçük harf: "bal"); `--method` demleme yöntemi (`--sage-soft` zemin, `--sage-ink` yazı); `--select` formda çoklu seçim. Seçilebilir chip (filtre, fincan sayısı) basılıyken `--sage-soft` zemin, `--sage-ink` kenar ve bir tik işareti alır: durum yalnızca renkle anlatılmaz. Seçili filtreler kartın üstünde "×" ile kaldırılan chip'lerdir. Satırda en fazla beş chip.

**TastingCard** (`.es-card.es-tasting`): kahve adı (`card-title`), `Kavurucu · Yöntem` (`meta`), ScoreBadge, 0–5 tat notası, en fazla üç satır not, `@kullanıcı · 23 Eki` ve `3 beğeni · 1 yorum`. Kartın tamamı detaya giden tek `<a>`; içinde başka bağlantı yok. Not ya da tat notası yoksa o satır hiç çizilmez.

**TasteProfile** (`.es-profile`): Gövde (Hafif/Orta/Yoğun), Asidite (Yumuşak/Dengeli/Canlı), Tatlılık (Az/Orta/Çok), Acılık (Az/Orta/Çok); her biri 1–5, beş nokta (`.on` dolu) ve kelime karşılığı. Her satıra `aria-label="Gövde: 2/5, hafif"`. Radar grafik yok.

**EventCard** (`.es-card.es-event`): `--crema` tarih karosu ("Kas" + "22"), "22 Kasım Pazar · 14:00–16:30 · 2,5 saat", başlık, "Konum, başvurun onaylanınca paylaşılır.", ücret satırı, `--sage` kontenjan çubuğu ve "8 kişilik · 3 yer kaldı", buton. Atölye sayfasında buton birincil "Başvur"; ana sayfada ikincil "Detaylar". Geniş ekranda kontenjan ve buton sağda ayrı durur. Dolunca buton devre dışı "Kontenjan doldu".

**ApplyForm** (`.es-form`): Adın soyadın (`name`), Telefon numaran (`contact`, yalnızca telefon), Kahveyle aran nasıl? (`experience`: `new` / `regular` / `home_brewer`, seçenek kartları), Merak ettiğin bir şey var mı? (`question`, isteğe bağlı), onay kutusu (`consent`, tek kısa satır ve aydınlatma metnine bağlantı). Etiket üstte, hata altta bir cümleyle (`aria-invalid`, `aria-describedby`), gönderince ilk hatalı alana odak. Başarıda formun yerine `.es-notice`. Placeholder etiket yerine kullanılmaz.

**InfoCard** (`.es-card.es-info`): üstte kenardan kenara 16:9 yazı fotoğrafı (varsa), soru başlığı (≤60 karakter), iki cümlelik cevap (≤200 karakter), isteğe bağlı "2 dakikalık okuma", "Devamını oku" metin bağlantısı. Tek bağlantı "Devamını oku"dur ve kartın tamamını kaplar.

**GuideCard**: ana sayfada bir demleme yöntemi; kartın tamamı rehbere giden tek bağlantı. `--sunk` daire içinde Lucide ikon (V60 huni, AeroPress silindir, moka alev, French press aşağı ok, espresso basınç göstergesi, Türk kahvesi fincan, soğuk demleme kar tanesi), yöntemin adı (`card-title`), "15 g · 240 ml" (`figure`), "2,5–3 dk · orta öğütme" (`meta`), `--accent-ink` ok. Hover: kart 2px yükselir, ikon hafifçe yatar, ok sağa kayar.

**SiteHeader** (`.es-header`): logo (işaret + "Espressoir"), üç bağlantı (etkin olana `aria-current="page"`: `--ink` + 2px `--accent` alt çizgi), sağda 40px arama düğmesi (Lucide büyüteç, `--ink-2`, hover `--sunk` zemin; `/` ya da ⌘K ile de açılır) ve "Giriş" (`es-btn--secondary es-btn--sm`) ya da 32px avatar.

**EmptyState**: boş bir listenin yerine kesik çizgili, kartsız bir alan: kısa bir cümle (neden boş), bir cümle (ne yapılabilir) ve gerekiyorsa tek bir eylem ("Filtreleri temizle", "Kahveleri keşfet"). Gri bir paragraf ya da boş beyaz alan bırakma.

**Yükleme ve hata**: tarayıcıda okunan her şey (yorumlar, takip akışı, "Daha fazla göster") yüklenirken iskelet (`--sunk`) gösterir, metni yalnızca ekran okuyucu duyar. Okuma başarısız olursa hata cümlesinin altında "Tekrar dene" düğmesi olur; sonsuz "yükleniyor" yok.

**FeaturedArticle**: bir sayfanın başladığı yazı (Rehberler'de ilk demleme rehberi): geniş ekranda fotoğraf solda, metin sağda; üst satır "Buradan başla", `title` başlık, özet, rehberse ölçüler, okuma süresi ve tek bağlantı "Rehberi aç" (kartın tamamını kaplar).

**ArticleRow**: yazı listesinin satırı: üstte konu · okuma süresi (`meta`), altında soru (`display` 20px), sağda `--accent-ink` ok; satırın tamamı tek bağlantı. Öne çıkan yazının yanında ve yazı sayfasının sonunda kart yerine kullanılır.

**ExploreMenu** (Keşfet): üst menüde bir düğme (`aria-expanded`), altında `--surface` panel ve `--shadow-raised`: dört bağlantı, her biri `--sage-soft` daire içinde ikon, ad ve bir satır açıklama. Escape, dışarı tıklama ya da sayfa değişimi kapatır; Escape odağı düğmeye geri verir.

**MemberTabBar**: yukarıdaki üye sekme çubuğu. Etkin sekmenin ikonu `--accent`, üstünde 2px `--accent` çizgi, adı `--ink`; diğerleri `--ink-2`.

**SampleTasting**: ana sayfadaki örnek tadım kartı: gerçek tadım kartının parçalarıyla (puan, yöntem, tat notaları, tat profili, not) çizilir, üstünde "Örnek kayıt" chip'i ve altında "(örnek)" yazar, hiçbir yere bağlanmaz. Gerçek bir üyenin kaydı tanıtımda kullanılmaz.

**BrewAssistant**: rehberde tarif kutusunun altında, kart. "Birlikte demleyelim" (`card-title`) ve bir cümle; birden çok fincan yapılabilen yöntemde "Kaç fincan?" seçim chip'leri ve ölçeklenmiş kahve · su · oran (`figure`); büyük saat (mono, `/ 3:00` yanında) ve altında tek `--accent` ilerleme çubuğu; `--sunk` kutuda "Şimdi": adımın adı, ne yapılacağı, "Terazide 140 ml olana kadar", sıradaki adım; birincil "Başlat" (çalışırken "Duraklat", espressoda "Durdur"), ikincil "Baştan"; altta adımlar listesi (zaman `figure`, işarete bakılan anlar "yaklaşık"), şimdiki adım `--sunk` zeminde, geçenler `--ink-3`. Bitince "Afiyet olsun." ve ikincil "Bu fincanı deftere yaz". Soğuk demlemede saat yok: "Şimdi kurarsan yarın 08:00 ile yarın 14:00 arasında hazır."

**QuizBand**: kahve testine giden kart: soru başlığı (`card-title`), bir cümle, ikincil "Teste başla" ve ok.

**ShareButton**: metin bağlantısı görünümünde "Paylaş" (Lucide paylaş ikonu); telefonda paylaşım menüsünü açar, açamazsa bağlantıyı kopyalayıp "Bağlantı kopyalandı." der.

## Sayfalar

**Ana sayfa:** önce defter. SiteHeader → hero (iki kolon, `--bg` üzerinde: solda kicker "Kişisel kahve defterin", `display` başlık ve italik ikinci cümlesi, tek `lead`, birincil "İlk tadımını kaydet" (ziyaretçide /giris, üyede "Tadım ekle" → form) ve ikincil "Kahveleri keşfet"; ziyaretçiye altında "Kayıt şimdilik davetle" satırı ve tadım notlarına bağlantı. Sağda 4:3 demleme fotoğrafı ve onun alt kenarına binen SampleTasting: tek kolondayken ortada, 1024px'ten itibaren metne doğru hafifçe kaymış; kart fotoğrafın üstüne konumlanmaz, akışta durur, fotoğrafı kapatmaz) → "Nasıl çalışır?" (üç adım: Kahveni bul, Tadımını kaydet, Geçmişini keşfet; kart değil, üstte ince çizgi ve `--sage-soft` daire içinde ikon) → son tadımlar (üç TastingCard + "Tüm tadımları gör"; yoksa EmptyState) → kahveleri keşfet (topluluğun en beğendiği altı kahve, kart görünümünde, "Tüm kahveleri keşfet") → demleme rehberleri (üç GuideCard ve "Bütün rehberler" hücresi; altında QuizBand) → "Merak ettiklerin" (bir InfoCard ve yanında dört ArticleRow) → sıradaki atölye (EventCard, ikincil buton; atölye yoksa gizli) → alt bilgi.

**Atölye (/workshop):** kapak fotoğrafı → `display` başlık + `lead` → tarih karosu, saat ve süre (süre başlangıç ve bitişten hesaplanır: "11:00–13:30 · 2,5 saat"; "Takvime ekle" ve "Google Takvim" bağlantılarıyla), konum, ücret (yönetimde yazıldığı gibi), kontenjan → birincil "Başvur" (mobilde altta sabit `.es-sticky`, forma kayar) → "Ne yapacağız?" numaralı akış, süreler `figure` → "Yanında getir" / "Biz hazırlıyoruz" → sık sorulanlar (her soru açılır kapanır, hepsi kapalı başlar; tarayıcının kendi `<details>` öğesi, yanında dönen bir ok) → ApplyForm.

**Tadım detayı:** kahve adı (`display`), kavurucu ve yöntem, büyük ScoreBadge, TasteProfile, tat notaları, not, beğeni ve yorumlar.

**Rehberler (/bilgi):** başlık ve `lead` → "Rehberlerde ara" kutusu (/ara'ya gider) → konu bağlantıları (chip görünümünde, yazı sayısıyla) → FeaturedArticle (ilk demleme rehberi) → QuizBand → konulara ayrılmış InfoCard ızgaraları: Demleme rehberleri, Çekirdek ve kavrum, Tadım, Temel bilgiler. Yazı düz paragraflardır, en fazla 300 kelime. Demleme rehberi ise en fazla 600 kelime olabilir; başlığın ve fotoğrafın altında tarif kutusu (kahve, su, sıcaklık, süre, öğütme; ölçüler `figure`), sonra BrewAssistant, sonra ara başlıklar ve numaralı adımlar (atölye programıyla aynı numaralar) bulunur. Her yazının tek görseli var (yazı sayfasında başlığın altında, fotoğrafçısıyla). Başlığın üstünde yol (Rehberler / konu), altında okuma süresi ve ShareButton. Tarif kutusunda ölçüler büyük (20px) ve sol kenarında `--sage` çizgiyle; oran, demleme planının kendi sayılarından hesaplanır. Sayfanın sonunda aynı konudan dört ArticleRow.

**Kahveler (/kahveler):** başlık → büyük arama kutusu (büyüteç ikonuyla); yanında mobilde "Filtreler (n)" düğmesi, geniş ekranda filtreler açık (marka, form, yöntem, en az / en çok puan, yıl) → seçili filtreler chip olarak → sonuç sayısı, "Filtreleri temizle", sıralama ve görünüm → liste ya da kartlar. Kahve kartında puan, "2 tadım · son tarih" ve yöntemler adaçayı chip'leri. Sonuç yoksa EmptyState.

**Kahve sayfası:** yol, ad, puan ve tadım sayısı; birincil "Tadım ekle" (form o kahveyle açılır: `/panel/tadim/yeni/<kahve>`), ikincil "Denemek istiyorum" (kendi listen; basılıyken adaçayı ve tik) ve "Listeye ekle" (kendi oluşturduğun listeler); tadımlar, künye, puan dağılımı, topluluk tat profili.

**İstatistik:** başlık → tek çerçevede başlık sayıları (FieldStrip: çerçeve içinde ince çizgilerle ayrılmış rakamlar) → dağılım, zaman, markalar… Zaman içinde tadımlar önce yalnızca tadım olan son on iki ayı satır olarak gösterir (sayısı yazılı); boş aylarıyla bütün takvim "Bütün ayları göster" altında.

**Yasal sayfalar:** taslak notu (ikonlu, çerçeveli), "Bu sayfada" içindekiler listesi, sonra bölümler. Doğrulanmamış bilgi (iletişim adresi, işletme bilgisi) uydurulmaz; eksikler `docs/launch-checklist.md`'dedir.

**Ara (/ara):** `title` başlık, büyük arama kutusu (etiket "Ne arıyorsun?"), yazdıkça sonuçlar: Yazılar, Kahveler, Markalar, Kafeler, Üyeler; her grup küçük etiket başlıklı, her sonuç tek bağlantı (ad + bir satır `meta`). Kutu boşken rehberlere ve teste giden chip'ler.

**Kahve testi (/kahve-testi):** `display` soru başlığı ve `lead`; "Soru 2 / 5" (`meta`) ve `--ink-2` ilerleme çubuğu; soru (`title`) ve seçenekler (kenarlıklı kart düğmeler, ad + ipucu); "Önceki soru" metin bağlantısı. Sonuçta yöntem (`display`), rehberin özeti ve ölçüleri, birincil "Rehberi aç", ShareButton, kavrum kartı (kavrum, tadı, pakette bakılacak yer) ve ikincil "Baştan başla".

## Eski tasarımdan kaldırılacaklar

- Monospace ve büyük harfli etiketler, menü ve butonlar (2026-10-28'den beri sayılarda da mono yok).
- Kart başına bir başlık rakamı (FieldStrip artık tek çerçeve).
- "01 —" numaralı bölüm başlıkları.
- Kahve adı ve kavurucu altındaki kırmızı çizgiler.
- Puan renk kodu (beyaz/kırmızı/çerçeveli/kesik kutular) ve "Puan skalası" bölümü.
- Ana sayfadaki istatistik bandı, en yüksek puanlılar listesi ve demleme yöntemleri listesi (İstatistik sayfasına taşınır).
- Hero'daki üç eşit buton ve menüde tekrarlanan "Giriş".
- Beğeni/yorum için çerçeveli butonlar.
