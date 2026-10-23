# Lokerku — Spesifikasi Implementasi (untuk Claude Code)

> **Lokerku.** — pengumpul loker pribadi. Satu pengguna, desktop-first tapi sepenuhnya responsif. Semua copy UI dalam **Bahasa Indonesia**.
>
> Referensi desain: canvas Lokerku (Claude Design) — 12 layar desktop/mobile + papan token & motion. Dokumen ini adalah sumber kebenaran untuk implementasi; kalau ada konflik, ikuti dokumen ini.

---

## 0. Cara kerja untuk Claude Code

1. Baca dokumen ini sampai habis sebelum menulis kode.
2. Kerjakan sesuai **Urutan Build** (§12). Commit per milestone.
3. Jangan menambah dependency di luar §1 tanpa alasan kuat.
4. Setiap milestone selesai → jalankan `pnpm lint && pnpm typecheck && pnpm test`.
5. Copy UI **harus persis** seperti di §10 (jangan diterjemahkan ke Inggris).

---

## 1. Stack

| Bagian | Pilihan |
|---|---|
| Framework | **Next.js 15** (App Router) + **TypeScript** strict |
| Styling | **Tailwind CSS v4** + CSS variables (token di §3) |
| Animasi | **motion** (`motion/react`, eks Framer Motion) |
| Font | `geist` package (`GeistSans`, `GeistMono`) |
| Penyimpanan | **IndexedDB via Dexie** (fallback localStorage) — data hanya di perangkat |
| Parsing HTML | `cheerio` (server-side, di route handler) |
| Validasi | `zod` |
| Ikon | `lucide-react` (stroke 1.75) |
| Test | `vitest` + `@testing-library/react`; Playwright untuk 1 smoke test E2E |
| Package manager | `pnpm` |
| Deploy | Vercel |

Tidak ada auth, tidak ada database server. Satu-satunya kode server adalah route ekstraksi (§7).

---

## 2. Struktur folder

```
app/
  layout.tsx            # font, ThemeProvider, <Toaster/>
  page.tsx              # halaman utama
  globals.css           # token CSS (§3) + keyframes
  api/extract/route.ts  # POST { url } → hasil ekstraksi (§7)
components/
  header.tsx            # eyebrow, wordmark, tombol Tambah, overflow menu
  stats-row.tsx         # 5 kartu + count-up
  toolbar.tsx           # filter pills, search, sort
  filter-pills.tsx      # shared indicator (layoutId)
  job-table.tsx         # desktop table
  job-card-list.tsx     # mobile stacked cards
  job-row.tsx
  status-chip.tsx       # chip + <select> tak terlihat
  deadline-badge.tsx
  company-avatar.tsx
  empty-state.tsx
  add-job/
    add-job-dialog.tsx  # modal (desktop) / bottom sheet (mobile)
    step-link.tsx
    step-loading.tsx
    step-review.tsx
    confidence-banner.tsx
    segmented.tsx       # shared indicator lime
  toast.tsx
lib/
  db.ts                 # Dexie schema + CRUD
  types.ts              # Job, Status, dll (§4)
  format.ts             # tanggal WIB, relatif, deadline (§5)
  platform.ts           # deteksi platform dari URL
  extract/              # parser per sumber (§7)
  csv.ts / backup.ts
hooks/
  use-jobs.ts           # liveQuery Dexie
  use-reduced-motion.ts
  use-hotkey.ts         # N dan /
```

---

## 3. Design tokens

Tulis sebagai CSS variables di `globals.css`, lalu map ke Tailwind via `@theme`. Mode gelap aktif dengan class `.dark` di `<html>` (default ikut `prefers-color-scheme`, bisa di-toggle; simpan preferensi di localStorage).

