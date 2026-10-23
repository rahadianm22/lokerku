"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="page">
      <div className="empty" style={{ marginTop: 80, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }} role="alert">
        <h2>Halaman ini gagal dimuat</h2>
        <p>Loker yang sudah kamu simpan aman di perangkat ini, dan di Google Sheet kalau kamu masuk dengan Google. Coba muat ulang halamannya.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 12 }}>
          <button type="button" className="btn btn-ink" onClick={reset}>
            Coba lagi
          </button>
          <Link href="/" className="btn btn-ghost">
            Ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
