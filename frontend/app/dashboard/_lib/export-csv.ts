import type { Theme } from "../_types";

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function downloadThemesCsv(query: string, themes: Theme[]) {
  const headers = [
    "rank",
    "name",
    "demand",
    "severity",
    "mentions",
    "verdict",
    "willingness_to_pay",
    "summary",
    "opportunity",
    "competition",
    "next_step",
    "quote",
    "source_url",
  ];

  const rows = themes.flatMap((theme, i) => {
    if (theme.quotes.length === 0) {
      return [[
        i + 1,
        theme.name,
        theme.demand,
        theme.severity,
        theme.mentions,
        theme.verdict,
        theme.willingnessToPay,
        theme.summary,
        theme.opportunity,
        theme.competition,
        theme.nextStep,
        "",
        "",
      ]];
    }
    return theme.quotes.map((q, qi) => [
      qi === 0 ? i + 1 : "",
      qi === 0 ? theme.name : "",
      qi === 0 ? theme.demand : "",
      qi === 0 ? theme.severity : "",
      qi === 0 ? theme.mentions : "",
      qi === 0 ? theme.verdict : "",
      qi === 0 ? theme.willingnessToPay : "",
      qi === 0 ? theme.summary : "",
      qi === 0 ? theme.opportunity : "",
      qi === 0 ? theme.competition : "",
      qi === 0 ? theme.nextStep : "",
      q.text,
      q.url,
    ]);
  });

  const csv = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  const slug = query.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "scan";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `thynkk-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}