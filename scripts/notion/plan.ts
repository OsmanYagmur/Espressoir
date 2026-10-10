/**
 * Turns the rows of a Notion export into an import plan: which brands, coffees and tastings
 * should exist, plus everything worth telling the owner. Pure (no database, no files), so
 * the same input always gives the same plan.
 */
import { foldTurkish, slugify } from "@espressoir/core";

import type { CsvRecord } from "./csv";
import { parseNotionDate } from "./dates";
import type { NotionPage } from "./pages";
import {
  BRAND_ALIASES,
  BREW_METHODS,
  COFFEE_NAME_FIXES,
  COFFEE_NAME_SUGGESTIONS,
  COLUMNS,
  DEVICE_CAPSULE_SYSTEMS,
  FORMS,
  NOTE_FIXES,
  ORIGIN_TERMS,
} from "./rules";

export type CoffeeForm = "ground" | "capsule" | "whole_bean";
export type CapsuleSystem = "nespresso_original" | "vertuo" | "dolce_gusto";

export type Section =
  | "merged"
  | "fixed"
  | "inferred"
  | "missing"
  | "conflict"
  | "ambiguous"
  | "wishlist"
  | "skipped"
  | "suggestion";

export interface Finding {
  section: Section;
  /** Line in the CSV, when the finding is about one row. */
  line: number | null;
  message: string;
}

export interface PlannedBrand {
  slug: string;
  name: string;
  aliases: string[];
}

export interface PlannedCoffee {
  key: string;
  brandSlug: string;
  slug: string;
  name: string;
  form: CoffeeForm | null;
  capsuleSystem: CapsuleSystem | null;
  brandIntensity: number | null;
  originCountry: string | null;
  isBlend: boolean | null;
}

export interface PlannedTasting {
  line: number;
  /** Stable identity of the source row; makes re-imports idempotent. */
  sourceRef: string;
  coffeeKey: string;
  brewMethodSlug: string | null;
  device: string | null;
  score: number | null;
  tastedAt: string | null;
  notes: string | null;
  status: "logged" | "wishlist";
}

export interface ImportPlan {
  rowCount: number;
  brands: PlannedBrand[];
  coffees: PlannedCoffee[];
  tastings: PlannedTasting[];
  findings: Finding[];
}

interface ParsedRow {
  line: number;
  brandWritten: string;
  brandSlug: string;
  coffeeName: string;
  coffeeSlug: string;
  form: CoffeeForm | null;
  intensity: number | null;
  method: { slug: string; device?: string } | null;
  score: number | null;
  tastedAt: string | null;
  /** The row had something in the column, readable or not. */
  hadDate: boolean;
  hadScore: boolean;
  hadMethod: boolean;
  notes: string | null;
}

const tidy = (value: string | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
const keyOf = (value: string) => foldTurkish(tidy(value));

function lookup<T>(table: Readonly<Record<string, T>>, key: (name: string) => string) {
  const map = new Map(Object.entries(table).map(([name, value]) => [key(name), value]));
  return (name: string) => map.get(key(name));
}

const canonicalBrand = lookup(BRAND_ALIASES, slugify);
const knownBrandNames = new Map(Object.values(BRAND_ALIASES).map((name) => [slugify(name), name]));
const fixedCoffeeName = lookup(COFFEE_NAME_FIXES, slugify);
const suggestedCoffeeName = lookup(COFFEE_NAME_SUGGESTIONS, slugify);
const formOf = lookup(FORMS, keyOf);
const methodOf = lookup(BREW_METHODS, keyOf);
const capsuleSystemOf = lookup(DEVICE_CAPSULE_SYSTEMS, keyOf);

function parseInteger(value: string, min: number, max: number): number | "invalid" | null {
  const text = tidy(value);
  if (!text) return null;
  if (!/^\d+$/.test(text)) return "invalid";
  const number = Number(text);
  return number >= min && number <= max ? number : "invalid";
}

/** Countries named in a coffee's title, as whole words. */
function originsIn(name: string): string[] {
  const words = ` ${foldTurkish(name)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
  return Object.entries(ORIGIN_TERMS)
    .filter(([, terms]) => terms.some((term) => words.includes(` ${term} `)))
    .map(([code]) => code);
}

function blendFrom(name: string): boolean | null {
  const words = ` ${foldTurkish(name)
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
  if (words.includes(" single origin ")) return false;
  if (words.includes(" blend ") || words.includes(" harman ")) return true;
  return null;
}

function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j]! + 1,
        current[j - 1]! + 1,
        previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length]!;
}

