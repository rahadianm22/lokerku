export type JobStatus =
  | "saved"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "archived";

export type WorkMode = "remote" | "hybrid" | "onsite" | "unknown";
export type Priority = "low" | "med" | "high";

export interface Job {
  id: string;
  url: string;
  platform: string; // LinkedIn, Glints, JobStreet, dst.
  company: string;
  title: string;
  location: string;
  workMode: WorkMode;
  employmentType: string; // Full-time, Contract, dst.
  salary: string; // sudah diformat, mis. "IDR 15–20 jt / bln"
  seniority: string; // Junior / Mid / Senior / Lead
  postedAt: string | null; // ISO — tanggal loker diposting (dari sumber)
  deadline: string | null; // ISO — batas lamar (validThrough)
  description: string; // ringkasan pendek
  logo: string | null; // URL logo perusahaan / og:image
  status: JobStatus;
  priority: Priority;
  notes: string;
  addedAt: string; // ISO — jam kamu kirim link
  updatedAt: string;
  appliedAt: string | null;
}

/** Field yang bisa diambil otomatis dari link */
export type ExtractedJob = Pick<
  Job,
  | "url"
  | "platform"
  | "company"
  | "title"
  | "location"
  | "workMode"
  | "employmentType"
  | "salary"
  | "seniority"
  | "postedAt"
  | "deadline"
  | "description"
  | "logo"
>;

export type Confidence = "high" | "partial" | "none";

export interface ExtractResponse {
  ok: boolean;
  data: ExtractedJob;
  confidence: Confidence;
  source: "json-ld" | "meta" | "url-only";
  warnings: string[];
}

export const STATUS_META: Record<
  JobStatus,
  { label: string; dot: string; chip: string }
> = {
  saved: { label: "Disimpan", dot: "bg-slate-400", chip: "status-saved" },
  applied: { label: "Sudah Apply", dot: "bg-blue-500", chip: "status-applied" },
  interview: { label: "Interview", dot: "bg-amber-500", chip: "status-interview" },
  offer: { label: "Offer", dot: "bg-emerald-500", chip: "status-offer" },
  rejected: { label: "Ditolak", dot: "bg-rose-500", chip: "status-rejected" },
  archived: { label: "Arsip", dot: "bg-zinc-400", chip: "status-archived" },
};

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
  unknown: "—",
};
