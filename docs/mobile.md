# Mobil uygulama (Expo Go)

Uygulama `apps/mobile` klasöründe: Expo SDK 57, Expo Router, React Native. Sitedeki veritabanı
kurallarını, okuma modellerini (`@espressoir/db`), öneri modelini (`@espressoir/core`) ve Türkçe
metinleri (`@espressoir/i18n`) aynen kullanır. Mağazada yok: telefonunda **Expo Go** ile açılır
(ücretsiz).

## Telefonunda açmak

1. iPhone'una App Store'dan **Expo Go**'yu kur (Android'de Play Store'dan).
2. `apps/mobile/.env.example` dosyasını `apps/mobile/.env` olarak kopyala ve doldur:
   - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: sitedeki
     `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ile aynı (gizli değil).
     Denemek için dev projesi, gerçek kullanım için prod.
   - `EXPO_PUBLIC_SITE_URL`: girişteki güvenlik doğrulaması bu sitenin
     `/uygulama/dogrulama` sayfasından gelir. Prod için `https://espressoir.com`.
3. **Bir kez: Expo hesabıyla iki yerde de oturum aç.** Expo Go 57'den beri gerçek bir
   iPhone, geliştirme sunucusundaki projeyi ancak bilgisayardaki Expo CLI ile telefondaki
   Expo Go **aynı** Expo hesabında oturum açmışken açar; yoksa "You need to be signed in to
   Expo Go and Expo CLI" hatası çıkar (Simülatör ve Android etkilenmez). Hesap ücretsizdir
   (expo.dev/signup). Bilgisayarda, `apps/mobile` klasöründe:

   ```bash
   pnpm exec expo login
   ```

   Sonra telefonda Expo Go → sağ üstteki hesap simgesi → aynı hesapla giriş. Hangi hesapta
   olduğunu `pnpm exec expo whoami` gösterir. Sunucu açıkken giriş yaptıysan onu kapatıp
   yeniden başlat (Expo CLI hesabı açılışta okur).
4. Bilgisayarında:

   ```bash
   pnpm --filter @espressoir/mobile start
   ```

5. Ekranda çıkan QR kodunu iPhone'un kamerasıyla okut; Expo Go uygulamayı açar. Telefon ve
   bilgisayar aynı Wi-Fi'da olmalı.

`.env` git'e girmez. Değiştirdikten sonra `start` komutunu `--clear` ile yeniden başlat.

## Neler var (4C)

- **Sekmeler (4E'den beri):** Akış, Kahveler (arama), Kafeler (arama), Ekle, Hesap. Öneriler
  Hesap'tan açılır.
- **Sayfalar:** kahve, kafe, üye profili; aşağı çekince arşiv yenilenir.
- **Giriş:** e-posta kodu ya da parola. Kayıt kapalı; davet sitede. Her istekten önce bir
  sayfa açılır ve güvenlik doğrulamasını (Turnstile) yapar.
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
  ve yeniden kodlanır; bu konum, cihaz ve saat bilgisini siler. Yine de bilgi kalmışsa
  fotoğraf yüklenmez, tadım fotoğrafsız kaydedilir ve uygulama bunu söyler.
- **Sitede hemen görünür:** kaydedince uygulama siteye "arşivi tazele" der
  (`/api/arsiv-tazele`, oturum jetonuyla). Bu yüzden `EXPO_PUBLIC_SITE_URL`, uygulamanın
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

- Expo Go'da Google ile giriş ve anlık (push) bildirim yok.
- Başlıklar sitedeki geniş Archivo yerine normal genişlikte (telefon yazı tipleri genişlik
  eksenini desteklemiyor).
