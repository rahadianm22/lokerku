import { ArrowRight, Check, Link2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { LoginButton } from "@/components/login-button";
import { authEnabled, authOptions } from "@/lib/auth";
import { HEADER } from "@/lib/sheet-codec";

const AUTH_ERRORS: Record<string, string> = {
  AccessDenied: "Login dibatalkan. Kamu tetap bisa mencoba Lokerku tanpa login.",
  OAuthCallback: "Google tidak menyelesaikan proses login. Coba sekali lagi.",
  Configuration: "Login Google belum disiapkan dengan benar di server ini.",
};

/* Data pratinjau: fiktif, dan diberi label di halaman. */
const PREVIEW = [
  { co: "Studio Rantai", title: "UI Designer", city: "Bandung", status: "interview", label: "Interview", dl: "2 hari", urgent: true },
  { co: "Koperasi Lintas", title: "Data Analyst", city: "Jakarta Pusat", status: "applied", label: "Sudah Apply", dl: "9 hari lagi", urgent: false },
  { co: "Toko Pagi", title: "Frontend Engineer", city: "Remote", status: "saved", label: "Disimpan", dl: "Hari ini", urgent: true },
];

export default async function Landing({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (authEnabled && (await getServerSession(authOptions))) redirect("/app");
  const { error } = await searchParams;
  const errorText = error ? (AUTH_ERRORS[error] ?? "Login gagal. Coba sekali lagi.") : null;

  return (
    <div className="page landing">
      <nav className="ld-nav" aria-label="Utama">
        <Link href="/" className="ld-brand">
          Loker<span className="mark">ku.</span>
        </Link>
        <div className="ld-nav-r">
          <Link href="/privasi" className="linkbtn">
            Privasi
          </Link>
          <Link href="/app" className="btn btn-ghost btn-sm">
            Buka tabel
          </Link>
        </div>
      </nav>

      {errorText && (
        <div className="notice danger" role="alert">
          <div>
            <strong>{errorText}</strong>
          </div>
        </div>
      )}

      <section className="ld-hero">
        <div className="ld-hero-text">
          <p className="eyebrow">pengumpul loker pribadi</p>
          <h1>
            Semua loker yang kamu incar, <span className="mark">rapi di satu tabel.</span>
          </h1>
          <p className="ld-lead">
            Tempel link dari LinkedIn, JobStreet, Glints, Kalibrr, atau situs karier perusahaan. Lokerku mengambil nama
            perusahaan, posisi, lokasi, gaji, dan deadline-nya, lalu menyimpannya ke Google Sheet milikmu.
          </p>
          <div className="ld-cta">
            {authEnabled && <LoginButton />}
            <Link href="/app" className={authEnabled ? "btn btn-ghost" : "btn btn-ink"}>
              {authEnabled ? "Coba tanpa login" : "Buka Lokerku"}
            </Link>
          </div>
          {authEnabled && (
            <p className="ld-small">Tanpa login, data hanya tersimpan di browser ini. Kamu bisa masuk kapan saja dan datanya ikut pindah.</p>
          )}
        </div>

        <figure className="ld-shot">
          <div className="ld-shot-link">
            <Link2 className="ic" strokeWidth={1.75} aria-hidden />
            <span className="mono">glints.com/id/opportunities/jobs/ui-designer</span>
          </div>
          <div className="ld-shot-arrow" aria-hidden="true">
            <ArrowRight className="ic" strokeWidth={1.75} />
            <span>diambil otomatis</span>
          </div>
          <div className="ld-shot-card">
            <div className="banner b-partial" style={{ margin: "0 0 14px" }}>
              <TriangleAlert className="ic" strokeWidth={1.75} aria-hidden />
              <div>
                <strong>Sebagian data terbaca</strong>
                <p>Gaji tidak ditemukan di halaman. Lengkapi kalau kamu tahu.</p>
              </div>
            </div>
            <dl className="ld-fields">
              <div><dt>Perusahaan</dt><dd>Studio Rantai</dd></div>
              <div><dt>Posisi</dt><dd>UI Designer</dd></div>
              <div><dt>Lokasi</dt><dd>Bandung · Hybrid</dd></div>
              <div><dt>Deadline</dt><dd className="mono">25 Okt 2026</dd></div>
              <div className="ld-miss"><dt>Gaji</dt><dd>Tidak ditemukan di halaman</dd></div>
              <div><dt>Status</dt><dd>Disimpan</dd></div>
            </dl>
          </div>
          <ul className="ld-rows" aria-label="Contoh isi tabel">
            {PREVIEW.map((r) => (
              <li key={r.co}>
                <span className="ld-row-main">
                  <strong>{r.title}</strong>
                  <span>
                    {r.co} · {r.city}
                  </span>
                </span>
                <span className={`chip s-${r.status}`}>
                  <span className="cdot" />
                  {r.label}
                </span>
                <span className={`badge ${r.urgent ? "dl-urgent" : "dl-far"}`}>{r.dl}</span>
              </li>
            ))}
          </ul>
          <figcaption>Contoh tampilan. Nama perusahaan di atas fiktif.</figcaption>
        </figure>
      </section>

      <section className="ld-own" aria-labelledby="ld-own-h">
        <div>
          <h2 id="ld-own-h">Datamu tinggal di Google Drive-mu sendiri</h2>
          <p>
            Saat kamu masuk, Lokerku membuat satu spreadsheet bernama <strong>Lokerku</strong> di Drive-mu. Setiap loker
            jadi satu baris. Kamu bisa membukanya, memfilter, membuat grafik, atau membagikannya ke mentor.
          </p>
          <ul className="ld-list">
            <li>
              <Check className="ic" strokeWidth={2} aria-hidden />
              <span>
                Izin yang diminta hanya untuk file yang dibuat Lokerku. File lain di Drive-mu tidak bisa dibuka atau dibaca.
              </span>
            </li>
            <li>
              <Check className="ic" strokeWidth={2} aria-hidden />
              <span>Lokerku tidak punya database sendiri. Isi loker hanya ada di Sheet-mu dan di browser yang kamu pakai.</span>
            </li>
            <li>
              <Check className="ic" strokeWidth={2} aria-hidden />
              <span>Buka di HP dan laptop, tabelnya sama. Edit di Sheet juga ikut masuk ke Lokerku.</span>
            </li>
          </ul>
        </div>
        <div className="ld-sheet" aria-label="Kolom di Google Sheet Lokerku">
          <div className="ld-sheet-bar">
            <span className="mono">Lokerku</span>
            <span className="mono ld-sheet-tab">Loker</span>
          </div>
          <div className="ld-sheet-cols">
            {HEADER.filter((h) => !["ID", "Logo", "Dibuat", "Diubah", "Dihapus"].includes(h)).map((h, i) => (
              <span key={h} className="mono">
                <em>{String.fromCharCode(66 + i)}</em>
                {h}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="ld-steps" aria-labelledby="ld-steps-h">
        <h2 id="ld-steps-h">Satu link, tiga langkah</h2>
        <ol>
          <li>
            <span className="eyebrow">Langkah 1 dari 3</span>
            <strong>Tempel link lowongan</strong>
            <p>Tekan N di mana saja untuk membuka form. Lokerku langsung mengenali platformnya dari link.</p>
          </li>
          <li>
            <span className="eyebrow">Langkah 2 dari 3</span>
            <strong>Mengambil data…</strong>
            <p>Biasanya 2 sampai 5 detik. Halaman dibaca dari data lowongan terstruktur yang dipasang situsnya.</p>
          </li>
          <li>
            <span className="eyebrow">Langkah 3 dari 3</span>
            <strong>Cek &amp; rapikan data</strong>
            <p>Kolom yang tidak ketemu ditandai, jadi kamu tahu mana yang perlu dilengkapi sebelum disimpan.</p>
          </li>
        </ol>
      </section>

      <section className="ld-limits" aria-labelledby="ld-limits-h">
        <h2 id="ld-limits-h">Yang perlu kamu tahu</h2>
        <dl>
          <div>
            <dt>LinkedIn sering minta login</dt>
            <dd>Lokerku tidak mencoba melewati login. Kalau halamannya tertutup, isi datanya manual. Link tetap disimpan.</dd>
          </div>
          <div>
            <dt>Link yang kamu tempel lewat server Lokerku</dt>
            <dd>Server membuka halaman lowongan itu untuk membaca datanya, lalu menyimpan hasilnya di memori selama 10 menit. Isi tabelmu tidak dikirim ke server ini kecuali saat sinkron ke Sheet.</dd>
          </div>
          <div>
            <dt>Hapus loker lewat Lokerku</dt>
            <dd>Baris yang dihapus langsung di Sheet bisa muncul lagi dari perangkat lain. Hapus dari tabel Lokerku supaya semua perangkat ikut.</dd>
          </div>
        </dl>
      </section>

      <footer className="ld-foot">
        <span>
          Loker<span className="mark">ku.</span>
        </span>
        <Link href="/privasi">Kebijakan privasi</Link>
      </footer>
    </div>
  );
}
