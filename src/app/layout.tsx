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

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ΜΠΕΛΦΑΣΤ URBAN PUB — Catalogue",
  description:
    "ΜΠΕΛΦΑΣΤ Urban Pub — Βασιλέως Κωνσταντίνου 26, Ξάνθη. Discover our full catalogue: beverages, beers, whiskeys, rum, gin, vodka, cognac & cocktails.",
  openGraph: {
    title: "ΜΠΕΛΦΑΣΤ URBAN PUB — Catalogue",
    description:
      "Full catalogue for ΜΠΕΛΦΑΣΤ Urban Pub in Xanthi. Beverages, craft beers, whiskeys, rum, gin, vodka, cognac & cocktails.",
    type: "website",
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
