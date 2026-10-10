# ☕ Espressoir — Kahve Tadım Arşivi & Topluluğu
### Claude Code proje brief'i

> **Ad:** Espressoir (espresso + memoir, "kahve anı defteri"). **Alan adı:** `espressoir.com`. Adı ve alan adını kodda tek bir config sabitinden (`siteConfig.name`, `siteConfig.url`) oku ki tek yerden değiştirilebilsin.
>
> **Slogan önerisi:** "Her fincanın bir hatırası var." (EN: "Every cup, remembered.")
>
> **Önemli:** Adında "espresso" geçse de site **tüm demleme yöntemlerini** kapsar: filtre, V60, kapsül, French press, Türk kahvesi… Ana sayfa ve tanıtım metinleri bunu açıkça hissettirsin; filtre kahve içen biri de kendini burada evinde hissetmeli.
>
> **Bütçe:** aylık 0 ₺ hedefi (Vercel Hobby + Supabase Free). Ücretli plana geçiş gerektiren her şeyi önce bana sor.

---

## 0. Benimle nasıl çalışacaksın

- Bu dosyayı baştan sona oku, sonra **plan modunda** başla. Kod yazmadan önce Faz 0 + Faz 1 için uygulama planı, klasör yapısı ve veritabanı şemasını (tablo/ilişki listesi) göster; belirsiz gördüğün noktaları en fazla 5 soruda topla ve onayımı bekle.
- Fazları sırayla yap. Her fazın sonunda: proje çalışıyor, lint/typecheck/testler geçiyor, anlamlı commit'ler atılmış ve bana kısa bir özet + "nasıl denerim" adımları veriyorsun. **Onayım olmadan bir sonraki faza geçme.**
- İlk iş olarak bu brief'ten kısa bir `CLAUDE.md` üret (stack, komutlar, klasör yapısı, konvansiyonlar, faz durumu) ve her faz sonunda güncelle.
- Şu durumlarda dur ve sor: ücretli bir servis/plan gerektiren adım, veri silen veya geri alınamaz migration, auth akışında köklü değişiklik, bu brief'le çelişen bir karar.
- Gizli anahtarları asla commit etme; `.env.example` tut, `.env.local` git'e girmesin.
- Kod, tablo ve değişken adları **İngilizce**; arayüz metinleri **Türkçe**. Tüm UI metinleri tek bir sözlük dosyasında dursun (ileride İngilizce eklenebilsin).
- Hakkımda: İstatistik 3. sınıf öğrencisiyim, Python'la veri analizi yapıyorum; web geliştirmede orta seviyedeyim. Önemli mimari kararları 2–3 cümleyle gerekçelendir, ama uzun ders anlatma.
- Mac (Apple Silicon) üzerinde geliştiriyorum. Docker kurmayacağım; geliştirme doğrudan bulut `dev` veritabanına karşı yapılır.

---

## 1. Vizyon

Notion'da tuttuğum kişisel kahve tadım notlarımı herkese açık, kalıcı bir **arşive** dönüştürmek; sonra bunu kahve sevenlerin kendi tadımlarını kaydettiği, birbirinin notlarının altında yorumlaştığı ve birbirini takip ettiği bir **kahve sosyal ağına** büyütmek.

Referans: *kahve için Letterboxd / Untappd / Vivino.* Kullanıcı bir kahveyi "loglar", puanlar, not yazar; diğerleri beğenir, yorumlar, takip eder.

İki temel taş:
1. **Arşiv** — benim tadımlarım: hızlı, SEO dostu, filtrelenebilir, paylaşılabilir.
2. **Topluluk** — herkesin tadımları aynı kahve sayfasında buluşur; yorum, beğeni, takip, akış.

**Kilit tasarım kararı:** *Kahve* (ürün: marka + isim) ile *tadım* (bir kişinin o kahveyle bir deneyimi) ayrı varlıklardır. Bir kahvenin çok sayıda tadımı olur; topluluk puanı tadımlardan hesaplanır; yorumlar tadımların altına yazılır.

---

## 2. Mevcut veri: Notion "Coffee Tasting" veritabanı

Yaklaşık 30 kayıt (2023–2026). Kolonlar ve hedef alanlar:

