export type Status = "saved" | "applied" | "interview" | "offer" | "rejected" | "archive";
export type WorkMode = "Remote" | "Hybrid" | "On-site" | "Belum tahu";
export type JobType = "Full-time" | "Kontrak" | "Part-time" | "Freelance" | "Magang";
export type Level = "Junior" | "Mid" | "Senior" | "Lead" | "Manager";
/** Urutan = urutan di pilihan Platform. Papan lowongan besar dulu, lalu situs perusahaan, lalu sisanya. */
export const PLATFORMS = [
  "LinkedIn", "JobStreet", "Glints", "Kalibrr", "Indeed", "Dealls", "KitaLulus", "Karir.com", "TopKarir",
  "Glassdoor", "Tech in Asia", "Wellfound", "Instagram", "Threads", "X", "Situs perusahaan", "Lainnya",
] as const;
export type Platform = (typeof PLATFORMS)[number];
export type Priority = "low" | "med" | "high";

export interface Job {
  id: string;
  url: string;
  company: string;
  title: string;
  city: string;
  platform: Platform;
  mode: WorkMode;
  type: JobType;
  level: Level;
  salary: string;
  postedAt: string | null; // 'YYYY-MM-DD'
  deadline: string | null; // 'YYYY-MM-DD'
  status: Status;
  priority: Priority;
  notes: string;
  logoUrl?: string;
  createdAt: number; // epoch ms, kolom "Dikirim"
  updatedAt: number;
  /** Tombstone untuk sinkron: loker yang dihapus tetap disimpan sebentar supaya perangkat lain ikut menghapus. */
  deletedAt?: number | null;
  /** Perpindahan status, terlama dulu. Loker lama mungkin belum punya. */
  history?: StatusEvent[];
}

export interface StatusEvent {
  status: Status;
  at: number;
}

export type Draft =Omit<Job, "id" | "createdAt" | "updatedAt" | "deletedAt">;

export type Confidence = "complete" | "partial" | "failed";
export type MissingField = "company" | "title" | "city" | "salary" | "postedAt" | "deadline";

export interface ExtractResult {
  confidence: Confidence;
  missing: MissingField[];
  /**
   * "login-required": isi postingan hanya tampil setelah login (Instagram, X).
   * "blocked": situs menolak permintaan dari server Lokerku (kode 403/429, tantangan Cloudflare, dll.).
   */
  note?: "login-required" | "blocked";
  /** Kode HTTP dari situs asal, kalau ada. Ditampilkan supaya penyebab kegagalan tidak misterius. */
  httpStatus?: number;
  data: Partial<Omit<Job, "id" | "createdAt" | "updatedAt" | "status" | "priority" | "notes">>;
}

export const STATUSES: Status[] = ["saved", "applied", "interview", "offer", "rejected", "archive"];
export const STATUS_LABEL: Record<Status, string> = {
  saved: "Disimpan",
  applied: "Sudah Apply",
  interview: "Interview",
  offer: "Offer",
  rejected: "Ditolak",
  archive: "Arsip",
};

export const MODES: WorkMode[] = ["Remote", "Hybrid", "On-site", "Belum tahu"];
export const JOB_TYPES: JobType[] = ["Full-time", "Kontrak", "Part-time", "Freelance", "Magang"];
export const LEVELS: Level[] = ["Junior", "Mid", "Senior", "Lead", "Manager"];
export const PRIORITIES: Priority[] = ["low", "med", "high"];
export const PRIORITY_LABEL: Record<Priority, string> = { low: "Rendah", med: "Sedang", high: "Tinggi" };

export const FIELD_LABEL: Record<MissingField, string> = {
  company: "Perusahaan",
  title: "Posisi",
  city: "Lokasi",
  salary: "Gaji",
  postedAt: "Tanggal posting",
  deadline: "Deadline",
};

/** Status yang dianggap sudah selesai: tidak perlu diingatkan soal deadline. */
export const isClosed = (s: Status) => s === "offer" || s === "rejected" || s === "archive";
