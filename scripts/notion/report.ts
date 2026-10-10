import type { ApplyResult } from "./apply";
import type { Finding, ImportPlan, Section } from "./plan";

const SECTIONS: ReadonlyArray<readonly [Section, title: string, intro: string]> = [
  ["merged", "Birleştirilen markalar", "Aynı markanın farklı yazımları tek markada toplandı."],
  [
    "fixed",
    "Yazım düzeltmeleri",
    "Senin onayladığın düzeltmeler: kahve adları ve notlardaki kelimeler (scripts/notion/rules.ts).",
  ],
  [
    "inferred",
    "Çıkarımlar",
    "Dosyada yazmayan ama kurallardan türetilen değerler. Yanlış olan varsa söyle, kuralı kaldırayım.",
  ],
  ["missing", "Eksik veya okunamayan değerler", "Bu alanlar boş bırakıldı; değer uydurulmadı."],
  ["conflict", "Çakışmalar", "Aynı kahve için birbirini tutmayan bilgiler."],
  ["ambiguous", "Belirsiz eşleşmeler", "Benzer görünen ama otomatik birleştirilmeyen kayıtlar."],
  [
    "wishlist",
    "Denenecekler",
    "Puanı da tarihi de olmayan satırlar tadım değil, “denenecek” olarak aktarıldı.",
  ],
  ["skipped", "Atlanan satırlar", "Bu satırlar içe aktarılmadı."],
  [
    "suggestion",
    "Emin olunamayan adlar",
    "Yazım hatası olabilir ama doğrulanmadı; yazdığın gibi aktarıldı.",
  ],
];

export interface ReportContext {
  generatedAt: Date;
  target: string;
  mode: "dry-run" | "applied" | "offline";
  file: string;
  ownerUsername: string;
}

const MODES: Record<ReportContext["mode"], string> = {
  "dry-run": "DENEME (--dry-run): veritabanına hiçbir şey yazılmadı",
  applied: "UYGULANDI",
  offline: "ÇEVRİMDIŞI ÖNİZLEME (--offline): boş, geçici bir veritabanında denendi",
};

function item(finding: Finding): string {
  return finding.line === null
    ? `- ${finding.message}`
    : `- Satır ${finding.line}: ${finding.message}`;
}

export function renderReport(
  plan: ImportPlan,
  result: ApplyResult,
  context: ReportContext,
): string {
  const findings = [...plan.findings, ...result.findings];
  const skipped = findings.filter((finding) => finding.section === "skipped").length;
  const timestamp = context.generatedAt.toISOString().slice(0, 16).replace("T", " ");

  const lines = [
    "# Notion import raporu",
    "",
    `- Tarih: ${timestamp} UTC`,
    `- Hedef: ${context.target}`,
    `- Mod: ${MODES[context.mode]}`,
    `- Dosya: ${context.file} (${plan.rowCount} satır)`,
    `- Kayıtların sahibi: @${context.ownerUsername}`,
    "",
    "## Özet",
    "",
    "| | Yeni eklendi | Zaten vardı |",
    "| --- | ---: | ---: |",
    `| Marka | ${result.brands.created} | ${result.brands.existing} |`,
    `| Kahve | ${result.coffees.created} | ${result.coffees.existing} |`,
    `| Tadım | ${result.tastings.created} | ${result.tastings.existing} |`,
    `| Denenecek | ${result.wishlist.created} | ${result.wishlist.existing} |`,
    "",
    `Atlanan satır: ${skipped}. Markalara eklenen eski yazım (alias): ${result.aliasesAdded}.`,
    "",
  ];

  for (const [section, title, intro] of SECTIONS) {
    const items = findings.filter((finding) => finding.section === section);
    lines.push(`## ${title}`, "");
    if (items.length === 0) lines.push("Yok.", "");
    else lines.push(intro, "", ...items.map(item), "");
  }

  return lines.join("\n");
}

/** The few lines printed to the terminal after a run. */
export function renderSummary(result: ApplyResult, plan: ImportPlan): string {
  const row = (label: string, tally: { created: number; existing: number }) =>
    `  ${label.padEnd(10)} ${String(tally.created).padStart(3)} yeni, ${String(tally.existing).padStart(3)} zaten vardı`;
  const count = (section: Section) =>
    plan.findings.concat(result.findings).filter((finding) => finding.section === section).length;
  return [
    row("Marka", result.brands),
    row("Kahve", result.coffees),
    row("Tadım", result.tastings),
    row("Denenecek", result.wishlist),
    `  Atlanan satır: ${count("skipped")} · eksik değer: ${count("missing")} · belirsiz eşleşme: ${count("ambiguous")}`,
  ].join("\n");
}
