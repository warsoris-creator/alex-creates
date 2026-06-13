import type { Metadata } from "next";
import { Almarai, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const almarai = Almarai({
  subsets: ["latin", "arabic"],
  weight: ["300", "400", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  style: ["italic"],
  variable: "--font-accent",
  display: "swap",
});

export const metadata: Metadata = {
  title: "alex.creates — Cinematic Video Editor Portfolio",
  description: "A dark cinematic portfolio for Aleksandr / alex.creates.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${almarai.variable} ${cormorant.variable}`}>
      <body>{children}</body>
    </html>
  );
}
