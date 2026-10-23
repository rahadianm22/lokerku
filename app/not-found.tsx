import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <div className="empty" style={{ marginTop: 80, background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}>
        <h2>Halaman tidak ditemukan</h2>
        <p>Alamat yang kamu buka tidak ada di Lokerku. Tabel lokermu ada di halaman Tabel loker.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 12 }}>
          <Link href="/app" className="btn btn-ink">
            Buka tabel loker
          </Link>
          <Link href="/" className="btn btn-ghost">
            Ke beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
