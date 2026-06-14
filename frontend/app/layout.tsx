import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thynkk — Think before you build",
  description: "Market intelligence from Reddit, instantly. Surface pain points and discover trending niches.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#020617] antialiased">{children}</body>
    </html>
  );
}
