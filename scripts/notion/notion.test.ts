import { readFileSync } from "node:fs";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, createUser, type TestDb } from "../lib/test-db";

import { applyImportPlan } from "./apply";
import { parseCsv, parseCsvRecords } from "./csv";
import { parseNotionDate } from "./dates";
import { parseNotionPage } from "./pages";
import { buildImportPlan, type ImportPlan, type Section } from "./plan";
import { renderReport } from "./report";

const HEADER = "Brand/Producer,Date,Intensity,Notes,Origin/All Name,Score,Select,Status";
const plan = (...rows: string[]) =>
  buildImportPlan(parseCsvRecords([HEADER, ...rows].join("\n")).records);
const messages = (result: ImportPlan, section: Section) =>
  result.findings.filter((finding) => finding.section === section).map((f) => f.message);

const fixture = readFileSync(new URL("./fixtures/sample-export.csv", import.meta.url), "utf8");

describe("parseCsv", () => {
  it("handles quotes, embedded commas, doubled quotes, line breaks and a BOM", () => {
    const text =
      String.fromCharCode(0xfeff) + 'a,b,c\r\n"x, y","say ""hi""","line 1\nline 2"\r\n,,\r\nlast,,';
    expect(parseCsv(text)).toEqual([
      ["a", "b", "c"],
      ["x, y", 'say "hi"', "line 1\nline 2"],
      ["", "", ""],
      ["last", "", ""],
    ]);
  });

  it("keeps line numbers and drops blank rows", () => {
    const { header, records } = parseCsvRecords("name,score\nA,1\n,\nB,2\n");
    expect(header).toEqual(["name", "score"]);
    expect(records).toEqual([
      { line: 2, values: { name: "A", score: "1" } },
      { line: 4, values: { name: "B", score: "2" } },
    ]);
  });

  it("refuses a file with an unclosed quote", () => {
    expect(() => parseCsv('a,"b')).toThrow(/tırnak/);
  });
});

describe("parseNotionDate", () => {
  it.each([
    ["July 8, 2025", "2025-07-08"],
    ["March 5, 2023", "2023-03-05"],
    ["Jul 8 2025", "2025-07-08"],
    ["July 8, 2025 3:00 PM", "2025-07-08"],
    ["July 8, 2025 → July 12, 2025", "2025-07-08"],
    ["8 July 2025", "2025-07-08"],
    ["8 Temmuz 2025", "2025-07-08"],
    ["17 Ağustos 2025", "2025-08-17"],
    ["3 ŞUBAT 2026", "2026-02-03"],
    ["2025-07-08", "2025-07-08"],
    ["2025-07-08T09:30:00.000Z", "2025-07-08"],
    ["2025/07/08", "2025-07-08"],
    ["25/03/2025", "2025-03-25"],
    ["03/25/2025", "2025-03-25"],
    ["05/05/2025", "2025-05-05"],
  ])("%s → %s", (input, expected) => {
    expect(parseNotionDate(input)).toEqual({ ok: true, date: expected });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["03/04/2025", "ambiguous"],
    ["February 30, 2025", "invalid"],
    ["Smarch 5, 2025", "unrecognized"],
    ["yesterday", "unrecognized"],
  ])("%s is %s, never guessed", (input, reason) => {
    expect(parseNotionDate(input)).toEqual({ ok: false, reason });
  });
});

