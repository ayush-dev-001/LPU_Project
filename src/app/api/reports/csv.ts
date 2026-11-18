export type CsvValue = string | number | boolean | null | undefined;

export function csvCell(value: CsvValue) {
  let text = String(value ?? "");
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function serializeCsv(rows: CsvValue[][]) {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function csvHeaders(kind: string, date = new Date()) {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="projectpulse-${kind}-${date.toISOString().slice(0, 10)}.csv"`,
    "X-Content-Type-Options": "nosniff",
  };
}
