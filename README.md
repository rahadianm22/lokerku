# Lokerku

Pengumpul loker pribadi. Tempel link lowongan, Lokerku mengambil datanya, kamu cek, lalu tersimpan di tabel.
Kalau pengguna masuk dengan Google, datanya disinkronkan ke spreadsheet **Lokerku** di Google Drive milik mereka sendiri.

- `/` landing page publik
- `/app` tabel loker (bisa dipakai tanpa login = mode tamu)
- `/privasi` kebijakan privasi (wajib untuk layar persetujuan OAuth Google)

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi kalau mau login Google; kosong = mode tamu saja
npm run dev                  # http://localhost:3000
```

Di mode dev, database tamu diisi 5 data contoh sekali (spesifikasi §13).

```bash
npm run lint && npm run typecheck && npm test   # unit test (vitest)
npx playwright test                             # smoke test E2E (desktop 1280 + mobile 390)
```

## Menyiapkan login Google

1. Buka [Google Cloud Console](https://console.cloud.google.com/) dan buat project baru.
2. **APIs & Services → Library**: aktifkan **Google Drive API** dan **Google Sheets API**.
3. **APIs & Services → OAuth consent screen** (Google Auth Platform):
   - User type: **External**.
   - Isi nama aplikasi, email dukungan, domain, dan link kebijakan privasi (`https://domainmu/privasi`).
   - **Data access / Scopes**: tambahkan `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`, dan
     `https://www.googleapis.com/auth/drive.file`. Ketiganya termasuk scope non-sensitif.
   - Selama status **Testing**, hanya akun yang didaftarkan di *Test users* yang bisa masuk. Untuk dibagikan ke publik,
     tekan **Publish app**. Google mungkin meminta verifikasi branding (logo, domain) sebelum nama aplikasimu tampil di layar login.
4. **Credentials → Create credentials → OAuth client ID → Web application**:
   - Authorized JavaScript origins: `http://localhost:3000` dan `https://domainmu`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` dan `https://domainmu/api/auth/callback/google`
5. Salin Client ID dan Client secret ke `.env.local`, isi `NEXTAUTH_SECRET` (`openssl rand -base64 32`) dan `NEXTAUTH_URL`.

Di Vercel, isi empat variabel yang sama di **Project → Settings → Environment Variables**.

## Cara sinkron bekerja

- Semua perubahan ditulis dulu ke IndexedDB (Dexie), jadi UI tetap cepat dan bisa dipakai offline.
- 1,2 detik setelah perubahan, saat tab kembali aktif, saat online lagi, dan tiap 2 menit, klien mengirim salinan lokal ke
  `POST /api/sync`. Server membaca Sheet, menggabungkan per loker (yang `Diubah`-nya lebih baru menang), menulis ulang Sheet
  bila ada beda, lalu mengembalikan hasilnya.
- Loker yang dihapus disimpan sebagai *tombstone* (kolom `Dihapus`) selama 30 hari supaya perangkat lain ikut menghapus.
- Edit manual di Sheet ikut masuk ke aplikasi. Baris yang dihapus langsung dari Sheet bisa muncul lagi dari perangkat lain;
  hapus lewat Lokerku.
- Token Google tidak pernah dikirim ke browser. Klien hanya tahu id, nama, email, dan apakah izin Drive diberikan.
- Saat keluar, salinan lokal akun itu dihapus dari browser. Loker dari mode tamu dipindah ke akun saat pertama kali masuk.

## Struktur

```
app/
  page.tsx                  landing
  app/page.tsx              tabel loker
  privasi/page.tsx
  api/extract/route.ts      POST { url } → hasil ekstraksi (anti-SSRF, cache 10 menit, rate limit)
  api/sync/route.ts         POST { spreadsheetId, jobs } → hasil gabungan dari Sheet
  api/auth/[...nextauth]    login Google
components/                 header, stats, toolbar, tabel, kartu mobile, toast, add-job/*
lib/
  types.ts, format.ts       model data & format WIB (diuji)
  db.ts, store.tsx          Dexie per akun + mesin sinkron
  merge.ts, sheet-codec.ts  penggabungan & konversi baris Sheet (diuji)
  google.ts, auth.ts        Drive/Sheets REST + next-auth
  extract/                  JSON-LD, meta, parser per platform, fixture test
hooks/                      tema, hotkey, count-up, media query
e2e/                        smoke test Playwright
```