describe("buildImportPlan", () => {
  it("merges known brand spellings and keeps the old ones as aliases", () => {
    const result = plan(
      'Jacob’s,"March 25, 2025",,,Selection,5,V60,Milled',
      'Jacobs,"July 12, 2025",6,,Classico Lungo,6,Nespresso C30,Capsule',
      'Starbuck,"March 7, 2026",,,House Blend,,,Milled',
      'Starbucks,"March 7, 2026",5,,Spring Season Blend,9,V60,Core',
      '"Nespresso ","July 7, 2025",6,,Colombia,8,Nespresso C30,Capsule',
      'Nespresso,"July 7, 2025",8,,İstanbul Espresso,7,Nespresso C30,Capsule',
    );
    expect(result.brands).toEqual([
      { slug: "jacobs", name: "Jacobs", aliases: ["Jacob’s"] },
      { slug: "starbucks", name: "Starbucks", aliases: ["Starbuck"] },
      { slug: "nespresso", name: "Nespresso", aliases: [] },
    ]);
    expect(messages(result, "merged")).toHaveLength(2);
  });

  it("reports look-alike brands instead of merging them", () => {
    const result = plan(
      'Lavazza,"July 7, 2025",,,Qualità Oro,7,V60,Milled',
      'Lavaza,"July 8, 2025",,,Crema e Gusto,6,V60,Milled',
    );
    expect(result.brands.map((brand) => brand.name)).toEqual(["Lavazza", "Lavaza"]);
    expect(messages(result, "ambiguous")).toEqual([
      '"Lavazza" ve "Lavaza" aynı marka olabilir. Otomatik birleştirilmedi.',
    ]);
  });

  it("maps form, brew method and device, and derives only what the rules allow", () => {
    const result = plan(
      'Nespresso,"July 7, 2025",6,,Colombia,8,Nespresso C30,Capsule',
      'Nespresso,"July 7, 2025",8,,İstanbul Espresso,7,Nespresso C30,Capsule',
      'Kronotrop,"October 10, 2026",,,Wilder Jungle,7,Wacaco NS2,Core',
      'Tchibo,"March 15, 2024",,,Privat Kaffee African Blue,8,Filter Coffee Machine,Core',
      'Starbucks,"March 7, 2026",5,,Spring Season Blend,9,V60,Core',
      "Starbucks,,7,,Single-Origin Colombia,,Nespresso C30,Capsule",
      'Mehmet Efendi,"April 25, 2025",,,Brazilian,7,V60,Milled',
    );
    const coffee = (slug: string) => result.coffees.find((c) => c.slug === slug);

    expect(coffee("colombia")).toMatchObject({
      form: "capsule",
      capsuleSystem: "nespresso_original",
      brandIntensity: 6,
      originCountry: "CO",
      isBlend: null,
    });
    // Istanbul is a product name, not a coffee origin.
    expect(coffee("istanbul-espresso")).toMatchObject({ originCountry: null });
    // Whole beans pulled through a capsule-compatible machine are still not capsules.
    expect(coffee("wilder-jungle")).toMatchObject({ form: "whole_bean", capsuleSystem: null });
    // "African" is a continent: no country is set.
    expect(coffee("privat-kaffee-african-blue")).toMatchObject({ originCountry: null });
    expect(coffee("spring-season-blend")).toMatchObject({ isBlend: true, originCountry: null });
    expect(coffee("single-origin-colombia")).toMatchObject({ isBlend: false, originCountry: "CO" });
    expect(coffee("brazilian")).toMatchObject({ form: "ground", originCountry: "BR" });

    expect(result.tastings.map((t) => [t.brewMethodSlug, t.device])).toEqual([
      ["kapsul-makinesi", "Nespresso C30"],
      ["kapsul-makinesi", "Nespresso C30"],
      ["tasinabilir-espresso", "Wacaco NS2"],
      ["filtre-kahve-makinesi", null],
      ["v60", null],
      ["kapsul-makinesi", "Nespresso C30"],
      ["v60", null],
    ]);
  });

  it("tells a wishlist entry from an unrated tasting", () => {
    const result = plan(
      "Jacobs,,8,,İntenso Lungo,,Nespresso C30,Capsule",
      'Starbuck,"March 7, 2026",,,House Blend,,,Milled',
      "Tchibo,,,,Privat Kaffee ,,,",
    );
    expect(result.tastings.map((t) => [t.status, t.score, t.tastedAt])).toEqual([
      ["wishlist", null, null],
      ["logged", null, "2026-03-07"],
      ["wishlist", null, null],
    ]);
    expect(result.coffees.at(-1)).toMatchObject({ name: "Privat Kaffee", form: null });
    expect(messages(result, "wishlist")).toHaveLength(2);
    expect(messages(result, "missing")).toEqual([
      "Tchibo / Privat Kaffee: form (Status) boş; boş bırakıldı.",
      "Starbuck / House Blend: tarihi var ama puanı yok; puansız tadım olarak aktarıldı.",
      "Starbuck / House Blend: demleme yöntemi (Select) boş; boş bırakıldı.",
    ]);
  });

  it("fixes confirmed typos and only suggests the rest", () => {
    const result = plan(
      'Starbucks,"October 12, 2025",,yumuşak bi kahve,Papua New Guıne,8,V60,Milled',
      'Starbucks,"July 8, 2025",5,,Creamy Vanilia,8,Nespresso C30,Capsule',
    );
    expect(result.coffees.map((c) => [c.name, c.slug, c.originCountry])).toEqual([
      ["Papua New Guinea", "papua-new-guinea", "PG"],
      ["Creamy Vanilia", "creamy-vanilia", null],
    ]);
    // The note itself is imported untouched.
    expect(result.tastings[0]!.notes).toBe("yumuşak bi kahve");
    expect(messages(result, "fixed")).toHaveLength(1);
    expect(messages(result, "suggestion")).toEqual([
      'Kahve adı: "Creamy Vanilia" → "Creamy Vanilla" olabilir mi? (uygulanmadı)',
      "Starbucks / Papua New Guinea:\n  - şimdi: yumuşak bi kahve\n  - öneri: yumuşak bir kahve",
    ]);
  });

  it("never invents a value for something it cannot read", () => {
    const result = plan(
      "Tchibo,03/04/2025,many,,Gold Selection,8.5,Syphon,Powder",
      ',"July 8, 2025",,,Nameless,7,V60,Milled',
    );
    expect(result.coffees).toEqual([
      expect.objectContaining({ name: "Gold Selection", form: null, brandIntensity: null }),
    ]);
    expect(result.tastings).toEqual([
      expect.objectContaining({
        score: null,
        tastedAt: null,
        brewMethodSlug: null,
        device: null,
        // It had a date we could not read, so it is not a wishlist entry.
        status: "logged",
      }),
    ]);
    expect(messages(result, "missing")).toEqual([
      'Tchibo / Gold Selection: tanınmayan form "Powder"; boş bırakıldı.',
      'Tchibo / Gold Selection: yoğunluk "many" sayı değil; boş bırakıldı.',
      'Tchibo / Gold Selection: tanınmayan demleme yöntemi "Syphon"; boş bırakıldı.',
      'Tchibo / Gold Selection: puan "8.5" 1–10 arası tam sayı değil; puansız aktarıldı.',
      'Tchibo / Gold Selection: "03/04/2025" (gün/ay sırası belirsiz); tarihsiz aktarıldı.',
    ]);
    expect(messages(result, "skipped")).toHaveLength(1);
  });

  it("gives every row a stable, unique source reference", () => {
    const rows = [
      'Nespresso,"July 7, 2025",6,first cup,Colombia,8,Nespresso C30,Capsule',
      'Nespresso,"July 7, 2025",6,second cup,Colombia,7,Nespresso C30,Capsule',
      'Nespresso,"July 9, 2025",6,,Colombia,8,Nespresso C30,Capsule',
      "Nespresso,,6,,Colombia,,Nespresso C30,Capsule",
      "Nespresso,,6,,Colombia,,Nespresso C30,Capsule",
    ];
    const result = plan(...rows);
    expect(result.tastings.map((t) => t.sourceRef)).toEqual([
      "nespresso/colombia@2025-07-07",
      "nespresso/colombia@2025-07-07#2",
      "nespresso/colombia@2025-07-09",
      "nespresso/colombia@undated",
    ]);
    expect(messages(result, "skipped")).toEqual([
      'Nespresso / Colombia: "denenecek" listesinde zaten var; yinelenen satır atlandı.',
    ]);
    // Editing a note or score in Notion must not change the reference.
    const edited = plan(rows[0]!.replace("first cup", "edited").replace(",8,", ",9,"));
    expect(edited.tastings[0]!.sourceRef).toBe("nespresso/colombia@2025-07-07");
  });

  it("reports the same coffee described two ways, keeping the first", () => {
    const result = plan(
      'Nespresso,"July 7, 2025",6,,Colombia,8,Nespresso C30,Capsule',
      'Nespresso,"July 9, 2025",7,,Colombia,8,V60,Milled',
    );
    expect(result.coffees).toHaveLength(1);
    expect(result.coffees[0]).toMatchObject({ form: "capsule", brandIntensity: 6 });
    expect(messages(result, "conflict")).toHaveLength(2);
  });

  it("appends text written inside the Notion page to the note", () => {
    const { records } = parseCsvRecords(
      [HEADER, 'Tchibo,"March 5, 2023",,Kısa not,Gold Selection,6,V60,Milled'].join("\n"),
    );
    const page = parseNotionPage(
      "# Gold Selection\n\nBrand/Producer: Tchibo\nDate: March 5, 2023\nScore: 6\n\nİkinci demlemede daha iyiydi.\n\n- 15 g / 250 ml\n",
      "Coffee Tasting/Gold Selection 1a2b.md",
    );
    expect(page).toMatchObject({
      title: "Gold Selection",
      properties: { "Brand/Producer": "Tchibo", Score: "6" },
    });
    const result = buildImportPlan(records, [page!]);
    expect(result.tastings[0]!.notes).toBe(
      "Kısa not\n\nİkinci demlemede daha iyiydi.\n\n- 15 g / 250 ml",
    );

    const other = parseNotionPage(
      "# Gold Selection\n\nBrand/Producer: Jacobs\n\nBaşka bir kahve.",
      "x.md",
    );
    expect(buildImportPlan(records, [other!]).tastings[0]!.notes).toBe("Kısa not");
  });

  it("plans the sample export as expected", () => {
    const result = buildImportPlan(parseCsvRecords(fixture).records);
    expect(result.rowCount).toBe(20);
    expect(result.brands.map((brand) => brand.name).sort()).toEqual([
      "Jacobs",
      "Kahve Dünyası",
      "Kronotrop",
      "Kurukahveci Mehmet Efendi",
      "Nescafe",
      "Nespresso",
      "Starbucks",
      "Tchibo",
    ]);
    expect(result.coffees).toHaveLength(20);
    expect(result.tastings.filter((t) => t.status === "wishlist")).toHaveLength(3);
    expect(messages(result, "skipped")).toEqual([]);
    expect(messages(result, "ambiguous")).toEqual([]);
  });
});

