import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Kebijakan privasi" };

export default function Privasi() {
  return (
    <div className="page landing">
      <nav className="ld-nav" aria-label="Utama">
        <Link href="/" className="ld-brand">
          Loker<span className="mark">ku.</span>
        </Link>
        <div className="ld-nav-r">
          <Link href="/app" className="btn btn-ghost btn-sm">
            Buka tabel
          </Link>
        </div>
      </nav>

      <article className="prose-lk">
        <p className="eyebrow">Terakhir diperbarui 23 Oktober 2026</p>
        <h1>Kebijakan privasi</h1>
        <p>
          Lokerku adalah alat pribadi untuk mencatat lowongan kerja. Halaman ini menjelaskan data apa yang disentuh Lokerku,
          di mana data itu disimpan, dan cara menghapusnya.
        </p>

        <h2>Data yang disimpan</h2>
        <p>
          Loker yang kamu simpan berisi link lowongan, nama perusahaan, posisi, lokasi, gaji, tanggal, status, prioritas,
          dan catatanmu. Data ini disimpan di dua tempat:
        </p>
        <ul>
          <li>
            <strong>Browser yang kamu pakai</strong> (IndexedDB). Ini selalu terjadi, termasuk di mode tamu.
          </li>
          <li>
            <strong>Google Sheet bernama Lokerku di Google Drive-mu</strong>, hanya kalau kamu masuk dengan Google.
          </li>
        </ul>
        <p>Lokerku tidak punya database sendiri dan tidak menyimpan salinan tabelmu di server.</p>

        <h2>Izin Google yang diminta</h2>
        <ul>
          <li>
            <strong>Profil dasar (nama dan email)</strong> untuk menandai akun yang sedang masuk. Email tampil di menu ⋯.
          </li>
          <li>
            <strong>
              Akses ke file Google Drive yang dibuat Lokerku (<span className="mono">drive.file</span>)
            </strong>
            . Dengan izin ini Lokerku hanya bisa membuat dan mengubah spreadsheet Lokerku. File lain di Drive-mu tidak bisa
            dilihat, dibaca, atau diubah.
          </li>
        </ul>
        <p>
          Token akses Google disimpan terenkripsi di cookie browsermu dan hanya dipakai server Lokerku untuk membaca dan
          menulis spreadsheet tersebut saat sinkron.
        </p>

        <h2>Link yang kamu tempel</h2>
        <p>
          Saat kamu menekan Ambil data, server Lokerku membuka link lowongan itu untuk membaca nama perusahaan, posisi,
          dan kolom lainnya. Hasilnya disimpan di memori server selama 10 menit supaya link yang sama tidak dibuka dua
          kali, lalu dibuang.
        </p>

        <h2>Yang tidak dilakukan Lokerku</h2>
        <ul>
          <li>Tidak memasang analitik, iklan, atau pelacak pihak ketiga.</li>
          <li>Tidak menjual atau membagikan datamu.</li>
          <li>Tidak mencoba masuk ke situs lowongan atas namamu.</li>
        </ul>

        <h2>Menghapus data</h2>
        <ul>
          <li>Pilih Keluar di menu ⋯ untuk menghapus salinan data di browser ini. Spreadsheet di Drive-mu tidak ikut terhapus.</li>
          <li>Hapus spreadsheet Lokerku dari Google Drive untuk menghapus datanya di sana.</li>
          <li>
            Cabut akses Lokerku kapan saja di{" "}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
              myaccount.google.com/permissions
            </a>
            .
          </li>
        </ul>

        <h2>Kontak</h2>
        <p>
          Pertanyaan soal privasi bisa dikirim ke <span className="mono">[EMAIL KONTAK]</span>.
        </p>
      </article>

      <footer className="ld-foot">
        <span>
          Loker<span className="mark">ku.</span>
        </span>
        <Link href="/">Beranda</Link>
      </footer>
    </div>
  );
}
