import { describe, expect, it } from "vitest";
import { validateDocumentFile } from "./file-validation";

describe("validateDocumentFile", () => {
  it("accepts supported extensions only with their matching MIME type", () => {
    expect(validateDocumentFile("budget.PDF", "application/pdf", 100)).toBeNull();
    expect(validateDocumentFile("people.csv", "text/csv", 100)).toBeNull();
  });

  it("rejects unsupported extensions and mismatched MIME types", () => {
    expect(validateDocumentFile("payload.exe", "application/octet-stream", 100)).toMatch(/not allowed/);
    expect(validateDocumentFile("report.pdf", "text/plain", 100)).toMatch(/MIME type does not match/);
  });

  it("rejects empty files and files larger than 10 MB", () => {
    expect(validateDocumentFile("empty.txt", "text/plain", 0)).toBe("Choose a non-empty file.");
    expect(validateDocumentFile("large.txt", "text/plain", 10 * 1024 * 1024 + 1)).toMatch(/10 MB/);
  });
});
