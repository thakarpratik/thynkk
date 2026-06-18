import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";

export const metadata = {
  title: "Contact",
  description: "Have a question, feature request, or partnership idea? Get in touch with the Thynkk team — we respond within 24 hours.",
  alternates: { canonical: "https://thynkk.co/contact" },
  openGraph: {
    title: "Contact Thynkk",
    description: "Have a question, feature request, or partnership idea? Get in touch — we respond within 24 hours.",
    url: "https://thynkk.co/contact",
  },
};

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "bug", label: "Bug report" },
  { value: "affiliate", label: "Affiliate program" },
  { value: "billing", label: "Billing issue" },
  { value: "feature", label: "Feature request" },
  { value: "other", label: "Other" },
];

export default function ContactPage() {
  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <SiteNav />

      <main className="max-w-2xl mx-auto px-6 pt-36 pb-24">
        <p className="text-xs font-mono text-[#6366F1] uppercase tracking-widest mb-3 text-center">Contact</p>
        <h1 className="font-mono text-4xl font-bold mb-4 text-center">Get in touch</h1>
        <p className="text-[#94A3B8] text-center mb-12">
          We reply to every message within 24 hours. For billing issues, mention your account email.
        </p>

        <form
          action="https://formspree.io/f/thynkk"
          method="POST"
          className="space-y-5"
        >
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-2">Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Your name"
                className="w-full bg-[#0E1223] border border-[#1E293B] focus:border-[#6366F1] outline-none text-[#F8FAFC] placeholder:text-[#475569] px-4 py-3 rounded-md text-sm font-mono transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-2">Email</label>
              <input
                type="email"
                name="email"
                required
                placeholder="you@example.com"
                className="w-full bg-[#0E1223] border border-[#1E293B] focus:border-[#6366F1] outline-none text-[#F8FAFC] placeholder:text-[#475569] px-4 py-3 rounded-md text-sm font-mono transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-2">Topic</label>
            <select
              name="topic"
              className="w-full bg-[#0E1223] border border-[#1E293B] focus:border-[#6366F1] outline-none text-[#F8FAFC] px-4 py-3 rounded-md text-sm font-mono transition-colors appearance-none"
            >
              {TOPICS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-2">Message</label>
            <textarea
              name="message"
              required
              rows={6}
              placeholder="What's on your mind?"
              className="w-full bg-[#0E1223] border border-[#1E293B] focus:border-[#6366F1] outline-none text-[#F8FAFC] placeholder:text-[#475569] px-4 py-3 rounded-md text-sm font-mono transition-colors resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#6366F1] hover:bg-[#4F46E5] text-white py-3 rounded-md font-semibold text-sm transition-colors cursor-pointer"
          >
            Send message
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-[#1E293B] flex flex-col sm:flex-row gap-6 text-sm text-[#475569]">
          <div>
            <p className="font-mono text-[#94A3B8] mb-1">Email directly</p>
            <a href="mailto:hello@thynkk.co" className="text-[#6366F1] hover:underline">hello@thynkk.co</a>
          </div>
          <div>
            <p className="font-mono text-[#94A3B8] mb-1">Response time</p>
            <p>Within 24 hours on weekdays</p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
