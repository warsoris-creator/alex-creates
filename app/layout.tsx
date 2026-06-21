import type { Metadata } from "next";
import { Manrope, Playfair_Display, JetBrains_Mono, Lora } from "next/font/google";
import "./globals.css";

// Body / UI — modern geometric grotesk (Latin + Cyrillic).
const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

// Display + italic accent — high-contrast cinematic serif (Latin + Cyrillic).
const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-accent",
  display: "swap",
});

// Eyebrows, labels, numerals — editorial monospace (Latin + Cyrillic).
const jetbrains = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

// Russian display + accent — Playfair's Cyrillic looks dated, so headings switch
// to Lora, an elegant serif with proper Cyrillic letterforms.
const lora = Lora({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display-ru",
  display: "swap",
});

export const metadata: Metadata = {
  title: "alex.creates — Cinematic Video Editor Portfolio",
  description: "A dark cinematic portfolio for Aleksandr / alex.creates.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${playfair.variable} ${jetbrains.variable} ${lora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