| Token | Terang | Gelap | Dipakai untuk |
|---|---|---|---|
| `bg` | `#F4F3EE` | `#11110E` | Latar halaman |
| `surface` | `#FFFFFF` | `#1A1A16` | Kartu, tabel, modal |
| `surface-2` | `#F9F8F4` | `#22221E` | Hover baris, footer modal, track kontrol |
| `ink` | `#17160F` | `#F2F1EA` | Teks utama, tombol primer, kartu Total |
| `ink-2` | `#3D3B33` | `#CFCDC3` | Label form, teks sekunder |
| `muted` | `#6B685D` | `#96938A` | Meta, placeholder, header tabel (≥ 4.5:1) |
| `line` | `#E7E5DD` | `#2A2A25` | Hairline border |
| `line-strong` | `#D3D0C5` | `#3B3B34` | Border input, tag platform |
| `accent` | `#C6F24E` | `#C6F24E` | Simpan, segmented aktif, flash baris baru |
| `accent-ink` | `#17160F` | `#17160F` | Teks di atas accent |
| `focus` | `#C6F24E` | `#C6F24E` | Ring fokus |
| `danger` | `#B93A26` | `#FF8A75` | Deadline ≤ 3 hari, hapus, gagal baca |
| `warn` | `#8F5B00` | `#F2B544` | Data sebagian |
| `radius` | `14px` | — | Kartu |
| `shadow-lg` | `0 24px 48px -16px rgba(23,22,15,.24), 0 2px 6px rgba(23,22,15,.06)` | `0 24px 60px -12px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04)` | Modal, menu, toast |

Token tambahan (internal):

```css
--radius-sm: 10px;           /* input, tombol */
--radius-modal: 18px;
--accent-hover: #B6E43A;
--danger-bg: #FBE7E2;  /* dark: rgba(255,120,98,.12) */
--warn-bg:   #FBF0D9;  /* dark: rgba(242,181,68,.12) */
--ok:        #1E6B36;  /* dark: #7EDB98 */
--ok-bg:     #E2F3E6;  /* dark: rgba(126,219,152,.12) */
--scrim: rgba(23,22,15,.34); /* dark: rgba(0,0,0,.58) */
--toast: #17160F;            /* dark: #2C2C27 */
--flash: rgba(198,242,78,.6);/* dark: rgba(198,242,78,.2) */
```

**Ring fokus** (`:focus-visible`, semua elemen interaktif):
`box-shadow: 0 0 0 1.5px var(--ink), 0 0 0 5px var(--focus);` — garis ink di dalam wajib, karena lime saja tidak terlihat di atas putih.
Input fokus: `border-color: var(--ink); box-shadow: 0 0 0 3px var(--focus);`

### Warna status

| Status | id | Terang bg / fg | Gelap bg / fg |
|---|---|---|---|
| Disimpan | `saved` | `#EFEEE8` / `#55524A` | `rgba(255,255,255,.07)` / `#C9C6BB` |
| Sudah Apply | `applied` | `#E4ECFB` / `#2050AE` | `rgba(120,160,255,.15)` / `#A9C3FF` |
| Interview | `interview` | `#FBEFD5` / `#875800` | `rgba(242,181,68,.14)` / `#F5C978` |
| Offer | `offer` | `#E0F2E4` / `#1D6A35` | `rgba(126,219,152,.14)` / `#8FE3A8` |
| Ditolak | `rejected` | `#FBE4DF` / `#A3301F` | `rgba(255,120,98,.14)` / `#FF9E8C` |
| Arsip | `archive` | transparan + border dashed `line-strong` / `#6B685D` | transparan / `#96938A` |

### Tipografi

| Peran | Spesifikasi |
|---|---|
| Wordmark "Lokerku." | Geist 64/600, letter-spacing −0.045em, line-height .95 (mobile 42). "ku." diberi stabilo lime: `linear-gradient(transparent 60%, accent 60% 90%, transparent 90%)`. Mode gelap: tanpa stabilo, "ku." berwarna lime. |
| Eyebrow | Geist Mono 11.5, uppercase, +0.08em, `muted` |
| Judul modal | Geist 21/600, −0.015em |
| Judul baris | Geist 14.5/600 |
| Body | Geist 14/400 |
| Angka statistik | Geist Mono 36/500, −0.03em, `tabular-nums` (mobile 30) |
| Gaji, tanggal, waktu | Geist Mono 12.5–13.5 |
| Header tabel | Geist Mono 11/500, uppercase, +0.06em, `muted` |

