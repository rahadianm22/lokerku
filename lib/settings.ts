import { z } from "zod";
import { PRIORITIES, STATUSES, type Priority, type Status } from "./types";

export interface Settings {
  /** Tempel link → data diambil → langsung disimpan, tanpa langkah "Cek & rapikan data". */
  autoSave: boolean;
  defaultStatus: Status;
  defaultPriority: Priority;
}

export const DEFAULT_SETTINGS: Settings = { autoSave: false, defaultStatus: "saved", defaultPriority: "med" };

const schema = z.object({
  autoSave: z.boolean().catch(DEFAULT_SETTINGS.autoSave),
  defaultStatus: z.enum(STATUSES).catch(DEFAULT_SETTINGS.defaultStatus),
  defaultPriority: z.enum(PRIORITIES).catch(DEFAULT_SETTINGS.defaultPriority),
});

/** Baca pengaturan tersimpan (string JSON). Nilai rusak atau hilang kembali ke bawaan, kolom per kolom. */
export function parseSettings(raw: unknown): Settings {
  let v: unknown = raw;
  if (typeof raw === "string") {
    try {
      v = JSON.parse(raw);
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  const r = schema.safeParse(v && typeof v === "object" ? v : {});
  return r.success ? r.data : DEFAULT_SETTINGS;
}
