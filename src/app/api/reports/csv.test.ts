import { describe, expect, it } from "vitest";
import { csvCell, csvHeaders, serializeCsv } from "./csv";

describe("CSV report formatting", () => {
  it("quotes every field and doubles embedded quotes", () => {
    expect(csvCell('North, "Block"')).toBe('"North, ""Block"""');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(1200)).toBe('"1200"');
  });

  it("prefixes exported rows with a UTF-8 BOM and separates them with CRLF", () => {
    expect(serializeCsv([["Project", "Amount"], ["Renovation", "₹1,20,000"]]))
      .toBe('\uFEFF"Project","Amount"\r\n"Renovation","₹1,20,000"');
  });

  it("uses a stable dated attachment name", () => {
    expect(csvHeaders("expenses", new Date("2026-11-17T15:00:00Z"))).toMatchObject({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="projectpulse-expenses-2026-11-17.csv"',
      "X-Content-Type-Options": "nosniff",
    });
  });
});
