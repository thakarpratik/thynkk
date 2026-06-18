import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Scan Reddit for pain points and trending niches.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
