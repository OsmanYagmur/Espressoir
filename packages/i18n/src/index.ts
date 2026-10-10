import { tr } from "./tr";

export type Locale = "tr";
export const defaultLocale: Locale = "tr";

/** Same keys as the Turkish dictionary, but any string value: the contract every locale must meet. */
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : { readonly [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof tr>;

const dictionaries: Record<Locale, Dictionary> = { tr };

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale];
}

/** Fills `{name}` placeholders; unknown placeholders are left untouched so gaps stay visible. */
export function format(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}