describe("applyImportPlan", () => {
  let db: TestDb;
  const samplePlan = buildImportPlan(parseCsvRecords(fixture).records);

  beforeAll(async () => {
    db = await createTestDb();
  });
  afterAll(async () => {
    await db?.close();
  });
  beforeEach(async () => {
    await db.begin();
    await createUser(db, { username: "owner_test", role: "admin" });
  });
  afterEach(async () => {
    await db.rollback();
  });

  const counts = async () =>
    (
      await db.sql(
        `select (select count(*)::int from public.brands) as brands,
                (select count(*)::int from public.coffees) as coffees,
                (select count(*)::int from public.tastings where status = 'logged') as logged,
                (select count(*)::int from public.tastings where status = 'wishlist') as wishlist`,
      )
    )[0];

  it("imports everything, assigned to the owner and public", async () => {
    const result = await applyImportPlan(db, samplePlan, { ownerUsername: "owner_test" });
    expect(result).toMatchObject({
      brands: { created: 8, existing: 0 },
      coffees: { created: 20, existing: 0 },
      tastings: { created: 17, existing: 0 },
      wishlist: { created: 3, existing: 0 },
      aliasesAdded: 2,
    });
    expect(await counts()).toEqual({ brands: 8, coffees: 20, logged: 17, wishlist: 3 });

    const [ristretto] = await db.as(null).sql(
      `select username, brand_name, form, brand_intensity, brew_method_slug, device, score,
                tasted_at::text as tasted_at, notes
           from public.tasting_feed where coffee_slug = 'ristretto-siyah-kapsul'`,
    );
    expect(ristretto).toEqual({
      username: "owner_test",
      brand_name: "Nespresso",
      form: "capsule",
      brand_intensity: 10,
      brew_method_slug: "kapsul-makinesi",
      device: "Nespresso C30",
      score: 9,
      tasted_at: "2025-07-07",
      notes: "Çok yoğun, kısa ve net.",
    });

    const sources = await db.sql(
      "select distinct source, visibility, source_ref is not null as has_ref from public.tastings",
    );
    expect(sources).toEqual([{ source: "notion_import", visibility: "public", has_ref: true }]);
    const [jacobs] = await db.sql("select name, aliases from public.brands where slug = 'jacobs'");
    expect(jacobs).toEqual({ name: "Jacobs", aliases: ["Jacob’s"] });
  });

  it("is idempotent: a second run adds nothing", async () => {
    await applyImportPlan(db, samplePlan, { ownerUsername: "owner_test" });
    const before = await counts();
    const again = await applyImportPlan(db, samplePlan, { ownerUsername: "owner_test" });

    expect(again).toMatchObject({
      brands: { created: 0, existing: 8 },
      coffees: { created: 0, existing: 20 },
      tastings: { created: 0, existing: 17 },
      wishlist: { created: 0, existing: 3 },
      aliasesAdded: 0,
      findings: [],
    });
    expect(await counts()).toEqual(before);
  });

  it("leaves edits made on the website alone and reports the difference", async () => {
    await applyImportPlan(db, samplePlan, { ownerUsername: "owner_test" });
    await db.sql(
      "update public.tastings set score = 10, notes = 'Web''de düzeltildi' where source_ref = 'nespresso/colombia@2025-07-07'",
    );
    await db.sql("update public.coffees set brand_intensity = 7 where slug = 'colombia'");

    const again = await applyImportPlan(db, samplePlan, { ownerUsername: "owner_test" });
    const [tasting] = await db.sql(
      "select score, notes from public.tastings where source_ref = 'nespresso/colombia@2025-07-07'",
    );
    expect(tasting).toEqual({ score: 10, notes: "Web'de düzeltildi" });
    expect(again.findings.map((finding) => finding.message)).toEqual([
      "Colombia: yoğunluk veritabanında 7, dosyada 6. Veritabanı değiştirilmedi.",
    ]);
  });

  it("adds only what is new when the export grows", async () => {
    await applyImportPlan(db, samplePlan, { ownerUsername: "owner_test" });
    const grown = buildImportPlan(
      parseCsvRecords(
        `${fixture.trimEnd()}\nStarbuck,"April 1, 2026",,Yeni satır,Pike Place,7,V60,Core\n`,
      ).records,
    );
    const result = await applyImportPlan(db, grown, { ownerUsername: "owner_test" });
    expect(result).toMatchObject({
      brands: { created: 0, existing: 8 },
      coffees: { created: 1, existing: 20 },
      tastings: { created: 1, existing: 17 },
    });
  });

  it("stops with a clear message when the owner profile does not exist", async () => {
    await expect(applyImportPlan(db, samplePlan, { ownerUsername: "nobody" })).rejects.toThrow(
      /admin:bootstrap/,
    );
  });

  it("renders a report with every section", async () => {
    const result = await applyImportPlan(db, samplePlan, { ownerUsername: "owner_test" });
    const report = renderReport(samplePlan, result, {
      generatedAt: new Date("2026-10-10T12:00:00Z"),
      target: "test",
      mode: "dry-run",
      file: "sample-export.csv",
      ownerUsername: "owner_test",
    });
    expect(report).toContain("| Kahve | 20 | 0 |");
    expect(report).toContain('- "Starbuck" → Starbucks (satır 17)');
    expect(report).toContain("## Denenecekler");
    expect(report).toContain(
      "- Satır 6: Tchibo / Privat Kaffee: form (Status) boş; boş bırakıldı.",
    );
    expect(report).toContain("DENEME (--dry-run)");
  });
});
