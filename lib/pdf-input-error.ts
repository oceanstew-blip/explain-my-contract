import { FormatError, InvalidPDFException, PasswordException } from "pdf-parse";

/** Combined parser text includes generated page markers, even for blank pages. */
export function hasReadablePdfText(pages: ReadonlyArray<{ text: string }>): boolean {
  return pages.some((page) => page.text.trim().length > 0);
}

/** Return actionable file guidance only for known input errors, never runtime failures. */
export function pdfInputErrorMessage(error: unknown): string | undefined {
  if (error instanceof PasswordException) {
    return "This PDF is password-protected. Upload an unlocked copy to continue.";
  }
  if (error instanceof InvalidPDFException || error instanceof FormatError) {
    return "This PDF appears damaged or incomplete. Export a new PDF from the original document and try that copy.";
  }
  return undefined;
}
