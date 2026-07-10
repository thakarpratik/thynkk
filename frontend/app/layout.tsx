import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import "./globals.css";

const BASE_URL = "https://thynkk.co";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "Thynkk — Thynkk before you build",
    template: "%s | Thynkk",
  },
  description: "Turn Reddit into a market research engine. Surface real pain points and discover trending niches before your competitors do.",
  keywords: ["market research", "reddit insights", "pain point analysis", "niche discovery", "product validation", "indie hacker tools", "saas market research"],
  authors: [{ name: "Thynkk" }],
  creator: "Thynkk",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "Thynkk",
    title: "Thynkk — Thynkk before you build",
    description: "Turn Reddit into a market research engine. Surface real pain points and discover trending niches before your competitors do.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Thynkk — Market intelligence from Reddit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Thynkk — Thynkk before you build",
    description: "Turn Reddit into a market research engine. Surface real pain points and discover trending niches before your competitors do.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/icon-32.png",
  },
};

const GA_ID = "G-0K78T12WS9";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <head>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { page_path: window.location.pathname });
            `}
          </Script>
        </head>
        <body className="min-h-full bg-[#020617] antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
