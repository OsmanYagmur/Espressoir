import type { BrewPlan } from "@espressoir/core";

/**
 * The brewing assistant's plan for each guide (src/content/bilgi/<slug>.md), keyed by the
 * guide's address. One cup's numbers are the guide's recipe (a mismatch stops the build,
 * lib/data/articles.ts); the stages follow its numbered steps from the moment the clock
 * starts, in the guide's own words. A guide without a plan simply has no assistant.
 *
 * `cue` marks a moment that is a sign to watch for (the foam rises, the pot gurgles): the
 * time beside it is only a rough guide.
 */
export const BREW_PLANS: Readonly<Record<string, BrewPlan>> = {
  v60: {
    kind: "timed",
    dose: 15,
    water: 240,
    waterUnit: "ml",
    maxCups: 2,
    end: 180,
    finish: "Demliği kaldır. Toplam süre 2,5 ile 3 dakika arasında olmalı.",
    stages: [
      {
        at: 0,
        title: "Islat",
        detail: "Kahvenin üstüne su dök: kahve kabarır, içindeki gaz çıkar.",
        pourTo: 40,
      },
      {
        at: 45,
        title: "İlk döküş",
        detail: "Ortadan dışa doğru küçük dairelerle dök. Suyu doğrudan kâğıda dökme.",
        pourTo: 140,
      },
      {
        at: 75,
        title: "Son döküş",
        detail: "Aynı dairelerle devam et.",
        pourTo: 240,
      },
      {
        at: 105,
        title: "Süzülsün",
        detail: "Su tamamen süzülene kadar bekle.",
      },
    ],
  },
  "french-press": {
    kind: "timed",
    dose: 20,
    water: 300,
    waterUnit: "ml",
    maxCups: 2,
    end: 240,
    finish:
      "Kabuğu bir kaşıkla kır, köpüğü al. Pistonu yavaşça bastır ve kahveyi hemen fincana boşalt.",
    stages: [
      {
        at: 0,
        title: "Suyu dök",
        detail: "Bütün kahve ıslanacak şekilde dök.",
        pourTo: 300,
      },
      {
        at: 15,
        title: "Kapat ve bekle",
        detail: "Kapağı, piston yukarıda kalacak şekilde kapat. Üstte bir kabuk oluşur.",
      },
    ],
  },
  aeropress: {
    kind: "timed",
    dose: 15,
    water: 230,
    waterUnit: "ml",
    maxCups: 1,
    end: 150,
    finish: "Kapağı çöpün üstünde aç ve telveyi pistonla dışarı it.",
    stages: [
      {
        at: 0,
        title: "Dök ve karıştır",
        detail: "Yaklaşık 85 °C'lik suyu dök, on saniye kadar karıştır.",
        pourTo: 230,
      },
      {
        at: 10,
        title: "Pistonu oturt",
        detail: "Silindirin ağzına hafifçe oturt; kahve süzülmeden bekler.",
      },
      {
        at: 120,
        title: "Bastır",
        detail: "Yaklaşık 30 saniyede, sabit bir hızla. Tıslama sesi gelince dur.",
      },
    ],
  },
  "moka-pot": {
    kind: "timed",
    dose: 16,
    water: 150,
    waterUnit: "ml",
    maxCups: 1,
    end: 300,
    finish: "Altını soğuk suya tut, üst bölmeyi karıştır ve fincanlara paylaştır.",
    stages: [
      {
        at: 0,
        title: "Orta ateşte ısıt",
        detail: "Kapağı açık bırak. Kahve akmaya başlayınca ateşi kıs.",
      },
      {
        at: 240,
        title: "Ocaktan al",
        detail: "Akış açık renge dönüp fokurdamaya başlayınca demliği ocaktan al.",
        cue: true,
      },
    ],
  },
  "espresso-ayarlari": {
    kind: "timed",
    dose: 18,
    water: 36,
    waterUnit: "g",
    maxCups: 1,
    end: 30,
    finish: "Tadına bak.",
    shot: { fast: 20, from: 25, to: 30, slow: 35 },
    stages: [
      {
        at: 0,
        title: "Pompayı aç",
        detail: "Fincan terazinin üstünde dursun.",
      },
      {
        at: 25,
        title: "Durdurmaya hazırlan",
        detail: "Fincandaki espresso hedefe varınca pompayı kapat ve saati durdur.",
        pourTo: 36,
      },
    ],
  },
  "turk-kahvesi": {
    kind: "timed",
    dose: 7,
    water: 70,
    waterUnit: "ml",
    maxCups: 4,
    end: 300,
    finish: "Yanında bir bardak suyla ikram et.",
    stages: [
      {
        at: 0,
        title: "Kısık ateşe koy",
        detail:
          "Ocağa koyduktan sonra bir daha karıştırma. Acele etme: yavaş ısınan kahve daha çok köpük yapar.",
      },
      {
        at: 180,
        title: "Köpüğü paylaştır",
        detail: "Kahve kabarıp kenarlardan köpürmeye başlayınca köpüğü bir kaşıkla fincanlara al.",
        cue: true,
      },
      {
        at: 210,
        title: "Kalanı dök",
        detail: "Cezveyi yeniden ateşe koy, ilk kabarışta kalanı yavaşça dök. Kaynatma.",
        cue: true,
      },
      {
        at: 240,
        title: "Telve çöksün",
        detail: "Bir dakika bekle ki telve dibe çöksün.",
      },
    ],
  },
  "soguk-demleme": {
    kind: "steep",
    dose: 100,
    water: 1000,
    waterUnit: "ml",
    maxCups: 1,
    hours: { from: 12, to: 18 },
  },
};
