/**
 * Yasal metinler (KVKK aydınlatma metni, gizlilik politikası, kullanım koşulları).
 *
 * TASLAK: bu metinler hukuki incelemeden geçmedi. Site sahibi gözden geçirip onaylayana
 * kadar sayfalarda "taslak" bandıyla gösterilir. Metin değiştiğinde @espressoir/core
 * içindeki TERMS_VERSION da değişmeli ki kimin hangi sürümü kabul ettiği bilinsin.
 *
 * Her bölüm aynı şekle sahiptir: başlık, paragraflar ve (boş olabilen) bir madde listesi.
 */
const CONTACT = "[iletişim e-postası eklenecek]";

export const legalTr = {
  draftBanner:
    "Taslak: bu metin henüz hukuki incelemeden geçmedi ve yürürlüğe girmeden önce değişebilir.",
  updated: "Son güncelleme: 23 Ekim 2026",
  related: "İlgili metinler",
  kvkk: {
    title: "KVKK aydınlatma metni",
    short: "KVKK",
    description:
      "Espressoir'da hangi kişisel verilerin, hangi amaçla ve hangi hukuki sebeple işlendiği; haklarını nasıl kullanabileceğin.",
    sections: [
      {
        title: "Veri sorumlusu",
        paragraphs: [
          "Espressoir, Osman Yağmur tarafından işletilen kişisel ve ticari olmayan bir projedir. 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) bakımından veri sorumlusu Osman Yağmur'dur.",
          `İletişim: ${CONTACT}`,
        ],
        items: [],
      },
      {
        title: "İşlenen veriler",
        paragraphs: ["Hesap açtığında ve siteyi kullandığında şu veriler işlenir:"],
        items: [
          "Hesap: e-posta adresin. Google ile giriş yaparsan Google'ın ilettiği ad, e-posta ve profil fotoğrafı adresi kimlik doğrulama kaydında saklanır; sitede gösterilmez.",
          "Profil: kullanıcı adın, görünen adın ve hakkında yazdığın metin. Bunlar herkese açıktır.",
          "İçerik: tadımların (puan, not, tarih, demleme yöntemi, cihaz, görünürlük ayarı), takip ettiklerin ve seni takip edenler, kataloğa eklediğin kahve ve markalar.",
          "Kafe ziyaretleri: eklediğin kafeler (ad, şehir, semt, harita bağlantısı) ve oradaki ziyaretlerin (içecek, puan, not, tarih, ödediğin fiyat, görünürlük ayarı).",
          "Fotoğraflar: tadımlarına ve profiline eklediğin fotoğraflar. Gönderilmeden önce cihazında küçültülür ve yeniden kaydedilir; bu sırada konum, cihaz ve çekim zamanı gibi bilgiler silinir, bize yalnızca görüntü ulaşır.",
          "Kayıtlar: kabul ettiğin koşulların sürümü ve tarihi, kullanıcı adı değişikliğinin tarihi, varsa hesabına uygulanan kısıtlama.",
          "İşlem güvenliği: oturum çerezi, giriş zamanları ve altyapı sağlayıcılarının günlüklerinde yer alan IP adresi ile tarayıcı bilgisi.",
        ],
      },
      {
        title: "İşleme amaçları ve hukuki sebepler",
        paragraphs: [
          "Verilerin; hesabını oluşturmak ve giriş yapmanı sağlamak, tadımlarını seçtiğin görünürlükle yayınlamak, topluluk özelliklerini (takip, profil) çalıştırmak, sana kahve önerisi hazırlamak, kötüye kullanımı ve spam'i önlemek ve yasal yükümlülükleri yerine getirmek için işlenir.",
          "Öneriler: sana gösterilen öneriler kendi tadımlarından (gizli olanlar dahil) ve diğer üyelerin herkese açık tadımlarından hesaplanır; öneri sayfanı yalnızca sen görürsün. Öneri modelini geliştirmek için herkese açık tadımlar, yazanın kimliği yerine bir takma adla (kullanıcı adı, not, tam tarih ve fiyat olmadan) site sahibinin bilgisayarına aktarılabilir; bu veri başkasıyla paylaşılmaz.",
          "Hukuki sebepler: seninle kurulan kullanım sözleşmesinin ifası (KVKK md. 5/2-c), hukuki yükümlülüklerin yerine getirilmesi (md. 5/2-ç) ve temel hak ve özgürlüklerine zarar vermemek kaydıyla sitenin güvenliğine ilişkin meşru menfaat (md. 5/2-f).",
        ],
        items: [],
      },
      {
        title: "Atölye başvuruları",
        paragraphs: [
          "Atölye başvuru formunu doldurduğunda, hesabın olsun ya da olmasın, şu veriler işlenir: adın, sana ulaşabilmem için yazdığın telefon numarası ya da Instagram kullanıcı adın, kahveyle aranı anlatan seçimin ve varsa sorun.",
          "Bu veriler yalnızca başvurunu değerlendirmek, yerini onaylamak ya da seni yedek listeye almak ve atölyeyle ilgili sana yazmak için kullanılır. Hukuki sebep, formdaki onay kutusuyla verdiğin açık rızadır (KVKK md. 5/1); rızanı istediğin zaman geri alabilirsin.",
          "Başvuruları yalnızca site sahibi görür; sitede herkes yalnızca atölyede kaç yer kaldığını görür. Yeni bir başvuru geldiğinde site sahibine Resend üzerinden, başvurudaki bilgileri içeren bir bildirim e-postası gider.",
          `Başvurunun silinmesini istersen: ${CONTACT}.`,
        ],
        items: [],
      },
      {
        title: "Verilerin aktarılması",
        paragraphs: [
          "Veriler satılmaz ve reklam amacıyla kimseyle paylaşılmaz. Sitenin çalışması için aşağıdaki hizmet sağlayıcılar kullanılır; bu sağlayıcıların sunucuları Türkiye dışında olduğundan veriler yurt dışına aktarılmış olur:",
        ],
        items: [
          "Supabase: veritabanı ve kimlik doğrulama. Veriler Frankfurt (Almanya) bölgesinde tutulur.",
          "Vercel: sitenin barındırılması ve dağıtımı.",
          "Resend: giriş kodu, davet ve atölye başvurusu bildirimi e-postalarının gönderimi.",
          "Cloudflare (Turnstile): giriş formunda bot koruması.",
          "Google: yalnızca Google ile giriş yapmayı seçersen.",
        ],
      },
      {
        title: "Saklama süresi",
        paragraphs: [
          "Verilerin hesabın açık olduğu sürece saklanır. Hesabını sildiğinde profilin, tadımların, kafe ziyaretlerin ve takip ilişkilerin veritabanından hemen silinir. Şifreli haftalık yedeklerde en fazla 90 gün daha kalabilir; bu süre sonunda yedekler de silinir.",
          "Kataloğa eklediğin kahve, marka ve kafe kayıtları, kim tarafından eklendiği bilgisi silinerek yerinde kalır.",
        ],
        items: [],
      },
      {
        title: "Hakların",
        paragraphs: ["KVKK'nın 11. maddesi uyarınca şu haklara sahipsin:"],
        items: [
          "Kişisel verilerinin işlenip işlenmediğini öğrenmek ve işlenmişse bilgi istemek.",
          "İşleme amacını ve verilerin amacına uygun kullanılıp kullanılmadığını öğrenmek.",
          "Verilerin aktarıldığı üçüncü kişileri bilmek.",
          "Eksik ya da yanlış işlenmiş verilerin düzeltilmesini istemek.",
          "Verilerinin silinmesini ya da yok edilmesini istemek.",
          "İşlemenin kanuna aykırı olması nedeniyle zarara uğrarsan zararın giderilmesini istemek.",
        ],
      },
      {
        title: "Haklarını nasıl kullanırsın",
        paragraphs: [
          'Çoğu işlemi kendin yapabilirsin: Hesap sayfasındaki "Verilerimi indir" düğmesi seninle ilgili tutulan her şeyi tek dosyada verir; "Hesabı sil" bölümü hesabını ve içeriğini kalıcı olarak siler; profil bilgilerini aynı sayfadan düzeltebilirsin.',
          `Diğer talepler için: ${CONTACT}. Başvurular en geç 30 gün içinde yanıtlanır.`,
        ],
        items: [],
      },
    ],
  },
  privacy: {
    title: "Gizlilik politikası",
    short: "Gizlilik",
    description:
      "Espressoir'da neyin herkese açık olduğu, hangi çerezlerin kullanıldığı ve verilerinin nasıl korunduğu.",
    sections: [
      {
        title: "Kısaca",
        paragraphs: [
          "Espressoir bir tadım defteri. Reklam göstermez, ziyaretçileri izlemez, verilerini satmaz. Senden yalnızca hesabın ve yazdıkların için gereken bilgiyi tutar.",
        ],
        items: [],
      },
      {
        title: "Neler herkese açık",
        paragraphs: [
          "Kullanıcı adın, görünen adın, hakkında yazdığın metin, kimi takip ettiğin ve seni kimin takip ettiği herkese açıktır. Tadımlarının kime görüneceğini her tadım için sen seçersin:",
        ],
        items: [
          "Herkese açık: herkes görür; kahvenin sayfasında, profilinde ve arama motorlarında yer alabilir.",
          "Takipçiler: yalnızca seni takip eden üyeler görür.",
          "Yalnız ben: yalnızca sen görürsün.",
          "Kafe ziyaretlerin için de aynı üç seçenek geçerlidir. Herkese açık bir ziyaret, o tarihte o kafede bulunduğunu gösterir; bunu göstermek istemediğin ziyaretleri takipçilere ya da yalnız kendine açık ekle.",
          "Fotoğraflar: profil resmin herkese açıktır. Tadım fotoğrafı tadımla birlikte görünür; ancak fotoğraf dosyası tahmin edilemeyen bir adreste durur ve o adresi bilen herkes açabilir. Yalnızca takipçilere ya da yalnız sana açık bir tadımın fotoğrafını, adresinin paylaşılmasını istemiyorsan ekleme.",
        ],
      },
      {
        title: "E-posta adresin",
        paragraphs: [
          "E-posta adresin yalnızca giriş kodu, davet ve hesabınla ilgili zorunlu bildirimler için kullanılır. Sitede hiçbir yerde gösterilmez ve tanıtım e-postası gönderilmez.",
        ],
        items: [],
      },
      {
        title: "Çerezler",
        paragraphs: [
          "Espressoir yalnızca zorunlu çerezleri kullanır; analitik ya da reklam çerezi yoktur. Bu nedenle çerez onay penceresi gösterilmez.",
        ],
        items: [
          "Oturum çerezi: giriş yaptığında oturumunu açık tutar. Çıkış yaptığında silinir.",
          "Tema tercihi: açık ya da koyu görünüm seçimin tarayıcında saklanır; sunucuya gönderilmez.",
          "Bot koruması: giriş formunda Cloudflare Turnstile çalışır ve doğrulama için tarayıcın hakkında teknik bilgi işler.",
        ],
      },
      {
        title: "Güvenlik",
        paragraphs: [
          'Her kayıt veritabanı düzeyindeki erişim kurallarıyla korunur: bir üye yalnızca kendi kayıtlarını değiştirebilir, "yalnız ben" olarak işaretlenen tadımları başkası okuyamaz. Bağlantılar şifrelidir (HTTPS). Parola kullanmıyorsan saklanan bir parolan da yoktur; giriş tek kullanımlık kodla yapılır.',
          "Hiçbir sistem tümüyle güvenli değildir. Bir veri ihlali fark edilirse etkilenen üyelere ve gerekiyorsa Kişisel Verileri Koruma Kurulu'na bildirim yapılır.",
        ],
        items: [],
      },
      {
        title: "Yaş sınırı",
        paragraphs: [
          "Espressoir 18 yaşından küçükler için tasarlanmamıştır. 18 yaşından küçüksen hesap açma.",
        ],
        items: [],
      },
      {
        title: "Değişiklikler",
        paragraphs: [
          "Bu metin değişirse sayfanın başındaki tarih güncellenir. Önemli değişiklikler üyelere ayrıca duyurulur.",
          `Sorular için: ${CONTACT}`,
        ],
        items: [],
      },
    ],
  },
  terms: {
    title: "Kullanım koşulları",
    short: "Koşullar",
    description: "Espressoir'ı kullanırken geçerli olan kurallar: hesap, içerik, moderasyon.",
    sections: [
      {
        title: "Hizmet",
        paragraphs: [
          'Espressoir, kahve tadımlarını kaydedip paylaşabildiğin ücretsiz ve ticari olmayan bir sitedir. Tek kişi tarafından geliştirilir ve "olduğu gibi" sunulur: kesintisiz çalışacağı ya da hiç hata içermeyeceği garanti edilmez.',
        ],
        items: [],
      },
      {
        title: "Hesap",
        paragraphs: [
          "Kayıt şimdilik davetledir. Hesabın sana aittir; başkasına devretme ve başkası adına hesap açma. Giriş e-postana erişimi olan herkes hesabına girebilir, bu yüzden e-postanı güvende tut.",
          'Kullanıcı adın başkasını taklit edemez, hakaret içeremez ve siteye ait görünen adlar ("admin" gibi) seçilemez.',
        ],
        items: [],
      },
      {
        title: "İçerik kuralları",
        paragraphs: ["Yazdıkların senin deneyimin olmalı. Şunlar yasaktır:"],
        items: [
          "Hakaret, taciz, nefret söylemi ve tehdit.",
          "Spam, reklam ve karşılığında çıkar sağlanan, bunu belirtmeyen değerlendirmeler.",
          "Başkasının kişisel verilerini paylaşmak; başkalarını onların izni olmadan gösteren ya da uygunsuz içerik taşıyan fotoğraf yüklemek.",
          "Başkasına ait metinleri izinsiz kopyalamak.",
          "Yanıltıcı kahve ya da marka kaydı açmak, aynı kahveyi bilerek tekrar tekrar eklemek.",
          "Siteyi otomatik araçlarla taramak, sınırları aşmaya ya da güvenliği zorlamaya çalışmak.",
        ],
      },
      {
        title: "İçeriğinin sahibi sensin",
        paragraphs: [
          "Tadım notların ve fotoğrafların sana aittir. Onları Espressoir'da seçtiğin görünürlükle yayınlamamıza ve sitenin çalışması için gereken biçimde (listeleme, ortalama hesaplama, küçültme, paylaşım görseli üretme) kullanmamıza izin vermiş olursun. Hesabını sildiğinde bu izin sona erer ve içeriğin, fotoğrafların dahil, silinir.",
          "Kataloğa eklediğin kahve ve marka bilgileri ortak kataloğun parçası olur; düzeltilebilir, birleştirilebilir ve hesabın silinse de kalır.",
        ],
        items: [],
      },
      {
        title: "Moderasyon",
        paragraphs: [
          "Kurallara aykırı içerik gizlenebilir ya da silinebilir; tekrarlayan ihlallerde hesap geçici ya da kalıcı olarak kısıtlanabilir. Bir içeriğin kurallara aykırı olduğunu düşünüyorsan bildir.",
        ],
        items: [],
      },
      {
        title: "Sorumluluk",
        paragraphs: [
          "Tadım notları ve puanlar üyelerin kişisel görüşüdür; Espressoir'ın görüşünü yansıtmaz. Sitedeki hiçbir bilgi sağlık ya da beslenme tavsiyesi değildir. Markalar ve ürün adları sahiplerine aittir; Espressoir'ın adı geçen markalarla bir bağı yoktur.",
        ],
        items: [],
      },
      {
        title: "Hesabını kapatmak",
        paragraphs: [
          "Hesabını istediğin an Hesap sayfasından silebilirsin. Silmeden önce verilerini aynı sayfadan indirebilirsin.",
        ],
        items: [],
      },
      {
        title: "Değişiklikler ve uygulanacak hukuk",
        paragraphs: [
          "Bu koşullar değişebilir; önemli değişiklikler üyelere duyurulur ve yeni sürümü kabul etmen istenebilir. Bu koşullara Türkiye Cumhuriyeti hukuku uygulanır.",
          `İletişim: ${CONTACT}`,
        ],
        items: [],
      },
    ],
  },
} as const;
