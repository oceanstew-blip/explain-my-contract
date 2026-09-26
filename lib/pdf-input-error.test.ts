import "pdf-parse/worker";
import { readFileSync } from "node:fs";
import { FormatError, InvalidPDFException, PasswordException, PDFParse } from "pdf-parse";
import { describe, expect, it } from "vitest";
import { pdfInputErrorMessage } from "./pdf-input-error";

describe("PDF upload recovery", () => {
  it("identifies a real parser failure for a damaged file with a valid PDF header", async () => {
    const parser = new PDFParse({ data: new TextEncoder().encode("%PDF-1.7\nThis fictional file is intentionally damaged.\n%%EOF"), verbosity: 0 });
    try {
      await expect(parser.getText()).rejects.toSatisfy((error: unknown) =>
        error instanceof InvalidPDFException &&
        pdfInputErrorMessage(error)?.includes("Export a new PDF") === true,
      );
    } finally {
      await parser.destroy();
    }
  });

  it("recognizes an actual encrypted PDF before requesting model analysis", async () => {
    const data = new Uint8Array(readFileSync(new URL("./fixtures/password-protected-test.pdf", import.meta.url)));
    const parser = new PDFParse({ data, verbosity: 0 });
    try {
      await expect(parser.getText()).rejects.toSatisfy((error: unknown) =>
        error instanceof PasswordException &&
        pdfInputErrorMessage(error)?.includes("Upload an unlocked copy") === true,
      );
    } finally {
      await parser.destroy();
    }
  });

  it("gives unlocked-copy guidance without exposing parser details or asking for a password", () => {
    const message = pdfInputErrorMessage(new PasswordException("sensitive parser detail"));
    expect(message).toContain("Upload an unlocked copy");
    expect(message).not.toContain("sensitive parser detail");
  });

  it("recognizes PDF format errors without mislabeling unrelated failures as user mistakes", () => {
    expect(pdfInputErrorMessage(new FormatError("invalid object"))).toContain("damaged or incomplete");
    expect(pdfInputErrorMessage(new Error("worker unavailable"))).toBeUndefined();
    expect(pdfInputErrorMessage({ name: "PasswordException" })).toBeUndefined();
  });
});
