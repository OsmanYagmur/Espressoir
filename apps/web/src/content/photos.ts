/**
 * The site's own photos (DESIGN.md → Görseller): files in public/images, each twice,
 * `<id>-640.webp` and `<id>-1280.webp`, cropped to the shape they are shown in and
 * re-encoded without metadata. All from Unsplash, free to use under its licence; the
 * photographer is named under the photo wherever it is shown large.
 */
export interface Photo {
  /** The 1280 file's size; the 640 one is half of it. */
  width: number;
  height: number;
  /** For people who cannot see it: what is in the picture. */
  alt: string;
  author: string;
  /** The photo's page on Unsplash. */
  source: string;
}

export const PHOTOS = {
  "ana-demleme": {
    width: 1280,
    height: 960,
    alt: "İnce uçlu bir demlikten kâğıt filtredeki kahveye sıcak su dökülüyor.",
    author: "Jannis Brandt",
    source: "https://unsplash.com/photos/person-pouring-coffee-into-cup-qLFJ0uCF9oY",
  },
  "atolye-mutfak": {
    width: 1280,
    height: 720,
    alt: "Önlüklü bir barista tezgâhta kahve hazırlıyor; arkasında ekip çalışıyor.",
    author: "Daniel Norris",
    source: "https://unsplash.com/photos/group-of-people-in-kitchen-cNSoS3nvcnU",
  },
  "bilgi-arabica-robusta": {
    width: 1280,
    height: 720,
    alt: "Dalında yeşil, sarı ve kırmızı kahve meyveleri.",
    author: "Clint McKoy",
    source: "https://unsplash.com/photos/round-green-and-red-berries-h28p96ICizo",
  },
  "bilgi-tazelik": {
    width: 1280,
    height: 720,
    alt: "Kavurma makinesinden yeni dökülen kahve çekirdekleri bir kepçeyle karıştırılıyor.",
    author: "Tim Mossholder",
    source: "https://unsplash.com/photos/coffee-roasting-in-playa-del-carmen-YC6RVdoTtIk",
  },
  "bilgi-ogutme": {
    width: 1280,
    height: 720,
    alt: "Portafiltrede öğütülmüş kahve, yanında köpüğüne desen çizilmiş bir latte.",
    author: "Nathan Dumlao",
    source:
      "https://unsplash.com/photos/flat-lay-photography-of-coffee-latte-ground-coffee-and-coffee-beans-Y3AqmbmtLQI",
  },
  "bilgi-oran": {
    width: 1280,
    height: 720,
    alt: "Dijital terazide, beyaz bir kapta tartılan kahve çekirdekleri.",
    author: "User_Pascal",
    source:
      "https://unsplash.com/photos/coffee-beans-are-being-weighed-on-a-digital-scale-dZAb0Km1ELY",
  },
  "bilgi-v60": {
    width: 1280,
    height: 720,
    alt: "Turuncu bir V60'a ince uçlu demlikle sıcak su dökülüyor.",
    author: "Ali Olfian",
    source:
      "https://unsplash.com/photos/a-person-pours-orange-juice-into-a-glass-pitcher-j7ZqjZhXnv8",
  },
  "bilgi-french-press": {
    width: 1280,
    height: 720,
    alt: "Açık havada, masanın üstünde demlenmiş kahveyle dolu cam bir French press.",
    author: "Sorin Gheorghita",
    source: "https://unsplash.com/photos/a-pitcher-of-liquid-sitting-on-top-of-a-table-flrcFG0rvZU",
  },
  "bilgi-aeropress": {
    width: 1280,
    height: 720,
    alt: "Ahşap masada bir AeroPress, kahve çekirdekleri, ölçü kaşığı ve elde tutulan bir fincan kahve.",
    author: "Elin Melaas",
    source:
      "https://unsplash.com/photos/a-person-holding-a-cup-of-coffee-next-to-a-pile-of-coffee-beans-9Yo5CGloHgU",
  },
  "bilgi-moka": {
    width: 1280,
    height: 720,
    alt: "Koyu renk bir moka pot ve yanında öğütülmüş kahveyle dolu sepeti.",
    author: "Ashkan Forouzani",
    source:
      "https://unsplash.com/photos/black-coffee-beans-in-black-and-silver-coffee-maker-1SATo8GQBYg",
  },
  "bilgi-espresso": {
    width: 1280,
    height: 720,
    alt: "Makineye takılı portafiltrenin altından ince bir espresso akıyor.",
    author: "Scott K",
    source:
      "https://unsplash.com/photos/fresh-espresso-pouring-from-coffee-machine-portafilter-MSNrHnK__gM",
  },
  "bilgi-turk-kahvesi": {
    width: 1280,
    height: 720,
    alt: "Eskimiş ahşap masada, desenli tabağında köpüklü bir fincan Türk kahvesi.",
    author: "yucar studios",
    source:
      "https://unsplash.com/photos/flat-lay-photography-of-cup-filled-with-coffee-qdFxL5PoQhE",
  },
  "bilgi-soguk-demleme": {
    width: 1280,
    height: 720,
    alt: "Ahşap altlıkta buzlu bir bardak soğuk demleme, arkasında soğuk demleme şişesi ve cam sürahi.",
    author: "An Nguyen",
    source: "https://unsplash.com/photos/clear-drinking-glass-beside-brown-bottle-SIUaCpFN5cQ",
  },
  "bilgi-cekirdek": {
    width: 1280,
    height: 720,
    alt: "Elde tutulan bir dalda yeşil, sarı ve kırmızı kahve meyveleri.",
    author: "Katya Ross",
    source: "https://unsplash.com/photos/a-hand-is-holding-a-bunch-of-berries-Adg9B8NTxj0",
  },
  "bilgi-kavrum": {
    width: 1280,
    height: 720,
    alt: "Gri zemine sıra sıra dizilmiş, açık renkten koyuya kahve çekirdekleri.",
    author: "nousnou iwasaki",
    source: "https://unsplash.com/photos/brown-coffee-beans-myPzH34VYK4",
  },
  "bilgi-su": {
    width: 1280,
    height: 720,
    alt: "Bir demliğin kapağındaki termometre suyun sıcaklığını gösteriyor.",
    author: "Ryan Wallace",
    source:
      "https://unsplash.com/photos/the-thermometer-shows-a-high-temperature-reading-6_oDBzwQMqI",
  },
  "bilgi-filtre-makinesi": {
    width: 1280,
    height: 720,
    alt: "Kırmızı bir filtre kahve makinesi; altında cam sürahisi, arkasında pencere.",
    author: "earlybird coffee",
    source: "https://unsplash.com/photos/red-and-black-coffee-maker-JE-MOId38SU",
  },
  "bilgi-kapsul": {
    width: 1280,
    height: 720,
    alt: "Üst üste yığılmış, rengârenk alüminyum kahve kapsülleri.",
    author: "Jisu Han",
    source: "https://unsplash.com/photos/assorted-color-container-lot--LQJ7fB9amY",
  },
  "bilgi-chemex": {
    width: 1280,
    height: 720,
    alt: "Tahta kuşaklı bir Chemex; camın dibinde demlenmiş kahve.",
    author: "Erick Chévez",
    source:
      "https://unsplash.com/photos/a-coffee-pot-sitting-on-top-of-a-wooden-cutting-board-yCcx7BXE7i8",
  },
  "bilgi-kalita": {
    width: 1280,
    height: 720,
    alt: "Yukarıdan bakış: dalgalı kâğıt filtreli bir Kalita Wave'de ıslanmış öğütülmüş kahve.",
    author: "Hrushi Chavhan",
    source: "https://unsplash.com/photos/a-close-up-of-a-cup-of-coffee-on-a-table-K6_Y1QkhJl8",
  },
  "bilgi-buzlu-filtre": {
    width: 1280,
    height: 720,
    alt: "Cam bir sürahiden buz dolu bir bardağa kahve dökülüyor.",
    author: "Nathan Dumlao",
    source: "https://unsplash.com/photos/person-pouring-coffee-on-rock-glass-VMlO-arqpOs",
  },
  "bilgi-sifon": {
    width: 1280,
    height: 720,
    alt: "Bir kafenin tezgâhında yan yana duran cam sifon demlikler.",
    author: "Joey Huang",
    source: "https://unsplash.com/photos/a-counter-with-a-lot-of-glasses-on-it-Kz7H6SRUTuk",
  },
  "bilgi-espresso-icecekleri": {
    width: 1280,
    height: 720,
    alt: "Bitkilerin arasında, köpüğüne desen çizilmiş sütlü kahveler.",
    author: "Nathan Dumlao",
    source:
      "https://unsplash.com/photos/shallow-focus-photography-of-coffee-late-in-mug-on-table-zUNs99PGDg0",
  },
  "bilgi-paket": {
    width: 1280,
    height: 720,
    alt: "Ağzı açık bir paketin içinde kavrulmuş kahve çekirdekleri.",
    author: "Nadia Valko",
    source: "https://unsplash.com/photos/brown-coffee-beans-inside-white-sack-7QlJ79Cj43w",
  },
  "bilgi-isleme": {
    width: 1280,
    height: 720,
    alt: "Güneşte kurumaya bırakılmış kırmızı ve turuncu kahve meyveleri.",
    author: "roedy rustam",
    source:
      "https://unsplash.com/photos/red-coffee-beans-drying-in-the-sun-on-green-mats-Sf0scDJC7ig",
  },
  "bilgi-mense": {
    width: 1280,
    height: 720,
    alt: "Dağların önünde, bir yamaçta sıra sıra kahve ağaçları.",
    author: "PROJETO CAFÉ GATO-MOURISCO",
    source:
      "https://unsplash.com/photos/rows-of-coffee-plants-on-a-hillside-with-mountains-N_1lnzUYuAs",
  },
  "bilgi-harman": {
    width: 1280,
    height: 720,
    alt: "Kareyi dolduran, farklı tonlarda kavrulmuş kahve çekirdekleri.",
    author: "Fatih Mehmet YILDIZ",
    source: "https://unsplash.com/photos/roasted-brown-coffee-beans-4KqHNQ3sJ6g",
  },
  "bilgi-kafeinsiz": {
    width: 1280,
    height: 720,
    alt: "Kavrulmamış, yeşil kahve çekirdekleri.",
    author: "wisnu dwi wibowo",
    source:
      "https://unsplash.com/photos/a-pile-of-green-coffee-beans-sitting-on-top-of-a-table-tC0YW-s5QNk",
  },
  "bilgi-tadim": {
    width: 1280,
    height: 720,
    alt: "Tadım masasında sıralı fincanlar; biri kaşıkla kahvenin üstündeki kabuğu kırıyor.",
    author: "René Porter",
    source: "https://unsplash.com/photos/person-mixing-black-coffee-7RYrEvbqFM8",
  },
  "bilgi-tat-notalari": {
    width: 1280,
    height: 720,
    alt: "Tahta bir tepside kahve çekirdekleri ve bitter çikolata parçaları.",
    author: "NordWood Themes",
    source:
      "https://unsplash.com/photos/chocolate-and-coffee-seeds-on-table-near-bowls-d9vsO3166UI",
  },
  "bilgi-ekstraksiyon": {
    width: 1280,
    height: 720,
    alt: "Espresso makinesinden iki küçük bardağa akan espresso.",
    author: "Kevin Butz",
    source: "https://unsplash.com/photos/espresso-cups-on-espresso-maker-BBFRIGifYQ8",
  },
  "bilgi-kafein": {
    width: 1280,
    height: 720,
    alt: "Ahşap bir masada dumanı tüten bir fincan kahve.",
    author: "Charmil Gandhi",
    source: "https://unsplash.com/photos/steaming-cup-of-coffee-on-a-wooden-table-MK60jE_6zXU",
  },
  "bilgi-ekipman": {
    width: 1280,
    height: 720,
    alt: "Bir tezgâhta yan yana iki kahve değirmeni; birinin haznesi çekirdek dolu.",
    author: "Crew",
    source: "https://unsplash.com/photos/black-coffee-maker-0cpACSYMnCo",
  },
  "bilgi-kulturler": {
    width: 1280,
    height: 720,
    alt: "Oymalı toprak bir demlikten (jebena) küçük bir fincana kahve dökülüyor.",
    author: "Amanuel Kebede",
    source:
      "https://unsplash.com/photos/pouring-coffee-from-a-traditional-jug-into-a-cup-v-NdnkoKEQs",
  },
} as const satisfies Record<string, Photo>;

export type PhotoId = keyof typeof PHOTOS;

export const isPhotoId = (id: string): id is PhotoId => Object.hasOwn(PHOTOS, id);