Aturan: **lime hanya** untuk tombol simpan, segmented aktif, flash baris baru, dan ring fokus. Tombol "Tambah loker" dan "Ambil data" memakai `ink`.

---

## 4. Model data

```ts
// lib/types.ts
export type Status = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected' | 'archive';
export type WorkMode = 'Remote' | 'Hybrid' | 'On-site' | 'Belum tahu';
export type JobType = 'Full-time' | 'Kontrak' | 'Part-time' | 'Freelance' | 'Magang';
export type Level = 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Manager';
export type Platform = 'LinkedIn' | 'JobStreet' | 'Glints' | 'Kalibrr' | 'Situs perusahaan' | 'Lainnya';
export type Priority = 'low' | 'med' | 'high';

export interface Job {
  id: string;            // nanoid / crypto.randomUUID()
  url: string;
  company: string;       // wajib
  title: string;         // wajib
  city: string;
  platform: Platform;
  mode: WorkMode;
  type: JobType;
  level: Level;
  salary: string;        // teks bebas, mis. "Rp 25–32 jt"; '' = tidak dicantumkan
  postedAt: string | null;   // 'YYYY-MM-DD'
  deadline: string | null;   // 'YYYY-MM-DD'
  status: Status;
  priority: Priority;
  notes: string;
  logoUrl?: string;      // dari og:image / JSON-LD bila ada
  createdAt: number;     // epoch ms — kolom "Dikirim"
  updatedAt: number;
}
```

Dexie: `db.version(1).stores({ jobs: 'id, createdAt, status, deadline, company' })`.
Default form baru: `platform` dari deteksi URL, `mode: 'Belum tahu'`, `type: 'Full-time'`, `level: 'Mid'`, `status: 'saved'`, `priority: 'med'`.

---

## 5. Format & logika turunan (`lib/format.ts`)

Semua waktu ditampilkan dalam **WIB (Asia/Jakarta)** pakai `Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta' })`. Bulan singkat: `Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des`.

- **Dikirim** (3 baris): `23 Okt, 09:14 WIB` (mono) · relatif · `Diposting 18 Okt` (atau `Tgl posting —`).
- **Relatif**: `< 1 mnt` → `Baru saja`; `< 60 mnt` → `{n} menit yang lalu`; `< 24 jam` → `{n} jam yang lalu`; kemarin (kalender) → `Kemarin`; `< 7 hari` → `{n} hari yang lalu`; selebihnya `{n} minggu yang lalu`. Update tiap 60 detik.
- **Deadline**: `diff = hari kalender (WIB) dari hari ini ke deadline`.
  - tidak ada → `—`
  - `diff < 0` → badge `Lewat` (muted, coret)
  - status `offer`/`rejected`/`archive` → tanpa badge
  - `diff = 0` → `Hari ini` (danger) · `1–3` → `{n} hari` (danger) · `> 3` → `{n} hari lagi` (muted, tanpa latar)
- **Stats**:
  - Total loker = semua
  - Masuk 7 hari = `createdAt >= now − 7 hari`
  - Sudah apply = status ≠ `saved` dan ≠ `archive` (sub: `{x}% dari semua loker`)
  - Interview = status `interview`
  - Deadline ≤ 3 hari = `0 ≤ diff ≤ 3` dan status belum tutup → kartu jadi **danger** bila > 0
- **Avatar**: `logoUrl` bila ada; kalau tidak, inisial huruf pertama perusahaan di atas tint yang dipilih dari hash nama (6 pasangan tint, versi terang & gelap).
- **Sort**: Terbaru (`createdAt` desc) · Deadline terdekat (asc, tanpa/lewat di akhir) · Prioritas (high→low, lalu terbaru) · Perusahaan A–Z (`localeCompare(_, 'id')`).
- **Search**: case-insensitive di company, title, city, platform.

