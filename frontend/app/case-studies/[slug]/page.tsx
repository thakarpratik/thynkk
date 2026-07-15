import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteNav } from "../../_components/SiteNav";
import { SiteFooter } from "../../_components/SiteFooter";
import {
  formatStudyDate,
  getAllStudies,
  getStudy,
  type CaseStudy,
  type PromoRisk,
} from "../_data/studies";

const PROMO_STYLES: Record<PromoRisk, string> = {
  low: "text-[#22C55E] border-[#22C55E]/30 bg-[#22C55E]/10",
  medium: "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10",
  high: "text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/10",
};

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllStudies().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const study = getStudy(slug);
  if (!study) return { title: "Case study not found" };
  return {
    title: `${study.headline.slice(0, 60)}${study.headline.length > 60 ? "…" : ""} — Thynkk`,
    description: study.excerpt,
    alternates: { canonical: `https://thynkk.co/case-studies/${study.slug}` },
    openGraph: {
      title: study.headline,
      description: study.excerpt,
      url: `https://thynkk.co/case-studies/${study.slug}`,
      type: "article",
      publishedTime: study.publishedAt,
    },
  };
}

function ArticleBody({ study }: { study: CaseStudy }) {
  const t = study.topThread;
  const promoStyle = PROMO_STYLES[t.promoRisk];

  return (
    <article className="max-w-2xl mx-auto">
      {/* Blog article header */}
      <header className="mb-10">
        <Link
          href="/case-studies"
          className="text-xs font-mono text-[#6366F1] hover:underline mb-6 inline-block"
        >
          ← All case studies
        </Link>
        <p className="text-[10px] font-mono text-[#6366F1] uppercase tracking-widest mb-3">
          {study.category}
        </p>
        <h1 className="font-mono text-3xl sm:text-4xl font-bold leading-tight tracking-tight text-[#F8FAFC] mb-5">
          {study.headline}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-mono text-[#64748B] mb-6">
          <time dateTime={study.publishedAt}>{formatStudyDate(study.publishedAt)}</time>
          <span aria-hidden>·</span>
          <span>{study.readMinutes} min read</span>
          <span aria-hidden>·</span>
          <span className="text-[#94A3B8]">{study.timeSaved}</span>
        </div>
        <p className="text-base text-[#94A3B8] leading-relaxed border-l-2 border-[#6366F1]/50 pl-4">
          {study.excerpt}
        </p>
      </header>

      {/* Byline / product */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#1E293B] bg-[#0E1223] px-4 py-3 mb-10">
        <div>
          <p className="font-mono text-sm font-semibold text-[#F8FAFC]">
            {study.productName}
          </p>
          <p className="text-xs text-[#64748B]">{study.nicheLabel}</p>
        </div>
        <a
          href={study.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs font-mono text-[#6366F1] hover:underline"
        >
          {study.url.replace(/^https?:\/\//, "")} →
        </a>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        {study.stats.map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-[#1E293B] bg-[#0E1223] px-3 py-3 text-center"
          >
            <p className="font-mono text-xl font-bold text-[#F8FAFC]">{s.value}</p>
            <p className="text-[10px] font-mono text-[#64748B] mt-0.5 uppercase tracking-wide">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Body sections */}
      <section className="prose-invert mb-10">
        <h2 className="font-mono text-lg font-bold text-[#F8FAFC] mb-3">The setup</h2>
        <p className="text-[#94A3B8] leading-relaxed text-[15px]">{study.context}</p>
      </section>

      {study.pullQuote && (
        <blockquote className="mb-10 rounded-xl border border-[#6366F1]/25 bg-[#6366F1]/10 px-6 py-5">
          <p className="font-mono text-base sm:text-lg text-[#E0E7FF] leading-relaxed">
            “{study.pullQuote}”
          </p>
        </blockquote>
      )}

      <section className="mb-10">
        <h2 className="font-mono text-lg font-bold text-[#F8FAFC] mb-3">
          Top thread to join
        </h2>
        <p className="text-sm text-[#64748B] mb-4">
          Reply mode — paste as a comment on an existing Reddit thread.
        </p>
        <div className="rounded-xl border border-[#1E293B] bg-[#0E1223] p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[10px] font-mono text-[#6366F1] uppercase">
              {t.subreddit}
            </span>
            <span className="text-[10px] font-mono text-[#475569]">
              match {t.relevanceScore}
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${promoStyle}`}
            >
              {t.promoRisk} promo risk
            </span>
          </div>
          <h3 className="font-mono text-base font-semibold text-[#F8FAFC] mb-2 leading-snug">
            {t.title}
          </h3>
          <p className="text-sm text-[#64748B] italic mb-4">&ldquo;{t.snippet}&rdquo;</p>
          <div className="rounded-lg bg-[#020617] border border-[#1E293B] p-4">
            <p className="text-[10px] font-mono text-sky-400 uppercase tracking-widest mb-2">
              Reply draft · paste as a comment
            </p>
            <p className="text-sm text-[#CBD5E1] leading-relaxed whitespace-pre-wrap">
              {t.replyDraft}
            </p>
          </div>
          <a
            href={t.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#6366F1] hover:underline font-mono mt-3 inline-block"
          >
            Open on Reddit →
          </a>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-mono text-lg font-bold text-[#F8FAFC] mb-3">
          Create a new post
        </h2>
        <p className="text-sm text-[#64748B] mb-4">
          Create mode — your own thread in the community, not a reply under someone else.
        </p>
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5 sm:p-6">
          <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-2">
            {study.postIdea.community}
          </p>
          <p className="font-mono text-base font-semibold text-[#F8FAFC] mb-2 leading-snug">
            {study.postIdea.title}
          </p>
          <p className="text-sm text-[#94A3B8] leading-relaxed">{study.postIdea.hook}</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="font-mono text-lg font-bold text-[#F8FAFC] mb-3">
          Communities surfaced
        </h2>
        <div className="flex flex-wrap gap-2">
          {study.communities.map((c) => (
            <span
              key={c}
              className="text-xs font-mono px-2.5 py-1 rounded-full border border-[#1E293B] text-[#94A3B8] bg-[#0E1223]"
            >
              {c}
            </span>
          ))}
        </div>
        {study.alsoFound && study.alsoFound.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {study.alsoFound.map((item) => (
              <li key={item} className="text-sm text-[#94A3B8] font-mono">
                · {item}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-12">
        <h2 className="font-mono text-lg font-bold text-[#F8FAFC] mb-3">Outcome</h2>
        <div className="rounded-xl border border-[#6366F1]/30 bg-[#6366F1]/10 p-5">
          <p className="text-[15px] text-[#CBD5E1] leading-relaxed">{study.outcome}</p>
        </div>
      </section>

      {/* Footer CTA */}
      <div className="rounded-2xl border border-[#1E293B] bg-[#0E1223] p-6 sm:p-8 text-center">
        <p className="font-mono font-bold text-lg mb-2">Run the same play on your site</p>
        <p className="text-sm text-[#94A3B8] mb-5 max-w-md mx-auto leading-relaxed">
          Paste your URL. Get niche threads, reply drafts, and create-new-post ideas in
          about a minute.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-[#6366F1] hover:bg-[#4F46E5] text-white px-8 py-3 rounded-md font-medium text-sm transition-colors"
        >
          Scan free
        </Link>
      </div>

      {/* More stories */}
      <nav className="mt-12 pt-8 border-t border-[#1E293B]" aria-label="More case studies">
        <p className="text-xs font-mono text-[#475569] uppercase tracking-widest mb-4">
          More stories
        </p>
        <ul className="space-y-3">
          {getAllStudies()
            .filter((s) => s.slug !== study.slug)
            .slice(0, 3)
            .map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/case-studies/${s.slug}`}
                  className="text-sm text-[#94A3B8] hover:text-[#A5B4FC] transition-colors"
                >
                  {s.headline}
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </article>
  );
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const study = getStudy(slug);
  if (!study) notFound();

  return (
    <div className="min-h-dvh bg-[#020617] text-[#F8FAFC]">
      <SiteNav />
      <main className="px-6 pt-32 pb-24">
        <ArticleBody study={study} />
      </main>
      <SiteFooter />
    </div>
  );
}
