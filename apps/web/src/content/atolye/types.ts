import type { PhotoId } from "../photos";

/** What a workshop page says about its program; the date, seats and price are the database's. */
export interface WorkshopProgram {
  /** The name the admin panel lists it under. */
  name: string;
  /** The one sentence under the title. */
  lead: string;
  /** The cover (content/photos.ts); without one the page shows a plain crema band. */
  photo?: PhotoId;
  /** Who it is for. */
  audience: string;
  /** "Ne yapacağız?": the steps in order, each with its length in minutes. */
  steps: readonly { title: string; minutes: number; body: string }[];
  /** "Yanında getir". */
  bring: readonly string[];
  /** "Biz hazırlıyoruz". */
  provided: readonly string[];
  /** "Sık sorulanlar"; the page adds the price question from the workshop itself. */
  faq: readonly { question: string; answer: string }[];
}
