import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#1E293B] py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <span className="font-mono font-bold text-lg text-[#F8FAFC]">
              thynkk<span className="text-[#6366F1]">.</span>
            </span>
            <p className="text-xs text-[#475569] mt-2 leading-relaxed">
              The growth engine for indie founders. Find conversations. Draft replies.
            </p>
          </div>
          <div>
            <p className="text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-3">Product</p>
            <ul className="space-y-2 text-sm text-[#475569]">
              <li><Link href="/dashboard" className="hover:text-[#94A3B8] transition-colors">Growth Scanner</Link></li>
              <li><Link href="/pricing" className="hover:text-[#94A3B8] transition-colors">Pricing</Link></li>
              <li><Link href="/case-studies" className="hover:text-[#94A3B8] transition-colors">Case studies</Link></li>
              <li><Link href="/methodology" className="hover:text-[#94A3B8] transition-colors">Methodology</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-3">Company</p>
            <ul className="space-y-2 text-sm text-[#475569]">
              <li><Link href="/about" className="hover:text-[#94A3B8] transition-colors">About</Link></li>
              <li><Link href="/affiliate" className="hover:text-[#94A3B8] transition-colors">Affiliate Program</Link></li>
              <li><Link href="/contact" className="hover:text-[#94A3B8] transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-3">Legal</p>
            <ul className="space-y-2 text-sm text-[#475569]">
              <li><Link href="/terms" className="hover:text-[#94A3B8] transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link href="/privacy" className="hover:text-[#94A3B8] transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#1E293B] pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#475569]">
          <span>© 2026 Thynkk. All rights reserved.</span>
          <span>Built for indie hackers, founders, and marketers.</span>
        </div>
      </div>
    </footer>
  );
}
