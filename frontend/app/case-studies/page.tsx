import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "../_components/SiteNav";
import { SiteFooter } from "../_components/SiteFooter";
import { formatStudyDate, getAllStudies } from "./_data/studies";

export const metadata: Metadata = {
  title: "Case Studies — Reddit traffic stories",
  description:
    "Blog-style case studies: how new sites and product launches use Thynkk to find niche Reddit threads, reply drafts, and intent traffic — including gutguage.com.",
  alternates: { canonical: "https://thynkk.co/case-studies" },
  openGraph: {
    title: "Thynkk Case Studies — first Reddit traffic stories",
    description:
      "How founders and new website owners find niche threads and get Reddit traffic with Thynkk.",
    url: "https://thynkk.co/case-studies",
  },
};

export default function CaseStudiesIndexPage() {
  const studies = getAllStudies();
  const [featured, ...rest] = studies;

  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <SiteNav />

      <main className="max-w-3xl mx-auto px-6 pt-36 pb-24">
        {/* Blog header */}
        <header className="mb-14 border-b border-[#1E293B] pb-10">
          <p className="text-xs font-mono text-[#6366F1] uppercase tracking-widest mb-3">
            Stories
          </p>
          <h1 className="font-mono text-4xl sm:text-5xl font-bold mb-4 leading-tight tracking-tight">
            Case studies
          </h1>
          <p className="text-lg text-[#94A3B8] leading-relaxed max-w-2xl">
            How new websites and product launches find niche Reddit threads, draft
            replies, and get intent traffic with Thynkk — without waiting on SEO.
          </p>
        </header>

        {/* Featured post */}
        {featured && (
          <article className="mb-14">
            <p className="text-[10px] font-mono text-[#6366F1] uppercase tracking-widest mb-3">
              Featured
            </p>
            <Link
              href={`/case-studies/${featured.slug}`}
              className="group block rounded-2xl border border-[#1E293B] bg-[#0E1223] p-6 sm:p-8 hover:border-[#6366F1]/40 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-[#64748B] mb-4">
                <span className="text-[#818CF8]">{featured.category}</span>
                <span aria-hidden>·</span>
                <time dateTime={featured.publishedAt}>
                  {formatStudyDate(featured.publishedAt)}
                </time>
                <span aria-hidden>·</span>
                <span>{featured.readMinutes} min read</span>
              </div>
              <h2 className="font-mono text-2xl sm:text-3xl font-bold text-[#F8FAFC] group-hover:text-[#A5B4FC] transition-colors leading-snug mb-3">
                {featured.headline}
              </h2>
              <p className="text-[#94A3B8] leading-relaxed mb-5">{featured.excerpt}</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-mono text-[#475569]">
                  {featured.productName} · {featured.url.replace(/^https?:\/\//, "")}
                </p>
                <span className="text-sm font-medium text-[#6366F1] group-hover:underline">
                  Read story →
                </span>
              </div>
            </Link>
          </article>
        )}

        {/* Post list */}
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 className="font-mono text-sm font-bold text-[#F8FAFC] uppercase tracking-widest">
            All stories
          </h2>
          <p className="text-xs font-mono text-[#475569]">{studies.length} posts</p>
        </div>

        <ul className="divide-y divide-[#1E293B] border-y border-[#1E293B] mb-16">
          {rest.map((study) => (
            <li key={study.slug}>
              <Link
                href={`/case-studies/${study.slug}`}
                className="group flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-6 py-7 hover:bg-[#0E1223]/60 -mx-3 px-3 rounded-lg transition-colors"
              >
                <div className="sm:w-28 shrink-0 text-[11px] font-mono text-[#64748B] pt-0.5">
                  <time dateTime={study.publishedAt}>{formatStudyDate(study.publishedAt)}</time>
                  <p className="mt-1 text-[#475569]">{study.readMinutes} min</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-mono text-[#6366F1] uppercase tracking-widest mb-1.5">
                    {study.category}
                  </p>
                  <h3 className="font-mono text-lg font-bold text-[#F8FAFC] group-hover:text-[#A5B4FC] transition-colors leading-snug mb-2">
                    {study.headline}
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed line-clamp-2 mb-2">
                    {study.excerpt}
                  </p>
                  <p className="text-[11px] font-mono text-[#475569]">
                    {study.productName}
                  </p>
                </div>
                <span className="sm:pt-1 text-sm text-[#6366F1] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div
          className="rounded-2xl border border-[#6366F1]/35 bg-[#0E1223] p-8 text-center"
          style={{ boxShadow: "0 0 24px rgba(99,102,241,0.1)" }}
        >
          <p className="font-mono font-bold text-lg mb-2">Your site could be next</p>
          <p className="text-sm text-[#94A3B8] mb-6 max-w-md mx-auto leading-relaxed">
            Paste your URL. Get niche Reddit threads, reply drafts, and create-new-post
            ideas — first traffic without waiting on Google.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-[#6366F1] hover:bg-[#4F46E5] text-white px-8 py-3 rounded-md font-medium text-sm transition-colors"
          >
            Scan your site free
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
