import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://veritasri.example";

export const metadata: Metadata = {
  title:
    "Veritas Relationship Intelligence | Discreet Relationship Verification",
  description:
    "Private ethical OSINT services for identity verification, catfish detection, romance scam review, and relationship clarity.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title:
      "Veritas Relationship Intelligence | Discreet Relationship Verification",
    description:
      "Private ethical OSINT services for identity verification, catfish detection, romance scam review, and relationship clarity.",
    type: "website",
    images: [
      {
        url: "/images/veritas-hero.png",
        width: 1600,
        height: 900,
        alt: "A confidential report folder on a refined dark desk with warm privacy lighting.",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
