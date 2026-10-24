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
} as const satisfies Record<string, Photo>;

export type PhotoId = keyof typeof PHOTOS;

export const isPhotoId = (id: string): id is PhotoId => Object.hasOwn(PHOTOS, id);