Unit test wajib untuk semua fungsi di file ini.

---

## 6. Layar & komponen

### A. Halaman utama

Container `max-width: 1280px`, padding 40px (mobile 16px).

**Header** — kiri: eyebrow `pengumpul loker pribadi` + wordmark `Lokerku.`. Kanan: tombol ink `+ Tambah loker [N]` (44px) + icon button `⋯` (aria-label `Menu lainnya`) → menu: `Export CSV`, `Backup JSON`, separator, `Restore dari backup…`. Mobile: label jadi `Tambah`, kbd disembunyikan.

**Stats** — grid 5 kolom, gap 12, kartu radius 14, min-height 116: label (12.5 muted) · angka mono 36 · sub 12 muted. Total = kartu inverted (`ink` bg, `bg` teks). Mobile: grid 2 kolom, Total span 2.

**Toolbar** (di dalam kartu tabel, border-bottom) — filter pills dalam track `surface-2` (`Semua · Disimpan · Sudah Apply · Interview · Offer · Ditolak · Arsip`, masing-masing dengan count mono) + search (248px, ikon, placeholder `Cari perusahaan, posisi…`) + sort select. Mobile: pills scroll horizontal edge-to-edge, search + sort di baris bawahnya.

**Tabel desktop** — kolom & lebar: Perusahaan & posisi 30% · Status 13% · Lokasi 15% · Gaji 11% · Dikirim 14% · Deadline 9% · Aksi 120px. `min-width: 1080px` di dalam `overflow-x: auto`.
- Perusahaan & posisi: avatar 38 (radius 10) · judul 14.5/600 + flag merah bila `priority === 'high'` · baris meta `Perusahaan · [Platform tag] · Level`.
- Status: chip berwarna + chevron, `<select>` transparan menumpuk di atasnya (bisa ganti inline, aksesibel keyboard). Ganti → toast `Status diubah ke {Label}`.
- Lokasi: kota / `{mode} · {type}` muted.
- Gaji: mono; kosong → `Tidak dicantumkan` muted.
- Dikirim: lihat §5.
- Deadline: `25 Okt 2026` mono + badge.
- Aksi (opacity 0 → 1 saat hover/focus-within baris; selalu tampil di `hover: none`): buka link (target _blank), edit, hapus.

**Mobile cards** — avatar + judul + meta; baris chip status ↔ deadline; `<dl>` 3 kolom (Lokasi / Gaji / Dikirim); aksi `Buka link` + edit + hapus (44px).

**Empty state** — ikon link mengambang (tile 76px radius 22, titik lime kecil di pojok), judul `Belum ada loker tersimpan`, teks pendukung, CTA ink `+ Tambah loker pertama [N]`. Filter tanpa hasil: `Tidak ada loker yang cocok dengan filter ini.`

**Footer** — `Menampilkan {n} dari {total} loker` (mono) · `Data tersimpan di perangkat ini · Backup rutin lewat menu ⋯`.

**Hotkey**: `N` buka modal, `/` fokus ke search — abaikan bila fokus sedang di input/textarea/select atau modal terbuka.

### B. Modal tambah loker (3 langkah)

Pakai `Dialog` yang aksesibel (focus trap, `Esc` menutup, klik scrim menutup, `aria-modal`, kembalikan fokus ke tombol pemicu). Lebar 600px; melebar ke 780px di langkah Review (transisi max-width 320ms). Header: eyebrow `Tambah loker · Langkah {n} dari 3` + judul + indikator 3 dot (aktif melebar 22px) + tombol tutup. Footer `surface-2` dengan border-top.

**Mobile (< 760px) → bottom sheet**: lebar penuh, radius atas 22, handle 40×4, `max-height: calc(100dvh − 24px)`, form 1 kolom; dukung swipe-down untuk menutup.

