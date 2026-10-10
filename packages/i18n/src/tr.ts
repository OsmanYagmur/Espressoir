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
    title: "Tadım defteri",
    intro:
      "Kişisel kahve tadım arşivi: puan, not ve demleme yöntemiyle. Filtreden kapsüle, cezveden espressoya.",
    methodsLine: "V60 · filtre · kapsül · French press · espresso · Türk kahvesi",
    fields: {
      tastings: "Tadım",
      coffees: "Kahve",
      brands: "Marka",
      average: "Ort. puan",
    },
    fieldEmpty: "henüz kayıt yok",
    latestTitle: "Son tadımlar",
    latestEmpty:
      "Form henüz boş. İlk kayıtlar Notion arşivinden aktarıldığında burada listelenecek.",
    scaleTitle: "Puan skalası",
    scaleBody: "1–10. Renk yalnızca yardımcı; puan her zaman sayıyla yazılır.",
    methodsTitle: "Demleme yöntemleri",
    methods: [
      "V60",
      "Filtre kahve makinesi",
      "Kapsül makinesi",
      "Taşınabilir espresso",
      "French press",
      "AeroPress",
      "Moka pot",
      "Chemex",
      "Espresso makinesi",
      "Türk kahvesi",
    ],
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
