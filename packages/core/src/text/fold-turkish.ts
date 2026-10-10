const TURKISH_FOLDS: Readonly<Record<string, string>> = {
  İ: "i",
  I: "i",
  ı: "i",
  Ş: "s",
  ş: "s",
  Ğ: "g",
  ğ: "g",
  Ü: "u",
  ü: "u",
  Ö: "o",
  ö: "o",
  Ç: "c",
  ç: "c",
};

/**
 * Folds text into a lowercase, accent-free form for matching and slugs:
 * "Kahve Dünyası" → "kahve dunyasi", "İntenso" → "intenso".
 *
 * Turkish letters are mapped explicitly first, because generic lowercasing
 * turns "İ" into "i̇" (i + combining dot) and "I" into "i" only outside a
 * Turkish locale. Must stay in sync with the SQL `fold_tr()` function.
 */
export function foldTurkish(input: string): string {
  return input
    .replace(/[İIıŞşĞğÜüÖöÇç]/g, (ch) => TURKISH_FOLDS[ch] ?? ch)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}
