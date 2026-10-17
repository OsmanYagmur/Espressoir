# Mobil uygulama

Uygulama `apps/mobile` klasöründe: düz React Native 0.86 (Expo yok), gezinme için React
Navigation, iOS projesi `apps/mobile/ios` (git'te). Sitedeki veritabanı kurallarını, okuma
modellerini (`@espressoir/db`), öneri modelini (`@espressoir/core`) ve Türkçe metinleri
(`@espressoir/i18n`) aynen kullanır. Mağazada yok: Mac'te Xcode ile derlenip kabloyla kendi
iPhone'una kurulur, ücretsiz.

## Ayarlar (`.env`)

`apps/mobile/.env.example` dosyasını `apps/mobile/.env` olarak kopyala ve doldur. Hepsi
herkese açık değerler (sitenin tarayıcıya verdikleri); dosya git'e girmez.

- `APP_SUPABASE_URL`, `APP_SUPABASE_PUBLISHABLE_KEY`: sitedeki `NEXT_PUBLIC_SUPABASE_URL` ve
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ile aynı. Gerçek kullanım için prod, denemek için dev.
- `APP_SITE_URL`: `https://espressoir.com`. Girişteki güvenlik doğrulaması (Supabase'te
  açıksa) bu sitenin `/uygulama/dogrulama` sayfasından gelir ve kayıttan sonra site buradan
  tazelenir.
  **Asla `localhost` yazma:** telefonda localhost telefonun kendisidir.

Değerler derlemenin içine yazılır (`scripts/write-env.mjs` → `src/lib/env.generated.ts`):
değiştirince yeniden kur.

## Kendi iPhone'una kurmak

Bir kez:

1. **Xcode** kurulu olsun; Xcode → Settings → Accounts'ta Apple hesabın ekli olsun (ücretsiz
   hesap yeter; bu Mac'te ekli, imza ekibi projede: `X7AATGWM6G`).
2. **CocoaPods** kurulu olsun (`pod --version`). Bu Mac'te Homebrew çalışmadığı için ayrı bir
   conda ortamında (`cocoapods`) kurulu; `pod` komutu `/opt/anaconda3/bin/pod` üzerinden onu
   çalıştırır.
3. iPhone'u kabloyla Mac'e bağla, telefonda "Bu bilgisayara güven"i onayla.
4. iPhone'da **Ayarlar → Gizlilik ve Güvenlik → Geliştirici Modu**'nu aç (telefon yeniden
   başlar). Bu seçenek telefon Mac'e bir kez bağlandıktan sonra görünür.

Her kurulumda (yeni kod çektikten sonra da):

```bash
pnpm --filter @espressoir/mobile ios:device
```

Komut bağlı iPhone'u bulur, gerekiyorsa `pod install` çalıştırır, uygulamayı yayın modunda
derler (ilk sefer 10–20 dakika), JavaScript'i içine gömer, telefona kurar ve açar. Birden çok
telefon bağlıysa adını ver: `pnpm --filter @espressoir/mobile ios:device "Osman"`.

**Xcode'dan da olur:** `apps/mobile/ios/Espressoir.xcworkspace`'i aç (`.xcodeproj`'u değil),
üstten iPhone'unu seç, ▶'ye bas. Çalıştırma yayın modunda ayarlı; uygulama bilgisayarsız
çalışır. Xcode'un "önerilen ayarlar" tekliflerini kabul etme.

İlk açılışta "Güvenilmeyen Geliştirici" derse: **Ayarlar → Genel → VPN ve Aygıt Yönetimi**
→ geliştirici uygulaması → **Güven**.

Bilmen gerekenler:

- **7 gün:** ücretsiz Apple hesabıyla kurulan uygulama 7 gün sonra açılmaz; telefonu bağlayıp
  aynı komutu çalıştır (verilerin Supabase'de, hiçbir şey kaybolmaz). Bunu kaldırmanın tek
  yolu Apple Developer Program (yılda 99 USD; bütçe dışı).
- **Telefondaki uygulama kendini güncellemez:** yeni kod ya da `.env` değişikliğinden sonra
  yeniden kur.
- **iOS 27:** uygulama iOS'un yeni "sahne" açılışını kullanıyor (`AppDelegate.swift`'teki
  `SceneDelegate`); kullanmayan bir uygulamayı iOS 27 açar açmaz kapatır.

## Geliştirirken (simülatör)

```bash
pnpm --filter @espressoir/mobile start
```

```bash
pnpm --filter @espressoir/mobile ios
```

İlki Metro'yu (JavaScript sunucusu) açar, ikincisi geliştirme sürümünü simülatörde başlatır;
kod kaydedildikçe uygulama yenilenir.

## Neler var (4C)

- **Sekmeler:** Akış, Kahveler (arama), Kafeler (arama), Ekle, Hesap. Öneriler Hesap'tan
  açılır. Alttaki çubuk iOS'un kendisi: iOS 26 ve sonrasında yuvarlak, şeffaf "cam" çubuk;
  liste aşağı kaydırılınca küçülür.
- **Sayfalar:** kahve, kafe, üye profili; aşağı çekince arşiv yenilenir.
- **Giriş:** e-posta kodu ya da parola. Kayıt kapalı; davet sitede. Güvenlik doğrulaması
  (Turnstile) yalnızca Supabase'te açıksa ve Supabase isterse açılır; kapalıysa hiç
  görünmez. Kapatmak: `docs/setup-auth.md` §5.
- Hesap ayarları (kullanıcı adı, profil resmi, veri indirme, silme) sitede kalır.

## Ekleme (4D)

- **Ekle sekmesi:** "Tadım ekle" ya da "Kafe ziyareti ekle". Kahve sayfasındaki "Bu kahveyi
  tattım" ve kafe sayfasındaki "Burada ne içtin?" aynı formu o kahve ya da kafe seçili açar.
- **Tadım:** son içtiğin kahveler tek dokunuşta; ya ara ya da yeni marka + kahve yaz (benzer
  bir kahve kayıtlıysa önce o önerilir). Puan, tarih (Bugün / Dün / Başka gün), demleme
  yöntemi ve cihaz son tadımından dolu gelir. "Ayrıntılar"da tat profili, tat etiketleri,
  fotoğraf, görünürlük, tekrar alır mıyım, fiyat.
- **Kafe ziyareti:** kafeyi ara ya da yeni kafe ekle (şehir listeden, semt isteğe bağlı; aynı
  şehirde benzer bir kafe varsa önce o önerilir), içecek türü, puan, tarih, not.
- **Fotoğraf:** kameradan ya da galeriden. Gönderilmeden önce telefonda 1600 px'e küçültülür
  ve JPEG olarak yeniden kodlanır (uygulamanın kendi küçük iOS modülü,
  `ios/EspressoirNative`); bu konum, cihaz ve saat bilgisini siler. Yine de bilgi kalmışsa
  fotoğraf yüklenmez, tadım fotoğrafsız kaydedilir ve uygulama bunu söyler.
- **Sitede hemen görünür:** kaydedince uygulama siteye "arşivi tazele" der
  (`/api/arsiv-tazele`, oturum jetonuyla). Bu yüzden `APP_SITE_URL`, uygulamanın
  bağlandığı Supabase projesinin sitesi olmalı (prod için `https://espressoir.com`); öyle
  değilse kayıt yine yapılır, site en geç bir saat içinde gösterir.
- Kullanıcı adını seçmemiş bir hesap ekleme yapamaz; uygulama sitedeki kurulum sayfasını açar.

## Sosyal (4E)

- **Akış:** "Herkes" (son herkese açık tadımlar), "Takip ettiklerim" (takip ettiklerinin,
  yalnızca takipçilere açık olanlar dahil) ve "Kafeler" (son kafe ziyaretleri). Aşağı
  kaydırdıkça eski sayfalar yüklenir, aşağı çekince yenilenir.
- **Tadım sayfası:** bir tadıma dokununca açılır: not, tat profili, etiketler, fotoğraf;
  beğeni (kendi tadımında yalnızca sayı), yorumlar ve tek seviye yanıt, kendi yorumunu
  düzenleme ve silme, başkasınınkini şikâyet etme. Kendi tadımında "Sitede düzenle" ve
  "Tadımı sil".
- **Bildirimler:** Hesap sekmesinin üstündeki kırmızı sayı okunmamışları gösterir; bir sekme
  açıldığında ve uygulama öne geldiğinde yeniden sayılır. Bildirimler ekranı açılınca
  gösterilenler okundu sayılır (açıkken gelen yeni kalır). Anlık bildirim (push) yok.
- **Profil:** başkasının profilinde "Takip et" ve şikâyet; kendi profilinde gizli ve yalnızca
  takipçilere açık tadımların da görünürlükleriyle, denenecekler ve gizli listelerin.
- **Listeler:** kahve sayfasında "Denemek istiyorum" ve "Listeye ekle" (var olan listeye
  ekle/çıkar ya da yeni liste aç). Liste sayfasında sahibi bir kahveyi çıkarabilir ya da
  listeyi silebilir; başlık, not ve sıra sitede düzenlenir.

## Bilinen sınırlar

- Google ile giriş ve anlık (push) bildirim yok; Android sürümü yok (yalnızca iOS projesi var).
- Başlıklar sitedeki geniş Archivo yerine normal genişlikte (telefon yazı tipleri genişlik
  eksenini desteklemiyor).
