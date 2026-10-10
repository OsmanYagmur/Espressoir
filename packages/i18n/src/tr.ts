/**
 * Türkçe arayüz metinleri. Tüm UI metinleri burada durur; yeni bir dil eklenirken
 * aynı şekle sahip bir sözlük (`Dictionary` tipi) yazmak yeterli.
 * Yer tutucular `{ad}` biçimindedir ve `format()` ile doldurulur.
 */
export const tr = {
  meta: {
    description:
      "Kahve tadım defteri ve arşivi: filtre, V60, kapsül, French press, Türk kahvesi… Her fincanı puanla, not al, hatırla.",
  },
  a11y: {
    skipToContent: "İçeriğe geç",
  },
  nav: {
    label: "Ana menü",
    home: "Ana sayfa",
    coffees: "Kahveler",
    stats: "İstatistik",
    about: "Hakkında",
    openMenu: "Menüyü aç",
    closeMenu: "Menüyü kapat",
  },
  theme: {
    toggle: "Temayı değiştir",
    light: "Açık",
    dark: "Koyu",
    system: "Sistem",
  },
  home: {
    eyebrow: "Kahve tadım defteri",
    lead: "İçtiğin her kahve için bir sayfa: V60'ta demlediğin filtre kahveden sabah kapsülüne, French press'ten cezvedeki Türk kahvesine kadar. Puanla, not al, yıllar sonra o fincanı yeniden hatırla.",
    methodsTitle: "Her demleme yöntemine açık",
    methods: [
      "V60",
      "Filtre kahve",
      "Kapsül",
      "French press",
      "AeroPress",
      "Moka pot",
      "Chemex",
      "Espresso",
      "Türk kahvesi",
    ],
    comingSoonTitle: "Arşiv demleniyor",
    comingSoonBody: "İlk tadım notları çok yakında burada olacak.",
    scaleTitle: "Puan skalası",
    scaleBody: "1'den 10'a. Renk yalnızca yardımcı; puan her zaman yazıyla da görünür.",
  },
  comingSoon: {
    title: "Bu sayfa demleniyor",
    body: "Bu bölüm henüz hazır değil. Arşiv açıldığında burada olacak.",
  },
  score: {
    value: "{score}/10",
    aria: "10 üzerinden {score} puan",
    none: "Puansız",
  },
  footer: {
    note: "Kahve notları, özenle tutuldu.",
    copyright: "© {year} {name}",
  },
  states: {
    loading: "Demleniyor…",
    notFoundCode: "404",
    notFoundTitle: "Bu fincan boş çıktı",
    notFoundBody: "Aradığın sayfa yok ya da başka bir yere taşınmış olabilir.",
    backHome: "Ana sayfaya dön",
    errorTitle: "Bir şeyler taştı",
    errorBody: "Beklenmedik bir hata oluştu. Tekrar dene; sorun sürerse biraz sonra yeniden uğra.",
    retry: "Tekrar dene",
  },
} as const;
