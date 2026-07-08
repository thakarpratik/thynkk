import type { ScanStatus } from "../_types";

interface DashboardStepperProps {
  status: ScanStatus;
}

const STEPS = [
  { id: 1, title: "Add your site", hint: "Paste your product URL" },
  { id: 2, title: "Find conversations", hint: "We scan communities for you" },
  { id: 3, title: "Take action", hint: "Copy replies & post ideas" },
] as const;

function stepIndex(status: ScanStatus): number {
  if (status === "idle" || status === "error") return 0;
  if (status === "loading") return 1;
  return 2;
}

export function DashboardStepper({ status }: DashboardStepperProps) {
  const active = stepIndex(status);

  return (
    <nav aria-label="Scan progress" className="mb-8">
      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {STEPS.map((step, index) => {
          const done = index < active;
          const current = index === active;
          const upcoming = index > active;

          return (
            <li
              key={step.id}
              className={`relative rounded-xl border px-4 py-3 transition-colors ${
                current
                  ? "border-primary/50 bg-primary/5"
                  : done
                    ? "border-accent/30 bg-accent/5"
                    : "border-border bg-card"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-mono font-semibold ${
                    current
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-accent/20 text-accent"
                        : "bg-muted text-muted-foreground"
                  }`}
                  aria-current={current ? "step" : undefined}
                >
                  {done ? "✓" : step.id}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p
                    className={`text-sm font-medium ${
                      upcoming ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{step.hint}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}