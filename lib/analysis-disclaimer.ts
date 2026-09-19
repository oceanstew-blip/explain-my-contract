export const ANALYSIS_DISCLAIMER_VERSION = "2026-09-19";
export const ANALYSIS_DISCLAIMER_TEXT =
  "I understand Explain My Contract Now provides educational analysis, not legal advice.";

export function hasAcknowledgedAnalysisDisclaimer(value: FormDataEntryValue | null) {
  return value === "true";
}
