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
} as const satisfies Record<string, Photo>;

export type PhotoId = keyof typeof PHOTOS;

export const isPhotoId = (id: string): id is PhotoId => Object.hasOwn(PHOTOS, id);