**Langkah 1 — Link** (judul `Tempel link lowongan`)
- Label `Link lowongan`; field 62px (ikon link · input mono · tombol ghost `Tempel` pakai `navigator.clipboard.readText()`).
- Autofokus. Saat URL valid → chip hijau `{Platform} terdeteksi` (atau `Halaman karier perusahaan`).
- Helper: `Didukung: LinkedIn, JobStreet, Glints, Kalibrr, dan halaman karier perusahaan. Kalau halaman tidak terbaca, kamu tetap bisa isi manual.` + tag domain.
- Footer: link `Isi manual saja` (→ Review kosong, tanpa banner) · tombol ink `Ambil data →` (disabled bila kosong; `Enter` mengirim).
- Cek duplikat: kalau URL (dinormalisasi, tanpa query tracking) sudah ada → banner info `Loker ini sudah ada di tabel` + tombol `Lihat`.

**Langkah 2 — Memuat** (judul `Mengambil data…`)
- Skeleton preview card (avatar 44, 2 baris, 2 chip) + grid 2×2 skeleton field, shimmer.
- Spinner + teks bergantian: `Membuka halaman…` → `Mencari data lowongan…` → `Merapikan hasil…` (tiap ~900ms), plus daftar 3 langkah dengan centang.
- URL pendek mono di bawah. Footer: `Biasanya 2–5 detik` · tombol `Batal` (abort fetch → kembali ke langkah 1).
- Timeout 12 detik → lanjut ke Review dengan confidence `failed`.

**Langkah 3 — Review** (judul `Cek & rapikan data`; mode edit: judul = posisi, eyebrow `Edit loker`, tanpa dot)
- Preview card live: avatar, posisi (`Posisi belum diisi`), `{Perusahaan} · via {Platform} · {Kota}`, tag mode & tipe.
- Banner keyakinan:
  - `complete` (hijau): **Data lengkap terbaca** — `Semua kolom utama berhasil diambil. Cek sekali lagi, lalu simpan.`
  - `partial` (amber): **Sebagian data terbaca** — `{Gaji dan Deadline} tidak ditemukan di halaman. Lengkapi kalau kamu tahu — boleh juga dikosongkan.` (daftar kolom dinamis)
  - `failed` (merah): **Halaman tidak bisa dibaca** — `Mungkin perlu login atau situsnya membatasi akses. Isi data secara manual — link tetap disimpan.`
- Form 2 kolom: `Perusahaan*` · `Posisi*` · `Lokasi` · `Platform` (select) · `Mode kerja` (segmented penuh: Remote/Hybrid/On-site/Belum tahu) · `Tipe` · `Level` · `Gaji` (mono, placeholder `mis. Rp 15–20 jt`) · `Diposting` (date) · `Deadline` (date) · `Status` (select) · `Prioritas` (segmented: Rendah/Sedang/Tinggi) · `Catatan` (textarea, span 2).
- Kolom yang tidak terbaca: border dashed `warn` + latar `warn-bg` + hint `Tidak ditemukan di halaman`; hilang begitu diisi.
- Segmented: track `surface-2`, indikator lime meluncur (shared `layoutId`), teks aktif `accent-ink` 600.
- Footer: ghost `← Ganti link` (mode edit: `Batal`) · tombol **lime** `✓ Simpan ke tabel` (edit: `Simpan perubahan`), disabled bila Perusahaan/Posisi kosong. `Ctrl/⌘+Enter` menyimpan.

**Setelah simpan**: tutup modal → reset filter ke `Semua` bila status baru tidak cocok, kosongkan search, sort `Terbaru` → baris baru muncul paling atas dengan animasi + flash → toast `Loker disimpan ke tabel` + `Batalkan`.

### C. Toast

Pill gelap di tengah bawah (bottom 24px), min-height 44, ikon centang lime, teks `toast-ink`, tombol opsional `Batalkan` (teks lime di latar `rgba(255,255,255,.1)`). Auto-dismiss 5 detik, pause saat hover. `role="status"`, `aria-live="polite"`. Satu toast sekaligus (yang baru menggantikan).

