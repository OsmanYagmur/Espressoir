import {
  COFFEE_FORMS,
  DEFAULT_COFFEE_FILTER,
  SCORE_MAX,
  SCORE_MIN,
  type CoffeeFilter,
  type CoffeeForm,
  type CoffeeSort,
} from "@espressoir/core";

/**
 * The coffee list keeps its filters in the URL, so a filtered view can be shared as a
 * link. Names and values are Turkish because visitors see them:
 *   /kahveler?marka=nespresso&form=kapsul&min=8&sirala=puan
 */
export type CoffeeView = "list" | "cards";

const FORM_VALUES: Record<CoffeeForm, string> = {
  whole_bean: "cekirdek",
  ground: "ogutulmus",
  capsule: "kapsul",
};
const SORT_VALUES: Record<CoffeeSort, string> = {
  recent: "son",
  score_desc: "puan",
  score_asc: "puan-artan",
  name: "ad",
  brand: "marka",
};
const VIEW_VALUES: Record<CoffeeView, string> = { list: "liste", cards: "kart" };

function keyOf<K extends string>(table: Record<K, string>, value: string | null): K | null {
  const entry = Object.entries(table).find(([, v]) => v === value);
  return entry ? (entry[0] as K) : null;
}

function scoreOf(value: string | null): number | null {
  if (value === null || !/^\d{1,2}$/.test(value)) return null;
  const score = Number(value);
  return score >= SCORE_MIN && score <= SCORE_MAX ? score : null;
}

export function parseCoffeeParams(params: URLSearchParams): {
  filter: CoffeeFilter;
  view: CoffeeView;
} {
  const year = params.get("yil");
  const form = keyOf(FORM_VALUES, params.get("form"));
  return {
    filter: {
      query: params.get("q") ?? "",
      brand: params.get("marka") || null,
      form: form && COFFEE_FORMS.includes(form) ? form : null,
      method: params.get("yontem") || null,
      minScore: scoreOf(params.get("min")),
      maxScore: scoreOf(params.get("max")),
      year: year && /^\d{4}$/.test(year) ? Number(year) : null,
      sort: keyOf(SORT_VALUES, params.get("sirala")) ?? DEFAULT_COFFEE_FILTER.sort,
    },
    view: keyOf(VIEW_VALUES, params.get("gorunum")) ?? "list",
  };
}

/** Only what differs from the defaults is written, so a plain list keeps a plain URL. */
export function serializeCoffeeParams(filter: CoffeeFilter, view: CoffeeView): string {
  const params = new URLSearchParams();
  if (filter.query.trim()) params.set("q", filter.query.trim());
  if (filter.brand) params.set("marka", filter.brand);
  if (filter.form) params.set("form", FORM_VALUES[filter.form]);
  if (filter.method) params.set("yontem", filter.method);
  if (filter.minScore !== null) params.set("min", String(filter.minScore));
  if (filter.maxScore !== null) params.set("max", String(filter.maxScore));
  if (filter.year !== null) params.set("yil", String(filter.year));
  if (filter.sort !== DEFAULT_COFFEE_FILTER.sort) params.set("sirala", SORT_VALUES[filter.sort]);
  if (view !== "list") params.set("gorunum", VIEW_VALUES[view]);
  return params.toString();
}
