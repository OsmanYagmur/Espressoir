/**
 * Notion's "Markdown & CSV" export also writes one .md file per database row:
 *
 *   # <title>
 *
 *   Brand/Producer: Tchibo
 *   Date: March 5, 2023
 *
 *   <free text written inside the page, if any>
 *
 * Only that free text is interesting here: the importer appends it to the tasting note.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { stripBom } from "./csv";

export interface NotionPage {
  /** Path relative to the export folder, for the report. */
  file: string;
  title: string;
  properties: Record<string, string>;
  body: string;
}

export function parseNotionPage(markdown: string, file: string): NotionPage | null {
  const lines = stripBom(markdown).split(/\r?\n/);
  const titleIndex = lines.findIndex((line) => line.trim() !== "");
  const title = /^#\s+(.*)$/.exec(lines[titleIndex] ?? "")?.[1]?.trim();
  if (!title) return null;

  let index = titleIndex + 1;
  while (index < lines.length && lines[index]!.trim() === "") index++;

  const properties: Record<string, string> = {};
  while (index < lines.length) {
    const property = /^([^:\n]{1,60}):\s?(.*)$/.exec(lines[index]!);
    if (!property) break;
    properties[property[1]!.trim()] = property[2]!.trim();
    index++;
  }

  return { file, title, properties, body: lines.slice(index).join("\n").trim() };
}

/** Reads every .md page under a folder (Notion nests them one level down). */
export function readNotionPages(folder: string): NotionPage[] {
  const pages: NotionPage[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (entry.endsWith(".md")) {
        const page = parseNotionPage(readFileSync(path, "utf8"), relative(folder, path));
        if (page) pages.push(page);
      }
    }
  };
  walk(folder);
  return pages;
}
