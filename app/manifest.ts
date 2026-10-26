import type { MetadataRoute } from "next";

/**
 * Lokerku bisa diinstal (PWA) dan muncul di menu "Bagikan" Android: link lowongan yang dibagikan dari aplikasi lain
 * dibuka di /app?url=…&text=…&title=…, lalu langsung diproses di dialog Tambah loker.
 * Ikon di /public/icons masih placeholder sementara (wordmark "Lk."), menunggu ikon final dari pemilik produk.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lokerku: pengumpul loker pribadi",
    short_name: "Lokerku",
    description: "Tempel link lowongan, Lokerku merapikan datanya ke tabel dan Google Sheet milikmu.",
    lang: "id",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f4f3ee",
    theme_color: "#17160f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    share_target: {
      action: "/app",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}
