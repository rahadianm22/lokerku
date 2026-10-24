import { AlertCircle, CircleCheck, TriangleAlert } from "lucide-react";
import { FIELD_LABEL, type Confidence, type MissingField } from "@/lib/types";

function joinId(list: string[]) {
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} dan ${list[list.length - 1]}`;
}

export function ConfidenceBanner({ confidence, missing, loginOnly }: { confidence: Confidence; missing: MissingField[]; loginOnly?: boolean }) {
  if (confidence === "complete") {
    return (
      <div className="banner b-complete" role="status">
        <CircleCheck className="ic" strokeWidth={1.75} aria-hidden />
        <div>
          <strong>Data lengkap terbaca</strong>
          <p>Semua kolom utama berhasil diambil. Cek sekali lagi, lalu simpan.</p>
        </div>
      </div>
    );
  }
  if (confidence === "partial") {
    return (
      <div className="banner b-partial" role="status">
        <TriangleAlert className="ic" strokeWidth={1.75} aria-hidden />
        <div>
          <strong>Sebagian data terbaca</strong>
          <p>
            {joinId(missing.map((m) => FIELD_LABEL[m]))} tidak ditemukan di halaman. Lengkapi kalau kamu tahu, boleh juga
            dikosongkan.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="banner b-failed" role="status">
      <AlertCircle className="ic" strokeWidth={1.75} aria-hidden />
      <div>
        <strong>Halaman tidak bisa dibaca</strong>
        {loginOnly ? (
          <p>Postingan ini hanya terbuka setelah login, jadi Lokerku tidak bisa membacanya. Tempel teks postingannya di bawah, atau isi manual. Link tetap disimpan.</p>
        ) : (
          <p>Mungkin perlu login atau situsnya membatasi akses. Isi data secara manual, link tetap disimpan.</p>
        )}
      </div>
    </div>
  );
}
