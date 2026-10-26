import { z } from "zod";
import { JOB_TYPES, LEVELS, MODES, PLATFORMS, PRIORITIES, STATUSES, type Job } from "./types";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const text = (max: number) => z.string().max(max);

export const jobSchema = z.object({
  id: z.string().min(1).max(64),
  url: text(2048),
  company: text(200),
  title: text(300),
  city: text(200),
  platform: z.enum(PLATFORMS),
  mode: z.enum(MODES),
  type: z.enum(JOB_TYPES),
  level: z.enum(LEVELS),
  salary: text(120),
  postedAt: ymd,
  deadline: ymd,
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  notes: text(5000),
  logoUrl: text(2048).optional(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  deletedAt: z.number().int().nonnegative().nullable().optional(),
  history: z.array(z.object({ status: z.enum(STATUSES), at: z.number().int().nonnegative() })).max(100).optional(),
}) satisfies z.ZodType<Job>;

export const MAX_JOBS = 5000;

export const backupSchema = z.object({
  app: z.literal("lokerku"),
  version: z.literal(1),
  exportedAt: z.union([z.string(), z.number()]).optional(),
  jobs: z.array(jobSchema).max(MAX_JOBS),
});

export const syncRequestSchema = z.object({
  spreadsheetId: z.string().regex(/^[\w-]{10,128}$/).nullable().optional(),
  /** Minta pemeriksaan lengkap file di Drive (terhapus? tab diganti nama?). Klien mengirimnya sekali sehari. */
  verify: z.boolean().optional(),
  jobs: z.array(jobSchema).max(MAX_JOBS),
});