Pesan: `Loker disimpan ke tabel` (+Batalkan) · `Perubahan disimpan` · `Loker dihapus` (+Batalkan) · `Status diubah ke {X}` · `{n} loker diekspor ke CSV` · `Backup JSON dibuat` · `{n} loker dipulihkan` (+Batalkan) · `File backup tidak dikenali`.

---

## 7. Ekstraksi data — `POST /api/extract`

Request `{ url: string }` (validasi zod: http/https). Response:

```ts
{
  confidence: 'complete' | 'partial' | 'failed';
  missing: Array<'company'|'title'|'city'|'salary'|'postedAt'|'deadline'>;
  data: Partial<Omit<Job, 'id'|'createdAt'|'updatedAt'|'status'|'priority'|'notes'>>;
}
```

Alur (runtime Node, `fetch` dengan User-Agent browser biasa, `Accept-Language: id-ID`, timeout 10 detik, maks 3 redirect, tolak IP privat/localhost untuk mencegah SSRF):

1. **JSON-LD `JobPosting`** (prioritas utama — dipakai JobStreet, Glints, Kalibrr, banyak situs karier/ATS):
   `title` → title · `hiringOrganization.name` → company · `hiringOrganization.logo` → logoUrl · `jobLocation.address.addressLocality/Region` → city · `jobLocationType === 'TELECOMMUTE'` → Remote · `employmentType` (FULL_TIME→Full-time, CONTRACTOR/TEMPORARY→Kontrak, PART_TIME, INTERN→Magang) · `datePosted` → postedAt · `validThrough` → deadline · `baseSalary` → format gaji.
2. **Open Graph / meta** (`og:title`, `og:site_name`, `og:image`, `<title>`) — pecah pola umum seperti `"{Posisi} at {Perusahaan}"`, `"{Posisi} - {Perusahaan} | JobStreet"`.
3. **Parser khusus per platform** di `lib/extract/{linkedin,jobstreet,glints,kalibrr}.ts` untuk sisanya (selector cheerio; tulis defensif, semua opsional).
4. **Heuristik teks**: mode kerja dari kata `remote|wfh|hybrid|on-site|onsite|wfo`; level dari judul (`senior|sr|lead|principal|manager|junior|jr|intern`).

Format gaji: `Rp {min}–{max} jt` (juta, tanpa desimal bila bulat), `Rp {x} jt` bila satu nilai; mata uang selain IDR tampilkan apa adanya (`USD 2.000–3.000`). Periode tahunan → konversi ke bulanan.

Confidence:
- `failed`: fetch gagal / status ≥ 400 / halaman login atau captcha / tidak ada title & company.
- `complete`: company, title, city ada, dan minimal salary **atau** deadline ada.
- `partial`: selain itu. `missing` = kolom kunci yang kosong.

Catatan: LinkedIn sering membatasi tanpa login — anggap wajar kalau hasilnya `partial`/`failed`; jangan coba melewati login. Cache hasil per URL di memori 10 menit. Simpan fixture HTML (anonim) di `lib/extract/__fixtures__/` dan tulis test parser terhadapnya.

---

## 8. Motion

Pakai `motion/react`. Semua durasi di bawah; **semua dimatikan** bila `prefers-reduced-motion: reduce` (`useReducedMotion()` → transisi instan, angka langsung final, tanpa geser).

