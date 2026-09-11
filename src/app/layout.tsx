import type { Metadata, Viewport } from "next";
import { Playfair_Display, Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

// NOTE: neither Playfair nor Cormorant ships a Greek subset via next/font
// (verified: build type-errors on "greek"), and DM Sans is latin-only too —
// Greek glyphs (ΜΠΕΛΦΑΣΤ, …) render in the system serif/sans fallback.
// Follow-up for full Greek typographic parity: swap headings/body to a
// Greek-capable family (e.g. Noto Serif Display + Noto Sans, like the OG
// image already uses). Visual change — needs design sign-off first.
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

function resolveMetadataBase(): URL {
  const raw = process.env.NEXT_PUBLIC_SERVER_URL || ''
  if (/^https?:\/\//.test(raw)) return new URL(raw)
  if (raw) return new URL(`https://${raw}`)
  return new URL('http://localhost:3000')
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: "ΜΠΕΛΦΑΣΤ URBAN PUB — Catalogue",
  description:
    "ΜΠΕΛΦΑΣΤ Urban Pub — Βασιλέως Κωνσταντίνου 26, Ξάνθη. Discover our full catalogue: beverages, beers, whiskeys, rum, gin, vodka, cognac & cocktails.",
  openGraph: {
    title: "ΜΠΕΛΦΑΣΤ URBAN PUB — Catalogue",
    description:
      "Full catalogue for ΜΠΕΛΦΑΣΤ Urban Pub in Xanthi. Beverages, craft beers, whiskeys, rum, gin, vodka, cognac & cocktails.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ΜΠΕΛΦΑΣΤ URBAN PUB — Catalogue",
    description:
      "Full catalogue for ΜΠΕΛΦΑΣΤ Urban Pub in Xanthi. Beverages, craft beers, whiskeys, rum, gin, vodka, cognac & cocktails.",
    images: ["/opengraph-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#163f1a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="el" className={`${playfair.variable} ${cormorant.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