/** Names close enough to be the same thing misspelled, but not sure enough to merge. */
function looksAlike(a: string, b: string): boolean {
  const [x, y] = [slugify(a), slugify(b)];
  const longest = Math.max(x.length, y.length);
  return longest >= 5 && 1 - levenshtein(x, y) / longest >= 0.8;
}

/** Applies the approved word fixes and tidies spacing (" ," and doubled spaces). */
function fixNote(note: string): string {
  let result = note;
  for (const [word, replacement] of NOTE_FIXES) {
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${word}(?![\\p{L}\\p{N}])`, "gu");
    result = result.replace(pattern, replacement);
  }
  return result
    .replace(/[ \t]+,/g, ",")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function pageFor(record: CsvRecord, pages: readonly NotionPage[]): NotionPage | "several" | null {
  const brand = tidy(record.values[COLUMNS.brand]);
  const name = tidy(record.values[COLUMNS.name]);
  const matches = pages.filter((page) => {
    if (tidy(page.title) !== name && tidy(page.title) !== brand) return false;
    // Every property the page lists must agree with the row.
    return Object.entries(page.properties).every(
      ([column, value]) =>
        !(column in record.values) || tidy(record.values[column]) === tidy(value),
    );
  });
  if (matches.length > 1) return "several";
  return matches[0] ?? null;
}

export function buildImportPlan(
  records: readonly CsvRecord[],
  pages: readonly NotionPage[] = [],
): ImportPlan {
  const findings: Finding[] = [];
  const note = (section: Section, line: number | null, message: string) =>
    findings.push({ section, line, message });

  // ── 1. rows ───────────────────────────────────────────────────────────────────────────
  const rows: ParsedRow[] = [];
  const brandSpellings = new Map<string, Map<string, number[]>>();

  for (const record of records) {
    const { line, values } = record;
    const brandWritten = tidy(values[COLUMNS.brand]);
    const nameWritten = tidy(values[COLUMNS.name]);
    if (!brandWritten || !nameWritten) {
      note(
        "skipped",
        line,
        "Marka veya kahve adı boş; hangi kahve olduğu bilinemediği için atlandı.",
      );
      continue;
    }

    const brandSlug = slugify(canonicalBrand(brandWritten) ?? brandWritten);
    const coffeeName = fixedCoffeeName(nameWritten) ?? nameWritten;
    const coffeeSlug = slugify(coffeeName);
    if (!brandSlug || !coffeeSlug) {
      note(
        "skipped",
        line,
        `"${brandWritten} / ${nameWritten}" adından adres (slug) üretilemedi; atlandı.`,
      );
      continue;
    }
    if (coffeeName !== nameWritten) {
      note("fixed", line, `Kahve adı düzeltildi: "${nameWritten}" → "${coffeeName}".`);
    }

    const spellings = brandSpellings.get(brandSlug) ?? new Map<string, number[]>();
    spellings.set(brandWritten, [...(spellings.get(brandWritten) ?? []), line]);
    brandSpellings.set(brandSlug, spellings);

    const label = `${brandWritten} / ${coffeeName}`;

    const formText = tidy(values[COLUMNS.form]);
    const form = formText ? (formOf(formText) ?? null) : null;
    if (!formText) note("missing", line, `${label}: form (Status) boş; boş bırakıldı.`);
    else if (!form)
      note("missing", line, `${label}: tanınmayan form "${formText}"; boş bırakıldı.`);

    const intensity = parseInteger(values[COLUMNS.intensity] ?? "", 1, 20);
    if (intensity === "invalid") {
      note(
        "missing",
        line,
        `${label}: yoğunluk "${tidy(values[COLUMNS.intensity])}" sayı değil; boş bırakıldı.`,
      );
    }

    const methodText = tidy(values[COLUMNS.method]);
    const method = methodText ? (methodOf(methodText) ?? null) : null;
    if (methodText && !method) {
      note("missing", line, `${label}: tanınmayan demleme yöntemi "${methodText}"; boş bırakıldı.`);
    }

    const score = parseInteger(values[COLUMNS.score] ?? "", 1, 10);
    if (score === "invalid") {
      note(
        "missing",
        line,
        `${label}: puan "${tidy(values[COLUMNS.score])}" 1–10 arası tam sayı değil; puansız aktarıldı.`,
      );
    }

    const dateText = tidy(values[COLUMNS.date]);
    const date = parseNotionDate(dateText);
    if (dateText && !date.ok) {
      const why = date.reason === "ambiguous" ? "gün/ay sırası belirsiz" : "tarih okunamadı";
      note("missing", line, `${label}: "${dateText}" (${why}); tarihsiz aktarıldı.`);
    }

    let notes = (values[COLUMNS.notes] ?? "").trim() || null;
    if (notes) {
      const fixed = fixNote(notes);
      if (fixed !== notes) {
        note("fixed", line, `${label}: not düzeltildi\n  - önce: ${notes}\n  - sonra: ${fixed}`);
        notes = fixed;
      }
    }
    const page = pageFor(record, pages);
    if (page === "several") {
      note("missing", line, `${label}: birden fazla Notion sayfası eşleşti; sayfa notu eklenmedi.`);
    } else if (page?.body) {
      notes = notes ? `${notes}\n\n${page.body}` : page.body;
      note(
        "inferred",
        line,
        `${label}: Notion sayfasındaki ek not tadım notuna eklendi (${page.file}).`,
      );
    }

    rows.push({
      line,
      brandWritten,
      brandSlug,
      coffeeName,
      coffeeSlug,
      form,
      intensity: typeof intensity === "number" ? intensity : null,
      method,
      score: typeof score === "number" ? score : null,
      tastedAt: date.ok ? date.date : null,
      hadDate: Boolean(dateText),
      hadScore: score !== null,
      hadMethod: Boolean(methodText),
      notes,
    });
  }

  // ── 2. brands ─────────────────────────────────────────────────────────────────────────
  const brands: PlannedBrand[] = [];
  for (const [slug, spellings] of brandSpellings) {
    const byFrequency = [...spellings.entries()].sort((a, b) => b[1].length - a[1].length);
    const name = knownBrandNames.get(slug) ?? byFrequency[0]![0];
    const aliases = [...spellings.keys()].filter((spelling) => spelling !== name);
    for (const alias of aliases) {
      note(
        "merged",
        null,
        `"${alias}" → ${name} (satır ${spellings.get(alias)!.join(", ")}). Eski yazım "aliases" alanında saklanıyor.`,
      );
    }
    brands.push({ slug, name, aliases });
  }

  for (let i = 0; i < brands.length; i++) {
    for (let j = i + 1; j < brands.length; j++) {
      if (looksAlike(brands[i]!.name, brands[j]!.name)) {
        note(
          "ambiguous",
          null,
          `"${brands[i]!.name}" ve "${brands[j]!.name}" aynı marka olabilir. Otomatik birleştirilmedi.`,
        );
      }
    }
  }

  // ── 3. coffees ────────────────────────────────────────────────────────────────────────
  const coffees = new Map<string, PlannedCoffee>();
  const capsuleInferences = new Map<string, string[]>();
  for (const row of rows) {
    const key = `${row.brandSlug}/${row.coffeeSlug}`;
    const label = `${row.brandWritten} / ${row.coffeeName}`;
    const capsuleSystem =
      row.form === "capsule" && row.method?.device
        ? (capsuleSystemOf(row.method.device) ?? null)
        : null;

    const existing = coffees.get(key);
    if (!existing) {
      const origins = originsIn(row.coffeeName);
      const isBlend = blendFrom(row.coffeeName);
      if (origins.length === 1) {
        note("inferred", row.line, `${label}: menşe ülke adından alındı → ${origins[0]}.`);
      } else if (origins.length > 1) {
        note(
          "missing",
          row.line,
          `${label}: adında birden fazla ülke geçiyor (${origins.join(", ")}); menşe boş bırakıldı.`,
        );
      }
      if (isBlend !== null) {
        note(
          "inferred",
          row.line,
          `${label}: adına göre ${isBlend ? "harman (blend)" : "tek menşe"} olarak işaretlendi.`,
        );
      }
      if (capsuleSystem) {
        const device = row.method!.device!;
        capsuleInferences.set(device, [...(capsuleInferences.get(device) ?? []), label]);
      }
      coffees.set(key, {
        key,
        brandSlug: row.brandSlug,
        slug: row.coffeeSlug,
        name: row.coffeeName,
        form: row.form,
        capsuleSystem,
        brandIntensity: row.intensity,
        originCountry: origins.length === 1 ? origins[0]! : null,
        isBlend,
      });
      continue;
    }

    // The same coffee on a later row: fill gaps, never overwrite.
    const merge = <K extends "form" | "brandIntensity" | "capsuleSystem">(
      field: K,
      value: PlannedCoffee[K],
      title: string,
    ) => {
      if (value === null) return;
      if (existing[field] === null) existing[field] = value;
      else if (existing[field] !== value) {
        note(
          "conflict",
          row.line,
          `${label}: ${title} önceki satırda ${String(existing[field])}, bu satırda ${String(value)}; ilki korundu.`,
        );
      }
    };
    merge("form", row.form, "form");
    merge("brandIntensity", row.intensity, "yoğunluk");
    merge("capsuleSystem", capsuleSystem, "kapsül sistemi");
  }

  for (const [device, labels] of capsuleInferences) {
    note(
      "inferred",
      null,
      `${device} yalnızca Nespresso Original kapsül alır; onunla demlenen ${labels.length} kapsül kahvenin sistemi nespresso_original olarak işaretlendi: ${labels.join("; ")}.`,
    );
  }

  const coffeeList = [...coffees.values()];
  for (let i = 0; i < coffeeList.length; i++) {
    for (let j = i + 1; j < coffeeList.length; j++) {
      const [a, b] = [coffeeList[i]!, coffeeList[j]!];
      if (a.brandSlug === b.brandSlug && looksAlike(a.name, b.name)) {
        note(
          "ambiguous",
          null,
          `"${a.name}" ve "${b.name}" (${a.brandSlug}) aynı kahve olabilir. Otomatik birleştirilmedi.`,
        );
      }
    }
  }
  for (const coffee of coffeeList) {
    const suggestion = suggestedCoffeeName(coffee.name);
    if (suggestion && suggestion !== coffee.name) {
      note(
        "suggestion",
        null,
        `Kahve adı: "${coffee.name}" → "${suggestion}" olabilir mi? (uygulanmadı)`,
      );
    }
  }

  // ── 4. tastings ───────────────────────────────────────────────────────────────────────
  const tastings: PlannedTasting[] = [];
  const seenRefs = new Map<string, number>();
  const wishlisted = new Set<string>();

  for (const row of rows) {
    const coffeeKey = `${row.brandSlug}/${row.coffeeSlug}`;
    const label = `${row.brandWritten} / ${row.coffeeName}`;
    // No score and no date: not tasted yet. A date without a score is a tasting left unrated.
    const status = row.score === null && !row.hadDate ? "wishlist" : "logged";

    if (status === "wishlist") {
      if (wishlisted.has(coffeeKey)) {
        note(
          "skipped",
          row.line,
          `${label}: "denenecek" listesinde zaten var; yinelenen satır atlandı.`,
        );
        continue;
      }
      wishlisted.add(coffeeKey);
      note("wishlist", row.line, `${label}`);
    } else {
      if (!row.hadScore) {
        note(
          "missing",
          row.line,
          `${label}: tarihi var ama puanı yok; puansız tadım olarak aktarıldı.`,
        );
      }
      if (!row.hadMethod) {
        note("missing", row.line, `${label}: demleme yöntemi (Select) boş; boş bırakıldı.`);
      }
    }

    const base = `${coffeeKey}@${row.tastedAt ?? "undated"}`;
    const occurrence = (seenRefs.get(base) ?? 0) + 1;
    seenRefs.set(base, occurrence);

    tastings.push({
      line: row.line,
      sourceRef: occurrence === 1 ? base : `${base}#${occurrence}`,
      coffeeKey,
      brewMethodSlug: row.method?.slug ?? null,
      device: row.method?.device ?? null,
      score: row.score,
      tastedAt: row.tastedAt,
      notes: row.notes,
      status,
    });
  }

  return { rowCount: records.length, brands, coffees: coffeeList, tastings, findings };
}
