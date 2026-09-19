import { describe, expect, it } from "vitest";

import { createAnalysisPreview, type AnalysisResult } from "./analysis-config";

describe("analysis preview", () => {
  it("keeps the deal snapshot and flag labels without leaking paid explanations", () => {
    const fullReport: AnalysisResult = {
      agreement_snapshot: {
        agreement_type: "Service agreement",
        provider: "Example Co.",
        term: "12 months",
        what_you_get: ["Design services"],
        what_you_pay: ["$1,000"],
        what_you_commit_to: ["Provide feedback"],
      },
      total_flags: 1,
      categories_found: ["Indemnification"],
      detailed_analysis: [
        {
          headline: "Uncapped indemnity",
          legal_gibberish: "Paid translation",
          danger: "Paid consequence",
          fix: "Paid next step",
          location: "Section 8",
        },
      ],
    };

    const preview = createAnalysisPreview(fullReport);

    expect(preview.flag_previews).toEqual([
      { headline: "Uncapped indemnity", location: "Section 8" },
    ]);
    expect(JSON.stringify(preview)).not.toContain("Paid translation");
    expect(JSON.stringify(preview)).not.toContain("Paid consequence");
    expect(JSON.stringify(preview)).not.toContain("Paid next step");
  });
});
