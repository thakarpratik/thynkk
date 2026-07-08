interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <section
      className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 sm:p-8 mb-8"
      role="alert"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="font-mono text-sm font-semibold text-destructive mb-1">Something went wrong</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 text-sm bg-card border border-border hover:border-primary/50 text-foreground px-5 py-2.5 rounded-lg font-medium transition-colors cursor-pointer"
        >
          Try again
        </button>
      </div>
    </section>
  );
}