| Elemen | Spesifikasi |
|---|---|
| Scrim | fade 220ms |
| Modal masuk | `y: 32, scale: .95, opacity: 0` → normal · spring (`stiffness 380, damping 30`) ≈ cubic-bezier(.2,.9,.25,1.14) 440ms |
| Bottom sheet | `y: '100%'` → 0 · 460ms cubic-bezier(.2,.9,.25,1.04) |
| Ganti langkah | slide horizontal ±36px + fade, 300ms cubic-bezier(.2,.8,.2,1); maju dari kanan, kembali dari kiri (`AnimatePresence` + `custom={direction}`) |
| Field review | stagger 30ms/field, masing-masing `y: 8` + fade 360ms |
| Filter pills & segmented | satu indikator bersama (`layoutId`), 300ms cubic-bezier(.3,.7,.2,1) |
| Angka statistik | count-up 0 → nilai, 750ms ease-out cubic, saat mount dan saat nilai berubah |
| Baris baru | `y: -16` → 0 (380ms) + latar `--flash` memudar ke transparan dalam 2.2s |
| Baris dihapus | `x: 56, opacity: 0` 280ms ease-in, lalu tinggi collapse (`layout`) |
| Empty state | ikon float `y: 0 ↔ -9`, rotate −5° ↔ −1°, 4s loop |
| Shimmer skeleton | gradient bergerak 1.4s linear loop |
| Teks loading | tiap pergantian `y: 6` + fade 300ms |
| Menu & chip terdeteksi | scale .96 + fade 160–200ms |
| Toast | `y: 18, scale: .95` → normal, spring, 340ms |

---

## 9. Aksesibilitas (wajib)

- Semua kontrol adalah elemen asli (`button`, `a`, `input`, `select`, `label`). Tidak ada `onClick` di `div`.
- Icon-only button punya `aria-label` (`Menu lainnya`, `Buka link lowongan`, `Edit loker`, `Hapus loker`, `Tutup`).
- Pills & segmented: `aria-pressed`. Group diberi `aria-label`/`aria-labelledby`.
- Select status di chip: `aria-label="Ubah status {posisi}"`.
- Kontras teks ≥ 4.5:1 di kedua mode (token sudah dicek); target sentuh ≥ 44px di mobile.
- Tabel pakai `<table>`, `<th scope="col">`, kolom aksi dengan label `sr-only`.
- Live region untuk teks loading dan toast.

---

## 10. Copy UI (persis)

| Lokasi | Teks |
|---|---|
| Eyebrow header | `pengumpul loker pribadi` |
| Wordmark | `Lokerku.` |
| Tombol utama | `Tambah loker` + kbd `N` |
| Menu | `Export CSV` · `Backup JSON` · `Restore dari backup…` |
| Stats | `Total loker` · `Masuk 7 hari` · `Sudah apply` · `Interview` · `Deadline ≤ 3 hari` |
| Sub stats | `tersimpan di Lokerku` · `loker baru minggu ini` / `belum ada yang baru` · `{x}% dari semua loker` / `belum ada` · `sedang berjalan` / `belum ada jadwal` · `segera kirim lamaran` / `aman untuk sekarang` |
| Pills | `Semua` `Disimpan` `Sudah Apply` `Interview` `Offer` `Ditolak` `Arsip` |
| Sort | `Terbaru` · `Deadline terdekat` · `Prioritas` · `Perusahaan A–Z` |
| Header tabel | `Perusahaan & posisi` `Status` `Lokasi` `Gaji` `Dikirim` `Deadline` |
| Empty | `Belum ada loker tersimpan` / `Tempel link lowongan dari LinkedIn, JobStreet, Glints, Kalibrr, atau situs karier perusahaan — Lokerku yang merapikan datanya.` / `Tambah loker pertama` |
| Modal 1 | `Tempel link lowongan` · `Link lowongan` · `Tempel` · `Isi manual saja` · `Ambil data` |
| Modal 2 | `Mengambil data…` · `Membuka halaman…` · `Mencari data lowongan…` · `Merapikan hasil…` · `Biasanya 2–5 detik` · `Batal` |
| Modal 3 | `Cek & rapikan data` · `← Ganti link` · `Simpan ke tabel` · `Tidak ditemukan di halaman` |
| Prioritas | `Rendah` · `Sedang` · `Tinggi` |

---

## 11. Export / Backup / Restore

