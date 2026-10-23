import { kahveyeGiris } from "./kahveye-giris";
import type { WorkshopProgram } from "./types";

export type { WorkshopProgram } from "./types";

/**
 * Every workshop program, by the key a workshop row names in `program`. A new kind of
 * workshop is a new file here and one line below; the admin panel then offers it.
 */
export const WORKSHOP_PROGRAMS: Readonly<Record<string, WorkshopProgram>> = {
  "kahveye-giris": kahveyeGiris,
};

export const programOf = (key: string): WorkshopProgram | null => WORKSHOP_PROGRAMS[key] ?? null;
