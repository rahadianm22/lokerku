import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Providers } from "@/components/providers";
import { themeScript } from "@/hooks/use-theme";
import { authEnabled } from "@/lib/auth";
import { siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Lokerku: pengumpul loker pribadi", template: "%s · Lokerku" },
  description:
    "Tempel link lowongan dari LinkedIn, JobStreet, Glints, Kalibrr, Indeed, Dealls, atau situs karier. Lokerku merapikan datanya ke tabel, dan menyimpannya di Google Sheet milikmu.",
  // TODO: ikon di /public/icons masih placeholder sementara (wordmark "Lk."), ganti dengan ikon final pemilik produk.
  icons: { icon: "/icons/favicon-48.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#11110e" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers authEnabled={authEnabled}>{children}</Providers>
      </body>
    </html>
  );
}
