# Ziyaret istatistikleri: Google Analytics

Site, ziyaretleri Google Analytics 4 ile sayar ve `/osman` → **Özet**'te son 28 günü gösterir. İkisi ayrı parçadır:

- **Ölçüm (sitede):** ziyaretçi sayfanın altındaki soruya "Kabul et" derse Google'ın etiketi yüklenir. Demezse hiçbir şey yüklenmez, çerez yazılmaz. Bunun için tek değişken yeter: `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
- **Okuma (/osman'da):** panel sayıları Google Analytics Data API'den, bir hizmet hesabıyla okur. Bunun için üç değişken gerekir: `GA_PROPERTY_ID`, `GA_SERVICE_ACCOUNT_EMAIL`, `GA_SERVICE_ACCOUNT_KEY`. Anahtar yalnızca `apps/web/src/lib/analytics/ga-report.ts` içinde, yalnızca yönetici `/osman`'ı açtığında okunur.

İkisi de ücretsizdir; faturalandırma hesabı gerekmez. Değişkenler yokken site eskisi gibi çalışır: soru çıkmaz, Özet sekmesi neyin eksik olduğunu söyler.

> Yalnızca çerezlere izin verenler sayılır. KVKK izin istemeyi şart koştuğu için sayılar gerçek ziyaretten düşük çıkar; eğilimleri (artış, düşüş, hangi sayfa) okumak için yeterlidir.

## 1. Mülk ve veri akışı

1. [analytics.google.com](https://analytics.google.com) → **Ölçümü başlat** (ya da Yönetici → **Oluştur → Mülk**).
2. Mülk adı `Espressoir`, saat dilimi **Türkiye**, para birimi **Türk lirası**.
3. Platform: **Web**. Web sitesi URL'si `https://espressoir.com`, akış adı `espressoir.com`.
4. **Geliştirilmiş ölçüm** açık kalsın ve ayarlarında **"Tarayıcı geçmişi olaylarına göre sayfa değişiklikleri"** işaretli olsun: site sayfa geçişlerinde yeniden yüklenmez, sayfa görüntülemeleri bu ayarla sayılır.
5. Akışın sayfasındaki **Ölçüm kimliği** (`G-XXXXXXXXXX`) ilk değişkendir.

## 2. Gizlilik ayarları (bir kez)

Yönetici → **Veri toplama ve değiştirme**:

- **Veri saklama** → Etkinlik verisi saklama: **14 ay**. Gizlilik metni bu süreyi yazıyor.
- **Veri toplama** → **Google sinyalleri**: kapalı kalsın. Reklam kişiselleştirmesi gerekmiyor.

## 3. Hizmet hesabı (panelin okuması için)

1. [console.cloud.google.com](https://console.cloud.google.com) → üstteki proje seçici → **Yeni proje**, adı `espressoir-analytics`.
2. **API'ler ve Hizmetler → Kitaplık** → "Google Analytics Data API" → **Etkinleştir**.
3. **IAM ve Yönetici → Hizmet hesapları → Hizmet hesabı oluştur**: adı `espressoir-panel`. Rol verme adımını boş geç.
4. Hesabı aç → **Anahtarlar → Anahtar ekle → Yeni anahtar oluştur → JSON**. İnen dosyayı kimseyle paylaşma ve repoya koyma.
5. Google Analytics'e dön: Yönetici → **Mülk erişim yönetimi** → **+** → **Kullanıcı ekle**. Hizmet hesabının e-postasını (`espressoir-panel@….iam.gserviceaccount.com`) yaz, rol **Görüntüleyici**, bildirim e-postası gönderme.
6. Yönetici → **Mülk ayrıntıları** → sağ üstteki **Mülk kimliği** (yalnızca rakam).

## 4. Vercel

Settings → Environment Variables. Yalnızca **Production** işaretli olsun, önizlemeler sayılmasın:

| Değişken                        | Tür    | Değer                                                          |
| ------------------------------- | ------ | -------------------------------------------------------------- |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Config | 1. adımdaki ölçüm kimliği                                      |
| `GA_PROPERTY_ID`                | Config | 3. adımın sonundaki mülk kimliği                               |
| `GA_SERVICE_ACCOUNT_EMAIL`      | Config | JSON dosyasındaki `client_email`                               |
| `GA_SERVICE_ACCOUNT_KEY`        | Secret | JSON dosyasındaki `private_key`, `-----BEGIN` … `END …-----\n` |

`private_key`'i tırnaklar olmadan, olduğu gibi yapıştır. Değerin içindeki `\n` dizileri sorun değil, kod onları satır sonuna çevirir. Sonra **Deployments → Redeploy**. `NEXT_PUBLIC_` değeri derlemeye gömülür; yeniden derlenmeden görünmez.

Yerelde denemek için aynı dört satırı `.env.local`'a ekleyebilirsin. Bu dosya git'e girmez.

## 5. Kontrol

1. Canlı sitede altta çerez sorusu çıkmalı. **Kabul et**'ten sonra Google Analytics → **Raporlar → Gerçek zamanlı** ekranında kendini görmelisin.
2. Kendi ziyaretlerin sayılmasın istiyorsan, sonra sayfanın altındaki **Çerez tercihleri**'nden **Reddet**'i seç. Bu tercih o tarayıcıda kalır.
3. `/osman` → Özet. Veri bir iki saat içinde gelir. "Veri alınamadı" yazıyorsa bakılacak yerler:
   - Hizmet hesabı mülke Görüntüleyici olarak eklenmemiş.
   - Data API etkinleştirilmemiş.
   - `GA_PROPERTY_ID` ölçüm kimliğiyle (`G-…`) karıştırılmış.
   - Anahtar eksik kopyalanmış.

   Vercel'in fonksiyon günlüğünde `[analytics] report failed:` satırı Google'ın cevabının kodunu verir.

## Anahtarı yenilemek

Cloud Console → hizmet hesabı → Anahtarlar → yeni JSON anahtarı oluştur. Vercel'de `GA_SERVICE_ACCOUNT_KEY`'i güncelle, Redeploy et, sonra eski anahtarı Cloud Console'dan sil.
