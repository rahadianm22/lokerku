import { detectPlatform } from "./platform";
import { JOB_TYPES, LEVELS, type Job, type JobType, type Level, type Status, type WorkMode } from "./types";

/** Kunci localStorage dari versi Lokerku sebelumnya (sebelum IndexedDB). */
export const LEGACY_KEY = "lokerku.jobs.v1";

type LegacyJob = {
  id?: string; url?: string; platform?: string; company?: string; title?: string; location?: string;
  workMode?: string; employmentType?: string; salary?: string; seniority?: string;
  postedAt?: string | null; deadline?: string | null; logo?: string | null;
  status?: string; priority?: string; notes?: string; addedAt?: string; updatedAt?: string;
};

const MODE: Record<string, WorkMode> = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };
const STATUS: Record<string, Status> = {
  saved: "saved", applied: "applied", interview: "interview", offer: "offer", rejected: "rejected", archived: "archive",
};

function ymdFromIso(v: string | null | undefined) {
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t + 7 * 3600_000).toISOString().slice(0, 10);
}

function mapType(v = ""): JobType {
  const t = v.toLowerCase();
  if (t.includes("kontrak") || t.includes("contract") || t.includes("sementara")) return "Kontrak";
  if (t.includes("part")) return "Part-time";
  if (t.includes("magang") || t.includes("intern")) return "Magang";
  if (t.includes("freelance")) return "Freelance";
  return JOB_TYPES[0];
}

function mapLevel(v = ""): Level {
  if (v === "Intern" || v === "Junior") return "Junior";
  if (v === "Principal" || v === "Lead") return "Lead";
  return (LEVELS as string[]).includes(v) ? (v as Level) : "Mid";
}

export function fromLegacy(list: unknown): Job[] {
  if (!Array.isArray(list)) return [];
  return (list as LegacyJob[])
    .filter((j) => j && typeof j.id === "string" && (j.company || j.title))
    .map((j) => {
      const created = Date.parse(j.addedAt ?? "") || Date.now();
      return {
        id: j.id!,
        url: j.url ?? "",
        company: j.company ?? "",
        title: j.title ?? "",
        city: j.location ?? "",
        platform: detectPlatform(j.url ?? "") ?? "Lainnya",
        mode: MODE[j.workMode ?? ""] ?? "Belum tahu",
        type: mapType(j.employmentType),
        level: mapLevel(j.seniority),
        salary: j.salary ?? "",
        postedAt: ymdFromIso(j.postedAt),
        deadline: ymdFromIso(j.deadline),
        status: STATUS[j.status ?? ""] ?? "saved",
        priority: j.priority === "high" || j.priority === "low" ? j.priority : "med",
        notes: j.notes ?? "",
        logoUrl: j.logo ?? undefined,
        createdAt: created,
        updatedAt: Date.parse(j.updatedAt ?? "") || created,
      } satisfies Job;
    });
}
