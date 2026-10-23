# Lokerku — pengumpul loker pribadi

Tempel link lowongan → data diambil otomatis → tersimpan di tabel.

## Jalankan

```bash
npm install
npm run dev        # http://localhost:3000
```

Shortcut: tekan **N** atau **Ctrl/⌘ + K** untuk buka modal tambah loker.
Tempel link langsung di input → ekstraksi jalan otomatis.

## Struktur

```
lokerku/
├── app/
│   ├── api/extract/route.ts   # POST { url } → data loker (server, anti-SSRF)
│   ├── globals.css            # design tokens (warna, radius, shadow) + keyframes
│   ├── layout.tsx
│   └── page.tsx               # halaman utama: state, filter, sort, shortcut
├── components/
│   ├── AddJobModal.tsx        # modal 3 tahap: link → loading → review/edit
│   ├── JobTable.tsx           # tabel (desktop) + kartu (mobile), animasi baris
│   ├── StatsBar.tsx           # 5 kartu statistik + angka beranimasi
│   ├── Toolbar.tsx            # filter status (pill animasi), cari, urutkan
│   ├── Header.tsx             # judul, tombol tambah, menu export/backup
│   ├── Toast.tsx              # notifikasi + "Batalkan" saat hapus
│   ├── EmptyState.tsx, CompanyAvatar.tsx, AnimatedNumber.tsx, Providers.tsx
├── lib/
│   ├── extract.ts             # parser: JSON-LD JobPosting → fallback OpenGraph/title
│   ├── platform.ts            # deteksi LinkedIn/JobStreet/Glints/Kalibrr/…
│   ├── useJobs.ts             # penyimpanan (localStorage) — ganti di sini kalau mau DB
│   ├── types.ts, format.ts, export.ts
└── scripts/test-parser.ts     # npx tsx scripts/test-parser.ts
```

## Kolom yang tersimpan

| Field | Sumber |
|---|---|
| Perusahaan, Posisi, Logo | JSON-LD `hiringOrganization` / `og:title` |
| Lokasi, Mode kerja (Remote/Hybrid/On-site) | `jobLocation`, `jobLocationType`, teks deskripsi |
| Tipe kerja, Gaji | `employmentType`, `baseSalary` |
| Level (Intern…Lead) | dideteksi dari judul |
| Tanggal posting, Deadline | `datePosted`, `validThrough` |
| **Dikirim** (jam kamu tempel link) | otomatis saat simpan (WIB) |
| Platform | dari domain link |
| Status, Prioritas, Catatan, Tanggal apply | diisi kamu |

## Catatan

- **LinkedIn / beberapa situs** kadang minta login atau memblokir server → modal
  otomatis pindah ke mode isi manual (link tetap tersimpan).
- Data disimpan di **localStorage** browser. Backup/restore lewat menu ⋯.
  Mau sync HP–laptop? Ganti isi `lib/useJobs.ts` dengan Supabase/Turso; komponen lain tidak berubah.
- Deploy: `vercel` — tidak butuh env var.
- Ganti tampilan: ubah token di `app/globals.css` (`:root` dan blok dark mode).
