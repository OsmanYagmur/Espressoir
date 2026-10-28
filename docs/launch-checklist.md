# Yayın öncesi kontrol listesi

Kod bu maddeleri tamamlayamaz: her biri site sahibinin bilgisini, kararını ya da bir uzmanın
onayını ister. Sitede hiçbirinin yerine uydurma bilgi yazılmadı; eksik olan yer ya taslak
olarak işaretli ya da arayüzden çıkarıldı. Bir madde bitince işaretle ve tarihini yaz.

Son gözden geçirme: 2026-10-28 (tasarım yenilemesiyle, `defter-tasarimi` dalı).

## İletişim ve işletme bilgisi

- [ ] **İletişim adresi.** `packages/i18n/src/legal-tr.ts` içindeki `CONTACT` hâlâ
      "[iletişim e-postası eklenecek]"; KVKK, Gizlilik ve Koşullar sayfalarında bu yer
      tutucu görünüyor. Gerçek adres yazılınca `TERMS_VERSION` (`packages/core/src/account.ts`)
      bir artırılmalı.
- [ ] **Geri bildirim yolu.** Alt bilgide ve Hakkında sayfasında "Geri bildirim gönder" /
      "İletişim" bölümü, gerçek bir adres olmadığı için eklenmedi. Adres gelince alt bilginin
      "Espressoir" grubuna ve Hakkında'nın sonuna bir satır eklenecek.
- [ ] **İşletme bilgisi.** Metinler Espressoir'ı "kişisel ve ticari olmayan bir proje" diye
      tanımlıyor; atölye ise ücretli. Atölyeyi kimin (kişi mi, işletme mi) düzenlediği, fatura
      ya da makbuz verilip verilmediği hukuki metinlerde ve atölye sayfasında netleşmeli.

## Hukuki metinler (uzman incelemesi)

- [ ] KVKK aydınlatma metni, gizlilik politikası ve kullanım koşulları bir hukukçuya
      okutulmalı. Şu an her sayfanın başında "Taslak" notu var; onaylanınca
      `legal-tr.ts` → `draftBanner` kaldırılmalı ve `TERMS_VERSION` artırılmalı.
- [ ] Sitenin işlediği ama "İşlenen veriler" listesinde adı geçmeyen veriler incelemede
      sorulmalı: yorumlar, beğeniler, listeler (başlık, açıklama, kahvelerin yanındaki
      notlar), "denemek istiyorum" listesi, tat notaları ve tat profili, bildirimler,
      şikâyetler (bildirimler ve moderasyon kaydı), doğrulanmış işletme başvuruları.
- [ ] Çerez bölümü: Google Analytics yalnızca onayla açılıyor; oturum çerezi ve tema tercihi
      (yerel depolama) zorunlu. Ayrı bir çerez politikası sayfası gerekip gerekmediği.
- [ ] Yurt dışına aktarım: Supabase, Vercel, Resend, Cloudflare Turnstile ve Google
      Analytics'in sunucu bölgeleri ve aktarım dayanağı.

## Atölye

- [ ] **Tarih, saat, yer ve ücret.** Yayındaki ilk atölye satırı, kurulumda eklenen yer
      tutucu değerleri taşıyor olabilir (22 Kasım 2026, 14:00–16:30, "Ücretli. Tutar
      kesinleşince burada yazacak."). `/osman` → Atölyeler'den gerçek değerleri yaz; bilgiler
      kesinleşene kadar atölyeyi kapalı (`is_open` kapalı) tutmak da bir seçenek.
- [ ] **Süre.** Programın adımları toplam 2 saat (20 + 15 + 60 + 25 dk), takvimdeki aralık
      2,5 saat. Sayfa artık süreyi başlangıç ve bitişten hesaplayıp yazıyor ("2,5 saat");
      aradaki yarım saat mola mı, yoksa saat aralığı mı yanlış, karar senin. Alt cümleden
      "iki saatte üç demleme yöntemi" çıkarıldı: program iki yöntem (V60, French press)
      anlatıyor.
- [ ] İptal ve katılım koşulları yazılmadı (onaylı bilgi yok). İstersen atölye programına
      (`apps/web/src/content/atolye/kahveye-giris.ts`) bir soru-cevap olarak eklenir.

## Altyapı (CLAUDE.md → "Still open")

- [ ] Prod veritabanının yedeği yok: depo gizli yapılmalı, `PROD_DB_URL` ve
      `BACKUP_PASSPHRASE` eklenmeli (`docs/backup.md`).
- [ ] Kayıt herkese açılmadan önce: CAPTCHA korumasını yeniden aç (`docs/setup-auth.md` §5),
      hukuki inceleme ve yedek tamam olmalı.
- [ ] `www.espressoir.com` alan adını Vercel → Domains'te ana alan adına yönlendir.
- [ ] Google Analytics ve atölye e-postası için Vercel değişkenleri
      (`docs/setup-analytics.md`, `docs/deploy-vercel.md`).

## Tasarım yenilemesinin kalanları

- [ ] Mobil uygulama (`apps/mobile`) hâlâ eski paletle ve Archivo ile çalışıyor; yeni
      token'lar (`design/tokens.css`) `src/lib/theme.ts`'e ve Manrope dosyaları
      `assets/fonts`'a taşınmalı (ayrı bir iş).
- [ ] Yönetim panelinin PDF çıktısı Archivo ile kalıyor (yalnızca yöneticinin gördüğü bir
      dosya); istenirse Manrope'un tam (alt kümesiz) dosyasıyla değiştirilebilir.
- [ ] Yayından sonra gerçek bir telefonda: üye sekme çubuğu, Keşfet menüsü, kahve
      sayfasındaki "Tadım ekle" (form o kahveyle açılmalı) ve koyu tema.
