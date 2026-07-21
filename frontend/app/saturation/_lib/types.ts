export type ValidationStatus = "reject" | "needs_confirm" | "accept";

export interface ValidationResult {
  status: ValidationStatus;
  level: number;
  code: string;
  message: string;
  normalized_input: string;
  examples: string[];
  suggested_rewrite: string | null;
  is_theme: boolean;
}

export interface FactorScore {
  id: string;
  label: string;
  weight: number;
  score: number;
  detail: string;
}

export interface SaturationReport {
  input: string;
  normalized_input: string;
  score: number;
  decision: "go" | "caution" | "no_go";
  decision_label: string;
  summary: string;
  insight: string;
  niche_down: string[];
  factors: FactorScore[];
  is_theme: boolean;
  level: number;
  research: {
    competitor_count_est?: number;
    reddit_thread_count?: number;
    directory_count?: number;
    named_tools?: string[];
    serper_ok?: boolean;
    sample_competitors?: { title: string; link: string; snippet: string }[];
    sample_reddit?: { title: string; link: string; snippet: string }[];
  };
  methodology_note: string;
  data_mode: "live" | "heuristic";
  bands: { go: string; caution: string; no_go: string };
  weights: Record<string, number>;
}

export type PageStatus = "idle" | "validating" | "confirm" | "scoring" | "done" | "error";
