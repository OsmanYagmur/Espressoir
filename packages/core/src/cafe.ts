/**
 * Cafés and what members drink there (Phase 3F). The database enforces every one of these
 * (a database test compares the drink kinds and the map link rule); they are shared so forms
 * can answer before a round trip.
 */

/** Turkey's 81 provinces by plate number: a café's city. The slug is its URL segment. */
export const TR_CITIES = [
  { code: 1, name: "Adana", slug: "adana" },
  { code: 2, name: "Adıyaman", slug: "adiyaman" },
  { code: 3, name: "Afyonkarahisar", slug: "afyonkarahisar" },
  { code: 4, name: "Ağrı", slug: "agri" },
  { code: 5, name: "Amasya", slug: "amasya" },
  { code: 6, name: "Ankara", slug: "ankara" },
  { code: 7, name: "Antalya", slug: "antalya" },
  { code: 8, name: "Artvin", slug: "artvin" },
  { code: 9, name: "Aydın", slug: "aydin" },
  { code: 10, name: "Balıkesir", slug: "balikesir" },
  { code: 11, name: "Bilecik", slug: "bilecik" },
  { code: 12, name: "Bingöl", slug: "bingol" },
  { code: 13, name: "Bitlis", slug: "bitlis" },
  { code: 14, name: "Bolu", slug: "bolu" },
  { code: 15, name: "Burdur", slug: "burdur" },
  { code: 16, name: "Bursa", slug: "bursa" },
  { code: 17, name: "Çanakkale", slug: "canakkale" },
  { code: 18, name: "Çankırı", slug: "cankiri" },
  { code: 19, name: "Çorum", slug: "corum" },
  { code: 20, name: "Denizli", slug: "denizli" },
  { code: 21, name: "Diyarbakır", slug: "diyarbakir" },
  { code: 22, name: "Edirne", slug: "edirne" },
  { code: 23, name: "Elazığ", slug: "elazig" },
  { code: 24, name: "Erzincan", slug: "erzincan" },
  { code: 25, name: "Erzurum", slug: "erzurum" },
  { code: 26, name: "Eskişehir", slug: "eskisehir" },
  { code: 27, name: "Gaziantep", slug: "gaziantep" },
  { code: 28, name: "Giresun", slug: "giresun" },
  { code: 29, name: "Gümüşhane", slug: "gumushane" },
  { code: 30, name: "Hakkâri", slug: "hakkari" },
  { code: 31, name: "Hatay", slug: "hatay" },
  { code: 32, name: "Isparta", slug: "isparta" },
  { code: 33, name: "Mersin", slug: "mersin" },
  { code: 34, name: "İstanbul", slug: "istanbul" },
  { code: 35, name: "İzmir", slug: "izmir" },
  { code: 36, name: "Kars", slug: "kars" },
  { code: 37, name: "Kastamonu", slug: "kastamonu" },
  { code: 38, name: "Kayseri", slug: "kayseri" },
  { code: 39, name: "Kırklareli", slug: "kirklareli" },
  { code: 40, name: "Kırşehir", slug: "kirsehir" },
  { code: 41, name: "Kocaeli", slug: "kocaeli" },
  { code: 42, name: "Konya", slug: "konya" },
  { code: 43, name: "Kütahya", slug: "kutahya" },
  { code: 44, name: "Malatya", slug: "malatya" },
  { code: 45, name: "Manisa", slug: "manisa" },
  { code: 46, name: "Kahramanmaraş", slug: "kahramanmaras" },
  { code: 47, name: "Mardin", slug: "mardin" },
  { code: 48, name: "Muğla", slug: "mugla" },
  { code: 49, name: "Muş", slug: "mus" },
  { code: 50, name: "Nevşehir", slug: "nevsehir" },
  { code: 51, name: "Niğde", slug: "nigde" },
  { code: 52, name: "Ordu", slug: "ordu" },
  { code: 53, name: "Rize", slug: "rize" },
  { code: 54, name: "Sakarya", slug: "sakarya" },
  { code: 55, name: "Samsun", slug: "samsun" },
  { code: 56, name: "Siirt", slug: "siirt" },
  { code: 57, name: "Sinop", slug: "sinop" },
  { code: 58, name: "Sivas", slug: "sivas" },
  { code: 59, name: "Tekirdağ", slug: "tekirdag" },
  { code: 60, name: "Tokat", slug: "tokat" },
  { code: 61, name: "Trabzon", slug: "trabzon" },
  { code: 62, name: "Tunceli", slug: "tunceli" },
  { code: 63, name: "Şanlıurfa", slug: "sanliurfa" },
  { code: 64, name: "Uşak", slug: "usak" },
  { code: 65, name: "Van", slug: "van" },
  { code: 66, name: "Yozgat", slug: "yozgat" },
  { code: 67, name: "Zonguldak", slug: "zonguldak" },
  { code: 68, name: "Aksaray", slug: "aksaray" },
  { code: 69, name: "Bayburt", slug: "bayburt" },
  { code: 70, name: "Karaman", slug: "karaman" },
  { code: 71, name: "Kırıkkale", slug: "kirikkale" },
  { code: 72, name: "Batman", slug: "batman" },
  { code: 73, name: "Şırnak", slug: "sirnak" },
  { code: 74, name: "Bartın", slug: "bartin" },
  { code: 75, name: "Ardahan", slug: "ardahan" },
  { code: 76, name: "Iğdır", slug: "igdir" },
  { code: 77, name: "Yalova", slug: "yalova" },
  { code: 78, name: "Karabük", slug: "karabuk" },
  { code: 79, name: "Kilis", slug: "kilis" },
  { code: 80, name: "Osmaniye", slug: "osmaniye" },
  { code: 81, name: "Düzce", slug: "duzce" },
] as const;

