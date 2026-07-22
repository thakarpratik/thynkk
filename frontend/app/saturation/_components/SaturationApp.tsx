"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  SaturationApiError,
  scoreSaturation,
  validateSaturationInput,
} from "../_lib/api";
import {
  getStoredSaturationEmail,
  storeSaturationEmail,
} from "../_lib/email";
import type { PageStatus, SaturationReport, ValidationResult } from "../_lib/types";
import { SaturationForm } from "./SaturationForm";
import { ThemeConfirm } from "./ThemeConfirm";
import { EmailGate } from "./EmailGate";
import { SCORE_MIN_MS, ScoringState, useScoringProgress } from "./ScoringState";
import { SaturationReportView } from "./SaturationReport";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function SaturationApp() {
  const searchParams = useSearchParams();
  const autoStarted = useRef(false);
  const [input, setInput] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<PageStatus>("idle");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [examples, setExamples] = useState<string[]>([]);
  const [pendingValidation, setPendingValidation] = useState<ValidationResult | null>(
    null
  );
  const [pendingConfirmTheme, setPendingConfirmTheme] = useState(false);
  const [report, setReport] = useState<SaturationReport | null>(null);

  const scoringProgress = useScoringProgress(status === "scoring");

  useEffect(() => {
    setEmail(getStoredSaturationEmail());
  }, []);

  const resetErrors = () => {
    setError("");
    setEmailError("");
    setExamples([]);
  };

  const runScore = useCallback(
    async (value: string, userEmail: string, confirmTheme: boolean) => {
      setStatus("scoring");
      setReport(null);
      resetErrors();
      const started = Date.now();

      try {
        const result = await scoreSaturation(value, userEmail, confirmTheme);
        // Pad to ~15s only on success so the step theater always plays
        const elapsed = Date.now() - started;
        if (elapsed < SCORE_MIN_MS) {
          await delay(SCORE_MIN_MS - elapsed);
        }
        setReport(result);
        setStatus("done");
        setPendingValidation(null);
        setPendingConfirmTheme(false);
      } catch (err) {
        if (err instanceof SaturationApiError) {
          if (err.status === 422) {
            setPendingValidation({
              status: "needs_confirm",
              level: Number(err.payload.level ?? 3),
              code: String(err.payload.code ?? "theme"),
              message: err.message,
              normalized_input: String(err.payload.normalized_input ?? value),
              examples: Array.isArray(err.payload.examples)
                ? (err.payload.examples as string[])
                : [],
              suggested_rewrite:
                typeof err.payload.suggested_rewrite === "string"
                  ? err.payload.suggested_rewrite
                  : null,
              is_theme: Boolean(err.payload.is_theme),
            });
            setStatus("confirm");
            return;
          }
          if (
            err.status === 403 ||
            err.payload.code === "disposable_email" ||
            err.payload.code === "alias_email" ||
            err.payload.code === "email_blocked" ||
            String(err.message).toLowerCase().includes("email")
          ) {
            setEmailError(err.message);
            setStatus("email");
            return;
          }
          setError(err.message);
          setExamples(
            Array.isArray(err.payload.examples) ? (err.payload.examples as string[]) : []
          );
          setStatus("error");
          return;
        }
        setError("Could not reach the API. Is the server running?");
        setStatus("error");
      }
    },
    []
  );

  const proceedToEmailOrScore = useCallback(
    (value: string, confirmTheme: boolean) => {
      setPendingConfirmTheme(confirmTheme);
      const stored = getStoredSaturationEmail() || email;
      if (stored) {
        setEmail(stored);
        void runScore(value, stored, confirmTheme);
        return;
      }
      setStatus("email");
    },
    [email, runScore]
  );

  const handleSubmit = useCallback(
    async (override?: string) => {
      const value = (override ?? input).trim();
      if (!value) return;

      setStatus("validating");
      resetErrors();
      setPendingValidation(null);
      setReport(null);

      try {
        const v = await validateSaturationInput(value, false);

        if (v.status === "reject") {
          setError(v.message);
          setExamples(v.examples ?? []);
          setStatus("error");
          return;
        }

        if (v.status === "needs_confirm") {
          setPendingValidation(v);
          setStatus("confirm");
          return;
        }

        proceedToEmailOrScore(value, false);
      } catch {
        setError("Could not reach the API. Is the server running?");
        setStatus("error");
      }
    },
    [input, proceedToEmailOrScore]
  );

  // Prefill from homepage ?q= — validate only; still require email before score
  useEffect(() => {
    const q = searchParams.get("q");
    if (!q || autoStarted.current) return;
    autoStarted.current = true;
    setInput(q);
    void handleSubmit(q);
  }, [searchParams, handleSubmit]);

  const handleConfirmTheme = () => {
    const value = pendingValidation?.normalized_input || input.trim();
    proceedToEmailOrScore(value, true);
  };

  const handleEmailSubmit = (nextEmail: string) => {
    storeSaturationEmail(nextEmail);
    setEmail(nextEmail);
    const value =
      pendingValidation?.normalized_input?.trim() ||
      input.trim();
    if (!value) {
      setStatus("idle");
      return;
    }
    void runScore(value, nextEmail, pendingConfirmTheme);
  };

  const handleRefine = (rewrite?: string) => {
    if (rewrite) setInput(rewrite);
    setPendingValidation(null);
    setPendingConfirmTheme(false);
    setStatus("idle");
    resetErrors();
  };

  const handleReset = () => {
    setReport(null);
    setPendingValidation(null);
    setPendingConfirmTheme(false);
    setStatus("idle");
    resetErrors();
  };

  const busy = status === "validating" || status === "scoring";
  const formLocked =
    status === "validating" ||
    status === "scoring" ||
    status === "email" ||
    status === "confirm";
  const ideaLabel =
    pendingValidation?.normalized_input || input.trim() || "your idea";

  return (
    <div>
      <SaturationForm
        value={input}
        loading={busy}
        disabled={formLocked}
        error={status === "error" ? error : ""}
        examples={examples}
        onChange={(v) => {
          setInput(v);
          if (status === "error") {
            setStatus("idle");
            resetErrors();
          }
        }}
        onSubmit={() => void handleSubmit()}
        onPickExample={(ex) => {
          setInput(ex);
          setStatus("idle");
          resetErrors();
        }}
      />

      {status === "confirm" && pendingValidation && (
        <ThemeConfirm
          idea={pendingValidation.normalized_input || input}
          message={pendingValidation.message}
          examples={pendingValidation.examples}
          suggestedRewrite={pendingValidation.suggested_rewrite}
          onConfirm={handleConfirmTheme}
          onRefine={handleRefine}
          loading={false}
        />
      )}

      {status === "email" && (
        <EmailGate
          idea={ideaLabel}
          initialEmail={email}
          error={emailError}
          onSubmit={handleEmailSubmit}
          onBack={() => {
            setStatus(pendingValidation?.status === "needs_confirm" ? "confirm" : "idle");
            setEmailError("");
          }}
        />
      )}

      {status === "scoring" && (
        <ScoringState
          activeStage={scoringProgress.activeStage}
          progressPct={scoringProgress.progressPct}
        />
      )}

      {status === "done" && report && (
        <SaturationReportView report={report} onReset={handleReset} />
      )}
    </div>
  );
}
