"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  SaturationApiError,
  scoreSaturation,
  validateSaturationInput,
} from "../_lib/api";
import type { PageStatus, SaturationReport, ValidationResult } from "../_lib/types";
import { SaturationForm } from "./SaturationForm";
import { ThemeConfirm } from "./ThemeConfirm";
import { ScoringState } from "./ScoringState";
import { SaturationReportView } from "./SaturationReport";

export function SaturationApp() {
  const searchParams = useSearchParams();
  const autoStarted = useRef(false);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<PageStatus>("idle");
  const [error, setError] = useState("");
  const [examples, setExamples] = useState<string[]>([]);
  const [pendingValidation, setPendingValidation] = useState<ValidationResult | null>(
    null
  );
  const [report, setReport] = useState<SaturationReport | null>(null);

  const resetErrors = () => {
    setError("");
    setExamples([]);
  };

  const runScore = useCallback(async (value: string, confirmTheme: boolean) => {
    setStatus("scoring");
    setReport(null);
    resetErrors();
    try {
      const result = await scoreSaturation(value, confirmTheme);
      setReport(result);
      setStatus("done");
      setPendingValidation(null);
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
  }, []);

  const handleSubmit = useCallback(async (override?: string) => {
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

      await runScore(value, false);
    } catch {
      setError("Could not reach the API. Is the server running?");
      setStatus("error");
    }
  }, [input, runScore]);

  // Prefill + auto-run from homepage ?q=
  useEffect(() => {
    const q = searchParams.get("q");
    if (!q || autoStarted.current) return;
    autoStarted.current = true;
    setInput(q);
    void handleSubmit(q);
  }, [searchParams, handleSubmit]);

  const handleConfirmTheme = () => {
    const value = pendingValidation?.normalized_input || input.trim();
    void runScore(value, true);
  };

  const handleRefine = (rewrite?: string) => {
    if (rewrite) setInput(rewrite);
    setPendingValidation(null);
    setStatus("idle");
    resetErrors();
  };

  const handleReset = () => {
    setReport(null);
    setPendingValidation(null);
    setStatus("idle");
    resetErrors();
  };

  const busy = status === "validating" || status === "scoring";

  return (
    <div>
      <SaturationForm
        value={input}
        loading={busy}
        disabled={status === "confirm" && !busy}
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

      {status === "scoring" && <ScoringState />}

      {status === "done" && report && (
        <SaturationReportView report={report} onReset={handleReset} />
      )}
    </div>
  );
}