| Notion kolonu | Anlamı | Hedef |
|---|---|---|
| Brand/Producer | Marka / kavurucu | `brands.name` |
| Origin/All Name | Kahvenin adı **veya** menşei (Colombia, Ethiopia, Brazilian…) | `coffees.name`; menşei açıkça belliyse `origin_country` da doldur, emin değilsen boş bırak |
| Status: `Milled` / `Capsule` / `Core` | Kahvenin formu (`Core` = çekirdek) | `coffees.form`: `ground` / `capsule` / `whole_bean` |
| Intensity (sayı, kayıtlarda 4–11) | Markanın kendi yoğunluk skalası (çoğunlukla kapsüllerde, bazı çekirdeklerde de var) | `coffees.brand_intensity` — markalar arası karşılaştırmada kullanılmaz |
| Select | Demleme yöntemi / cihaz | `V60` → V60 · `Nespresso C30` → Kapsül Makinesi + device "Nespresso C30" · `Filter Coffee Machine` → Filtre Kahve Makinesi · `Wacaco NS2` → Taşınabilir Espresso + device "Wacaco NS2" |
| Score (1–10) | Puan (export'ta metin/select olarak gelebilir, sayıya çevir) | `tastings.score` |
| Date | Tadım tarihi ("July 8, 2025" gibi metin olabilir, sağlam parse et) | `tastings.tasted_at` |
| Notes | Türkçe serbest tadım notu | `tastings.notes` |

**Girdi:** `data/notion-export.csv` (Notion → ••• → Export → "Markdown & CSV"). Export'ta her satır için ayrıca bir `.md` sayfası varsa ve sayfa gövdesinde ek not bulunuyorsa, onu da notlara ekle.

**Bilinen veri sorunları — import'ta ele al:**
- Tutarsız marka yazımı: `Starbuck` ↔ `Starbucks`, `Jacob's` ↔ `Jacobs`. Marka normalizasyonu yap; `brands.aliases` alanında eski yazımları sakla. Belirsiz eşleşmeleri otomatik birleştirme, raporla.
- Yazım hatası: `Papua New Guine` → `Papua New Guinea`.
- Puanı olmayan satırlar: tarihi de yoksa `status = 'wishlist'` (denenecek); tarihi varsa puansız tadım (`score = null`). Örnekler: Starbucks Single-Origin Colombia, Jacobs İntenso Lungo, Davidoff Rich Aroma Vivio&Spicy, Starbucks Pike Place, Starbucks House Blend. Tchibo Privat Kaffee satırında form da yok — null bırak ve raporla. **Asla değer uydurma.**
- Notlar ağız diliyle yazılmış ("bi", küçük yazım hataları). Notları **olduğu gibi** içe aktar; istersen ayrı bir `import-report.md` içinde düzeltme önerisi listele, ben onaylarım.
- Türkçe karakterli isimler var (İntenso, Kahve Dünyası, Kurukahveci Mehmet Efendi) — UTF-8'i ve slug üretimini (İ→i, ı→i, ş→s, ğ→g, ü→u, ö→o, ç→c) doğru yap.

**Import script'i:** `pnpm import:notion` — idempotent (tekrar çalışınca kopya oluşturmaz; `source = 'notion_import'` + kaynak satır kimliğiyle eşleşir), `--dry-run` modu var, sonunda özet rapor yazar (kaç marka/kahve/tadım eklendi, hangi satırlar atlandı, hangi markalar birleştirildi). Tüm kayıtlar benim kullanıcıma (`OWNER_USERNAME` env) atanır.

Notlarımda sık geçen tadım kavramları — yapılandırılmış alanlar ve etiketler için ipucu: **gövde, açılış, ekşilik, bitterlik/acılık, kremalılık, yoğunluk, içim sonrası kalan tat, çiçeksi, meyvemsi, bitter çikolata, vanilya, fiyat/performans.**

---

## 3. Teknoloji yığını

- **Next.js** (App Router, en güncel stabil sürüm) + **TypeScript** (strict), paket yöneticisi **pnpm**
- **Tailwind CSS** + **shadcn/ui** (bileşenleri projeye özgü temayla özelleştir; varsayılan görünümde bırakma)
- **Supabase (Free plan)**: Postgres, Auth, Storage, Row Level Security. Şema değişiklikleri yalnızca Supabase CLI migration'larıyla; TypeScript tipleri şemadan üretilsin.
  - **Docker yok, lokal veritabanı yok.** İki bulut projesi kullan: `dev` (geliştirme ve testler) ve `prod` (canlı site). İkisi de Frankfurt bölgesinde (eu-central-1). Migration'lar önce `dev`'e (`supabase link` + `supabase db push`), doğrulandıktan sonra `prod`'a uygulanır.
  - Ücretsiz plan sınırları: 2 aktif proje, 500 MB veritabanı, aylık 50.000 aktif kullanıcı; 7 gün hareketsiz kalan proje duraklatılır; **otomatik yedek yok**; **görsel dönüştürme (image transformations) yok**. Mimariyi bunlara göre kur.
  - Yedek: haftada bir `prod` veritabanının `pg_dump` yedeğini alan bir GitHub Actions iş akışı yaz. Döküm kullanıcı verisi içerdiği için şifrelenerek saklansın, herkese açık hiçbir yere konmasın.
- **Zod** ile sunucu tarafı doğrulama; Server Actions / Route Handlers
- Postgres eklentileri: `pg_trgm` (marka/kahve benzerlik araması, kopya tespiti), `unaccent`; tam metin arama için `turkish` yapılandırması
- **Testler:** Vitest (birim), Playwright (kritik akışlar), RLS policy testleri
- **CI:** GitHub Actions — lint, typecheck, test
- **Yayın:** **Vercel Hobby** (ücretsiz; yalnızca kişisel, ticari olmayan kullanım) + Supabase Free. Vercel fonksiyon bölgesi `fra1` (veritabanına yakın olsun). Başta `*.vercel.app` alt alan adı; sonra `espressoir.com` (alan adı alındı; Vercel'e bağlamak için gereken DNS kayıtlarını bana adım adım listele, `www` → kök alan adı yönlendirmesi dahil). Hobby'de limit aşılırsa fatura çıkmaz, özellik durur. Bu yüzden statik/ISR sayfaları tercih et, sunucu fonksiyonu kullanımını düşük tut. İleride reklam, sponsor veya ücretli üyelik gelirse Vercel Pro'ya geçmek gerekir; mimari buna engel olmasın.
- Opsiyonel: Cloudflare Turnstile (spam), Sentry (hata takibi), Vercel Analytics veya Plausible (çerezsiz analitik)

Gerekçe: tek kişinin yönetebileceği, ücretsiz katmanda çalışan, auth + DB + dosya depolamayı tek yerde toplayan bir yığın.

---

## 4. Veri modeli (başlangıç önerisi — gerekirse iyileştir ve gerekçesini söyle)

- **profiles** — `id` (= auth.users.id), `username` (benzersiz), `display_name`, `avatar_url`, `bio`, `role` (`user` | `admin`), `created_at`
- **brands** — `id`, `name`, `slug`, `aliases text[]`, `country`, `website`, `is_specialty_roaster`
- **coffees** — `id`, `brand_id`, `name`, `slug` (marka içinde benzersiz), `form` (`whole_bean` | `ground` | `capsule`, null olabilir), `capsule_system` (`nespresso_original` | `vertuo` | `dolce_gusto` | null), `brand_intensity`, `origin_country`, `region`, `process` (washed/natural/honey…), `roast_level`, `is_blend`, `description`, `image_url`, `created_by`, `created_at`
- **brew_methods** — `id`, `name`, `slug`, `category` (espresso / filtre / immersion / kapsül / türk kahvesi). Seed: V60, Filtre Kahve Makinesi, Kapsül Makinesi, Taşınabilir Espresso, French Press, AeroPress, Moka Pot, Chemex, Türk Kahvesi, Espresso Makinesi
- **tastings** — `id`, `user_id`, `coffee_id`, `brew_method_id`, `device` (serbest metin: "Nespresso C30", "Wacaco NS2"), `score` (1–10 tam sayı, null olabilir), `tasted_at`, `notes`, `status` (`logged` | `wishlist`), `visibility` (`public` | `followers` | `private`), tat profili alanları `body`, `acidity`, `bitterness`, `sweetness`, `aftertaste` (her biri 1–5, opsiyonel), `would_buy_again`, `price_paid`, `source` (`web` | `notion_import`), `source_ref`, `created_at`, `updated_at`
- **flavor_tags** (`name`, `slug`, `group`: meyvemsi / çiçeksi / çikolata-kakao / kuruyemiş / baharat / karamel-tatlı / diğer) + **tasting_flavor_tags** (ara tablo)
- **comments** — `id`, `tasting_id`, `user_id`, `parent_id` (tek seviye yanıt), `body`, `created_at`, `edited_at`, `deleted_at` (soft delete)
- **likes** — (`user_id`, `tasting_id`) birleşik PK
- **follows** — (`follower_id`, `following_id`)
- **reports** — moderasyon için şikâyetler (hedef türü, hedef id, sebep, durum)
- **coffee_stats** (view veya materialized view) — tadım sayısı, ortalama puan, puan dağılımı

**RLS:** Her tabloda açık. Herkes `public` içeriği okur; kullanıcı yalnız kendi kayıtlarını yazar/düzenler/siler; `followers` görünürlüğü takipçilere açılır; `admin` moderasyon yapabilir. Her policy için test yaz.

---

## 5. Fazlar

### Faz 0 — Kurulum
- Next.js + TS + Tailwind + shadcn/ui iskeleti, klasör yapısı, ESLint/Prettier
- Supabase `dev` projesine bağlantı + migration altyapısı, tip üretimi (bulut projelerini ben açarım; adımları ve hangi anahtarların `.env.local`'e gireceğini bana listele)
- `siteConfig`, Türkçe sözlük dosyası, temel layout, açık/koyu tema
- GitHub Actions CI, `.env.example`, `README.md`, `CLAUDE.md`
- Boş iskeletin Vercel'e ilk yayını (adımları bana listele, hesap işlemlerini ben yaparım)

### Faz 1 — Arşiv (MVP)
- Şema + RLS + seed (brew methods, flavor tags)
- Notion import script'i ve raporu
- Yalnızca benim için admin girişi ve tadım ekle/düzenle formu (kayıt herkese kapalı)
- Sayfalar:
  - `/` — son tadımlar, en yüksek puanlılar, kısa istatistik özeti
  - `/kahveler` — kart/tablo görünümü; filtre (marka, form, demleme yöntemi, puan aralığı, tarih), sıralama, arama; filtre durumu URL'de tutulsun (paylaşılabilir link)
  - `/kahve/[marka]/[kahve]` — kahve detay: tadımlar, puan, yöntem, notlar, benzer kahveler
  - `/marka/[slug]` — markanın tüm kahveleri ve ortalaması
  - `/istatistik` — puan dağılımı, marka ortalamaları, form ve yöntem bazında ortalama, yoğunluk–puan saçılım grafiği, zaman içinde tadım sayısı. Örneklem küçük olduğu için her ortalamanın yanında **n**'yi göster, n < 3 olan grupları soluk/işaretli göster.
  - `/hakkinda`
- SEO: sayfa bazlı metadata, `sitemap.xml`, `robots.txt`, kahve başına dinamik OG görseli (WhatsApp/Instagram/X paylaşımında güzel görünsün), JSON-LD (Product + Review)
- Mobil öncelikli, Lighthouse ≥ 90

### Faz 2 — Topluluk
- Kayıt/giriş: e-posta magic link + Google ile giriş; kullanıcı adı seçimi; profil sayfası `/u/[username]` (tadımları, istatistikleri, takipçi/takip)
- Kullanıcı tadım ekler: önce var olan kahveyi arar (`pg_trgm` ile benzerlik); yoksa yeni kahve önerir (kopya uyarısı göster)
- Tadım altında yorumlar (tek seviye yanıt), beğeni, takip
- Akış `/akis`: "Takip ettiklerim" ve "Herkes" sekmeleri, sayfalama
- Kahve sayfasında topluluk ortalaması + puan dağılımı + tüm herkese açık tadımlar
- Moderasyon: şikâyet butonu, admin paneli (gizle/sil/kullanıcı kısıtla), yorum ve tadım için rate limit, kayıt/yorumda Turnstile
- KVKK: aydınlatma metni, gizlilik politikası, kullanım koşulları sayfaları (**taslak olarak işaretle, ben hukuken gözden geçireceğim**), hesabı silme ve verimi indirme (JSON), gerekiyorsa çerez bildirimi

### Faz 3 — Sosyal derinlik
- Tat etiketleri ve tat profili radar grafiği; kahve sayfasında topluluğun en çok kullandığı etiketler
- Fotoğraf yükleme (Supabase Storage; boyut sınırı, EXIF konum verisini sil). Supabase Free'de görsel dönüştürme olmadığı için fotoğrafları **yüklemeden önce tarayıcıda** küçült ve sıkıştır (ör. en uzun kenar 1600 px, WebP).
- Uygulama içi bildirimler (yorum, beğeni, yeni takipçi)
- Listeler ("En sevdiğim espressolar" gibi) ve "denemek istiyorum" listesi
- PWA: iPhone'da ana ekrana eklenebilir; tadım ekleme formu tek elle ~30 saniyede doldurulabilir
- Opsiyonel: Notion API ile benim veritabanımdan tek yönlü senkronizasyon (yalnız admin)

### Faz 4 — Sonra (şimdilik yapma, ama mimari engel olmasın)
- Zevk benzerliğine dayalı kahve önerisi (bunu Python'la kendim modellemek isteyebilirim — analitik veriyi dışa aktarılabilir tut)
- İngilizce arayüz
- Kavurucu/kafe doğrulanmış hesapları

---

## 6. Tasarım yönü

- Özgün ve "hazır şablon / yapay zekâ yapımı" gibi durmayan bir görünüm. Bir **tadım defteri** hissi: editoryal tipografi (başlıklarda karakterli bir serif, gövdede okunaklı bir sans), bol boşluk, sıcak kahve paleti (krema, karamel, kavrulmuş kahverengi, espresso siyahı) ve tek bir vurgu rengi.
- Puan rozetleri Notion'daki gibi renk kodlu (düşük → yüksek) ama paletle uyumlu tonlarda; renk tek bilgi taşıyıcısı olmasın (sayı her zaman görünsün).
- Koyu mod birinci sınıf vatandaş.
- Mobil öncelikli; kullanıcılar çoğunlukla kahvesini içerken telefondan girecek.
- Erişilebilirlik: yeterli kontrast, klavyeyle gezinme, görsellerde alt metin.
- Boş durumlar, yükleniyor durumları ve hata sayfaları da tasarlansın.

---

## 7. Kalite ve güvenlik

- Tüm girdiler sunucuda Zod ile doğrulanır; notlar ve yorumlar düz metin olarak saklanır ve kaçışlanarak gösterilir (HTML/markdown render yok).
- Her tabloda RLS; servis rolü anahtarı yalnız sunucuda ve import script'inde.
- Yorum/tadım/şikâyet uç noktalarında rate limit.
- Geri alınabilir migration'lar; `dev` projesi için seed verisi (seed asla `prod`'a çalıştırılmasın, script bunu kontrol etsin).
- Kritik akışlar için Playwright testleri: kahve listeleme/filtreleme, giriş, tadım ekleme, yorum yazma, başkasının kaydını düzenleyememe.

**Her fazın "bitti" tanımı:** lint + typecheck + testler geçiyor · migration'lar temiz çalışıyor · `README.md` ve `CLAUDE.md` güncel · bana neyin yapıldığını, nasıl deneyeceğimi ve bilinen eksikleri anlatan kısa özet.

---

## 8. Kapsam dışı (şimdilik)

Native mobil uygulama, e-ticaret/ödeme, özel mesajlaşma (DM), gerçek zamanlı sohbet, yapay zekâ ile otomatik not üretimi.

---

## Claude Code'a ilk mesaj

> `PROJECT_BRIEF.md` dosyasını baştan sona oku. Plan modunda kal: Faz 0 ve Faz 1 için ayrıntılı bir uygulama planı, klasör yapısı ve veritabanı şemasını çıkar. Belirsiz gördüğün noktaları en fazla 5 soruda topla. Onayımdan sonra Faz 0'a başla.