export type TrCity = (typeof TR_CITIES)[number];

export function cityByCode(code: number): TrCity | undefined {
  return TR_CITIES[code - 1];
}

export function cityBySlug(slug: string): TrCity | undefined {
  return TR_CITIES.find((city) => city.slug === slug);
}

/** What kind of drink a visit was about (the check on cafe_visits.drink). */
export const CAFE_DRINKS = [
  "espresso",
  "ristretto",
  "americano",
  "macchiato",
  "cortado",
  "flat_white",
  "cappuccino",
  "latte",
  "filter",
  "pour_over",
  "cold_brew",
  "turkish",
  "other",
] as const;
export type CafeDrink = (typeof CAFE_DRINKS)[number];

export const CAFE_NAME_MAX_LENGTH = 80;
export const CAFE_DISTRICT_MAX_LENGTH = 60;
export const CAFE_MAP_URL_MAX_LENGTH = 500;
export const CAFE_DRINK_NAME_MAX_LENGTH = 60;
export const CAFE_VISIT_NOTES_MAX_LENGTH = 2000;
/** New cafés a member may add per day (admins and scripts are exempt). */
export const CAFES_PER_DAY = 5;
/** Visits a member may log per day. */
export const CAFE_VISITS_PER_DAY = 30;

/**
 * A map link is a pasted https address on one of the well-known map services, nothing else:
 * the site never fetches it, and a free address would let anyone link anywhere from a café's
 * page. The same expression is the database check (cafes_map_url_format).
 */
export const MAP_URL_PATTERN =
  /^https:\/\/((www\.)?google\.(com(\.[a-z]{2})?|co\.[a-z]{2}|[a-z]{2})\/maps|maps\.google\.(com(\.[a-z]{2})?|co\.[a-z]{2}|[a-z]{2})|maps\.app\.goo\.gl|goo\.gl\/maps|maps\.apple\.com|(www\.)?openstreetmap\.org|yandex\.com(\.tr)?\/maps)[/?#][^\s]*$/;
