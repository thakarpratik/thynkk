import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata = {
  title: "Privacy Policy — Thynkk",
  description: "How Thynkk handles your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <SiteNav />

      <main className="max-w-3xl mx-auto px-6 pt-36 pb-24">
        <p className="text-xs font-mono text-[#6366F1] uppercase tracking-widest mb-3">Legal</p>
        <h1 className="font-mono text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#475569] mb-12">Last updated: June 2026</p>

        <div className="space-y-10 text-[#CBD5E1] text-sm leading-relaxed">

          <section>
            <h2 className="font-mono font-bold text-lg text-[#F8FAFC] mb-3">1. What we collect</h2>
            <ul className="space-y-2 text-[#94A3B8]">
              <li><span className="text-[#F8FAFC] font-mono">IP address</span> — used to enforce scan quotas. Not linked to personal identity. Stored securely in our database.</li>
              <li><span className="text-[#F8FAFC] font-mono">Email address</span> — collected when you sign up or contact us. Used for account management and transactional emails.</li>
              <li><span className="text-[#F8FAFC] font-mono">Payment data</span> — processed entirely by Stripe. We never see or store your card details.</li>
              <li><span className="text-[#F8FAFC] font-mono">Scan queries</span> — the niche or subreddit you scan is stored to enable caching, saved searches (Pro), and digest emails.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mono font-bold text-lg text-[#F8FAFC] mb-3">2. What we do not collect</h2>
            <p>We do not collect, store, or sell browsing history, device fingerprints, or any data beyond what is necessary to provide the Service. We do not use advertising trackers.</p>
          </section>

          <section>
            <h2 className="font-mono font-bold text-lg text-[#F8FAFC] mb-3">3. Reddit data</h2>
            <p>Thynkk analyses publicly available Reddit posts and comments. We do not access private subreddits, direct messages, or any non-public Reddit content. Excerpts displayed in scan results link back to the original Reddit post so attribution is always clear.</p>
          </section>

          <section>
            <h2 className="font-mono font-bold text-lg text-[#F8FAFC] mb-3">4. Third-party services</h2>
            <ul className="space-y-2 text-[#94A3B8]">
              <li><span className="text-[#F8FAFC] font-mono">Stripe</span> — payment processing. Subject to Stripe&apos;s privacy policy.</li>
              <li><span className="text-[#F8FAFC] font-mono">Apify</span> — Reddit data collection. Processes publicly available Reddit content only.</li>
              <li><span className="text-[#F8FAFC] font-mono">Anthropic</span> — AI analysis. Scan content is sent to the Claude API for clustering. Anthropic does not train on API inputs by default.</li>
              <li><span className="text-[#F8FAFC] font-mono">Supabase</span> — database hosting. Data stored in EU/US regions.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-mono font-bold text-lg text-[#F8FAFC] mb-3">5. Data retention</h2>
            <p>Scan results are cached for up to 30 days to avoid redundant API calls. Account data is retained for the life of your account plus 90 days after deletion. IP-based quota records are purged after 90 days of inactivity.</p>
          </section>

          <section>
            <h2 className="font-mono font-bold text-lg text-[#F8FAFC] mb-3">6. Your rights</h2>
            <p>You may request deletion of your account and associated data at any time by emailing <a href="mailto:hello@thynkk.co" className="text-[#6366F1] hover:underline">hello@thynkk.co</a>. We will process deletion requests within 14 days.</p>
          </section>

          <section>
            <h2 className="font-mono font-bold text-lg text-[#F8FAFC] mb-3">7. Cookies</h2>
            <p>We use only essential cookies required for authentication and session management. We do not use advertising or analytics cookies.</p>
          </section>

          <section>
            <h2 className="font-mono font-bold text-lg text-[#F8FAFC] mb-3">8. Contact</h2>
            <p>Questions about this policy? Email <a href="mailto:hello@thynkk.co" className="text-[#6366F1] hover:underline">hello@thynkk.co</a>.</p>
          </section>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