- **Export CSV** (`lokerku-YYYY-MM-DD.csv`, UTF-8 dengan BOM agar Excel aman): Perusahaan, Posisi, Status (label), Lokasi, Mode, Tipe, Level, Platform, Gaji, Diposting, Deadline, Prioritas, Link, Catatan, Dikirim (ISO WIB). Escape `"`, koma, newline.
- **Backup JSON** (`lokerku-backup-YYYY-MM-DD.json`): `{ app: 'lokerku', version: 1, exportedAt, jobs: Job[] }`.
- **Restore**: file input `.json` → validasi zod → konfirmasi `Ganti {n} loker yang ada dengan {m} loker dari backup?` → replace semua → toast + `Batalkan` (simpan snapshot sebelumnya di memori).

---

## 12. Urutan build

1. **Fondasi** — scaffold Next.js + Tailwind v4 + font Geist; token di `globals.css` (terang/gelap); toggle tema; util `cn`.
2. **Data** — `types.ts`, Dexie `db.ts`, `use-jobs`, `format.ts` + unit test; seed 5 data contoh di mode dev (lihat §13).
3. **Halaman utama statis** — header, stats, toolbar, tabel, mobile cards, empty state, footer. Responsif di 1280 dan 390.
4. **Interaksi tabel** — filter, search, sort, ganti status inline, edit, hapus + undo, toast, hotkey.
5. **Modal 3 langkah** — UI dengan data mock dulu (deteksi platform → confidence mock), lalu bottom sheet mobile.
6. **Ekstraksi** — `/api/extract` + parser + fixture test; sambungkan ke langkah 2/3.
7. **Motion** — semua di §8 + reduced motion.
8. **Export/backup/restore**.
9. **QA** — a11y (axe), Lighthouse ≥ 95 untuk a11y/best practices, smoke test Playwright: tambah loker manual → muncul di tabel → hapus → batalkan.

---

## 13. Data contoh (seed dev, "hari ini" = 23 Okt 2026)

| Perusahaan | Posisi | Platform | Level | Lokasi / mode / tipe | Gaji | Status | Prioritas | Dikirim (WIB) | Diposting | Deadline |
|---|---|---|---|---|---|---|---|---|---|---|
| Xendit | Senior Product Designer | Glints | Senior | Jakarta Selatan · Hybrid · Full-time | Rp 25–32 jt | interview | high | 23 Okt 09:14 | 18 Okt | 25 Okt |
| Bank Jago | Product Designer, Lending | LinkedIn | Mid | Jakarta Pusat · On-site · Full-time | Rp 20–26 jt | applied | med | 22 Okt 20:41 | 20 Okt | 31 Okt |
| Mekari | UX Designer — Design System | Kalibrr | Mid | Yogyakarta · Remote · Kontrak | — | saved | high | 21 Okt 16:02 | 19 Okt | 26 Okt |
| Traveloka | Lead Product Designer | JobStreet | Lead | Tangerang Selatan · Hybrid · Full-time | Rp 38–45 jt | offer | med | 15 Okt 10:20 | 10 Okt | — |
| Ruangguru | Product Designer | Situs perusahaan | Mid | Jakarta Selatan · On-site · Full-time | Rp 15–20 jt | rejected | low | 9 Okt 13:45 | 1 Okt | 12 Okt |

Hasil yang diharapkan: Total 5 · Masuk 7 hari 3 · Sudah apply 4 · Interview 1 · Deadline ≤ 3 hari **2** (danger).

---

## 14. Definition of Done

- [ ] Semua layar di canvas tersedia di 1280 dan 390, terang & gelap.
- [ ] Alur tambah → ambil data → review → simpan → baris muncul di atas dengan flash.
- [ ] Confidence hijau/amber/merah tampil sesuai hasil ekstraksi; kolom kosong ditandai.
- [ ] Ganti status inline, edit, hapus + undo, filter/search/sort berjalan.
- [ ] Data bertahan setelah reload (IndexedDB); export CSV, backup & restore JSON berfungsi.
- [ ] Motion sesuai §8; reduced motion dihormati.
- [ ] Tidak ada error a11y kritis; navigasi penuh dengan keyboard.
- [ ] `pnpm lint`, `typecheck`, `test` hijau; build Vercel sukses.
