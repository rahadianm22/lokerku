import type { Job } from "./types";

const wib = (s: string) => Date.parse(`${s}+07:00`);

/** Data contoh §13 spesifikasi. Hanya dipakai di mode dev dan di pratinjau landing page (diberi label contoh). */
export const SEED: Job[] = [
  {
    id: "seed-1", company: "Xendit", title: "Senior Product Designer", platform: "Glints", level: "Senior",
    city: "Jakarta Selatan", mode: "Hybrid", type: "Full-time", salary: "Rp 25–32 jt", status: "interview",
    priority: "high", postedAt: "2026-10-18", deadline: "2026-10-25", notes: "",
    url: "https://glints.com/id/opportunities/jobs/senior-product-designer",
    createdAt: wib("2026-10-23T09:14:00"), updatedAt: wib("2026-10-23T09:14:00"),
  },
  {
    id: "seed-2", company: "Bank Jago", title: "Product Designer, Lending", platform: "LinkedIn", level: "Mid",
    city: "Jakarta Pusat", mode: "On-site", type: "Full-time", salary: "Rp 20–26 jt", status: "applied",
    priority: "med", postedAt: "2026-10-20", deadline: "2026-10-31", notes: "",
    url: "https://www.linkedin.com/jobs/view/4031870021",
    createdAt: wib("2026-10-22T20:41:00"), updatedAt: wib("2026-10-22T20:41:00"),
  },
  {
    id: "seed-3", company: "Mekari", title: "UX Designer, Design System", platform: "Kalibrr", level: "Mid",
    city: "Yogyakarta", mode: "Remote", type: "Kontrak", salary: "", status: "saved",
    priority: "high", postedAt: "2026-10-19", deadline: "2026-10-26", notes: "",
    url: "https://www.kalibrr.com/id-ID/c/mekari/jobs",
    createdAt: wib("2026-10-21T16:02:00"), updatedAt: wib("2026-10-21T16:02:00"),
  },
  {
    id: "seed-4", company: "Traveloka", title: "Lead Product Designer", platform: "JobStreet", level: "Lead",
    city: "Tangerang Selatan", mode: "Hybrid", type: "Full-time", salary: "Rp 38–45 jt", status: "offer",
    priority: "med", postedAt: "2026-10-10", deadline: null, notes: "",
    url: "https://www.jobstreet.co.id/id/job/lead-product-designer",
    createdAt: wib("2026-10-15T10:20:00"), updatedAt: wib("2026-10-15T10:20:00"),
  },
  {
    id: "seed-5", company: "Ruangguru", title: "Product Designer", platform: "Situs perusahaan", level: "Mid",
    city: "Jakarta Selatan", mode: "On-site", type: "Full-time", salary: "Rp 15–20 jt", status: "rejected",
    priority: "low", postedAt: "2026-10-01", deadline: "2026-10-12", notes: "",
    url: "https://www.ruangguru.com/careers",
    createdAt: wib("2026-10-09T13:45:00"), updatedAt: wib("2026-10-09T13:45:00"),
  },
];
