import type { Weights } from "@espressoir/core";

/**
 * The coffee quiz (/kahve-testi): five questions, each answer giving points to brewing
 * methods and roasts; the method and the roast with the most points are the result
 * (@espressoir/core, quiz.ts). The methods are guides (src/content/bilgi/<slug>.md), so a
 * result always leads to one; what is said about roasts and origins comes from
 * design/icerik.md (kavrum-dereceleri, cekirdek-farklari).
 */

/** The methods a result can name, by guide; a tie goes to the earlier one. */
export const QUIZ_METHODS = [
  "v60",
  "french-press",
  "aeropress",
  "moka-pot",
  "turk-kahvesi",
  "espresso-ayarlari",
  "soguk-demleme",
] as const;
export type QuizMethod = (typeof QUIZ_METHODS)[number];

/** Medium first: with no preference at all, the balanced start. */
export const QUIZ_ROASTS = ["medium", "light", "dark"] as const;
export type QuizRoast = (typeof QUIZ_ROASTS)[number];

export interface QuizOption {
  label: string;
  hint?: string;
  methods: Weights<QuizMethod>;
  roasts?: Weights<QuizRoast>;
}

export interface QuizQuestion {
  question: string;
  options: QuizOption[];
}

export const QUIZ: readonly QuizQuestion[] = [
  {
    question: "Fincanında en çok neyi seversin?",
    options: [
      {
        label: "Meyve ve canlılık",
        hint: "Hafif ekşimsi, çiçeksi, çay gibi.",
        methods: { v60: 2, aeropress: 1 },
        roasts: { light: 3 },
      },
      {
        label: "Karamel, çikolata, fındık",
        hint: "Yumuşak, tatlımsı, dengeli.",
        methods: { aeropress: 1, "french-press": 1, "soguk-demleme": 1 },
        roasts: { medium: 3 },
      },
      {
        label: "Yoğun ve sert",
        hint: "Acılığı severim, gövdeli olsun.",
        methods: { "moka-pot": 2, "espresso-ayarlari": 1, "turk-kahvesi": 1 },
        roasts: { dark: 3 },
      },
    ],
  },
  {
    question: "Kahveni nasıl içersin?",
    options: [
      { label: "Sade", methods: { v60: 1, "french-press": 1, "turk-kahvesi": 1 } },
      {
        label: "Sütlü",
        hint: "Latte, sütlü kahve.",
        methods: { "espresso-ayarlari": 2, "moka-pot": 1, aeropress: 1, "soguk-demleme": 1 },
        roasts: { dark: 1 },
      },
      {
        label: "Buzlu",
        hint: "Sıcak havada, bol buzla.",
        methods: { "soguk-demleme": 3 },
      },
    ],
  },
  {
    question: "Ağızda nasıl bir his istersin?",
    options: [
      { label: "Hafif ve berrak", methods: { v60: 2, aeropress: 1 } },
      {
        label: "Dolgun ve yağlı",
        methods: { "french-press": 2, "moka-pot": 1, "turk-kahvesi": 1 },
      },
      {
        label: "Küçük ama yoğun",
        methods: { "espresso-ayarlari": 2, "moka-pot": 1, "turk-kahvesi": 1 },
      },
    ],
  },
  {
    question: "Sabahları kahveye ne kadar vaktin var?",
    options: [
      {
        label: "Birkaç dakika",
        hint: "Hızlı olsun.",
        methods: { aeropress: 2, "espresso-ayarlari": 1 },
      },
      {
        label: "Beş dakika kadar",
        hint: "Demlemeyi severim.",
        methods: { v60: 1, "french-press": 1, "turk-kahvesi": 1, "moka-pot": 1 },
      },
      {
        label: "Önceden hazırlarım",
        hint: "Buzdolabında hazır dursun.",
        methods: { "soguk-demleme": 3 },
      },
    ],
  },
  {
    question: "Evde ne var?",
    options: [
      {
        label: "Henüz hiçbir şey",
        hint: "Bir yerden başlamak istiyorum.",
        methods: { "french-press": 2, "soguk-demleme": 1 },
      },
      { label: "Cezve", methods: { "turk-kahvesi": 4 } },
      { label: "Moka pot", methods: { "moka-pot": 4 } },
      { label: "Espresso makinesi", methods: { "espresso-ayarlari": 4 } },
      {
        label: "Filtre demlik",
        hint: "V60, French press ya da AeroPress.",
        methods: { v60: 2, "french-press": 2, aeropress: 2 },
      },
    ],
  },
];

/** What a result says about its roast, and where to look on a package. */
export const QUIZ_ROAST_TEXT: Readonly<
  Record<QuizRoast, { title: string; text: string; origins: string | null }>
> = {
  light: {
    title: "Açık kavrum",
    text: "Asidik, meyvemsi, çiçeksi. Çekirdeğin geldiği yer en çok bu kavrumda fark edilir; filtre kahve için sık seçilir.",
    origins: "Etiyopya (çiçeksi, meyvemsi) ya da Kenya (canlı, frenk üzümü gibi).",
  },
  medium: {
    title: "Orta kavrum",
    text: "Asidite yumuşar; karamel, çikolata ve fındık notaları öne çıkar. Hem filtre hem espresso için dengeli bir başlangıç.",
    origins: "Kolombiya (dengeli, karamelli) ya da Brezilya (fındıklı, çikolatalı).",
  },
  dark: {
    title: "Koyu kavrum",
    text: "Acı, isli ve gövdeli; çekirdeğin kendi tadı büyük ölçüde kaybolur. Sütlü içeceklerde ve klasik İtalyan espressosunda sık kullanılır.",
    origins: null,
  },
};

/** The article a result's roast leads to. */
export const QUIZ_ROAST_ARTICLE = "kavrum-dereceleri";
