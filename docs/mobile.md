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
3. Bilgisayarında:

   ```bash
   pnpm --filter @espressoir/mobile start
   ```

4. Ekranda çıkan QR kodunu iPhone'un kamerasıyla okut; Expo Go uygulamayı açar. Telefon ve
   bilgisayar aynı Wi-Fi'da olmalı.

`.env` git'e girmez. Değiştirdikten sonra `start` komutunu `--clear` ile yeniden başlat.

## Neler var (4C)

- **Sekmeler:** Kahveler (arama), Kafeler (arama), Öneriler, Hesap.
- **Sayfalar:** kahve, kafe, üye profili; aşağı çekince arşiv yenilenir.
- **Giriş:** e-posta kodu ya da parola. Kayıt kapalı; davet sitede. Her istekten önce bir
  sayfa açılır ve güvenlik doğrulamasını (Turnstile) yapar.
- Tadım ekleme 4D'de, akış ve yorumlar 4E'de gelecek; hesap ayarları sitede kalır.

## Bilinen sınırlar

- Expo Go'da Google ile giriş ve anlık (push) bildirim yok.
- Başlıklar sitedeki geniş Archivo yerine normal genişlikte (telefon yazı tipleri genişlik
  eksenini desteklemiyor).
