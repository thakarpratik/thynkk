interface SectionHeaderProps {
  step: number;
  title: string;
  description: string;
  count?: string;
}

export function SectionHeader({ step, title, description, count }: SectionHeaderProps) {
  return (
    <div className="mb-5 scroll-mt-28" id={`section-${step}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary text-sm font-mono font-bold">
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="font-mono text-base sm:text-lg font-bold text-foreground">{title}</h3>
            {count && (
              <span className="text-xs font-mono text-muted-foreground">{count}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}