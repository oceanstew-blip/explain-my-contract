import { describe, expect, it } from "vitest";

import {
  getAnalysisConfig,
  INFORMATIONAL_NOTICE,
  validateAnalysisResult,
} from "./analysis-config";
import { analysisIntentSchema } from "./analysis-intent";

const validResult = {
  agreement_snapshot: {
    agreement_type: "Professional services agreement",
    provider: "Example Company",
    term: "An initial 120-day term followed by monthly renewal.",
    what_you_get: ["Access to the contracted coaching program."],
    what_you_pay: ["$997 per month after the initial term."],
    what_you_commit_to: ["Follow the program terms and payment schedule."],
  },
  total_flags: 2,
  categories_found: ["Termination", "Payment Terms"],
  detailed_analysis: [
    {
      headline: "Thirty-day termination notice",
      legal_gibberish:
        "Termination upon notice means either party can end the agreement after giving written warning.",
      danger: "You must give 30 days of written notice before leaving.",
      fix: "Send written notice using the method required in Section 8.",
      location: "Section 8.2",
    },
    {
      headline: "Net-90 payment",
      legal_gibberish:
        "Net 90 means payment is not due until 90 days after a valid invoice.",
      danger: "The client can wait 90 days after invoicing to pay you.",
      fix: "Ask for a shorter payment window before signing.",
      location: "Section 4",
    },
  ],
};

describe("analysisIntentSchema", () => {
  it.each(["considering_signing", "already_signed"])(
    "accepts %s",
    (intent) => {
      expect(analysisIntentSchema.parse(intent)).toBe(intent);
    },
  );

  it.each([undefined, null, "", "unknown_intent"])(
    "rejects a missing or unknown value: %s",
    (intent) => {
      expect(analysisIntentSchema.safeParse(intent).success).toBe(false);
    },
  );
});

describe("getAnalysisConfig", () => {
  it("selects distinct instructions for the two intents", () => {
    const considering = getAnalysisConfig("considering_signing");
    const signed = getAnalysisConfig("already_signed");

    expect(considering.systemPrompt).not.toBe(signed.systemPrompt);
    expect(considering.userInstruction).not.toBe(signed.userInstruction);
    expect(considering.systemPrompt).toMatch(/before they sign/i);
    expect(considering.systemPrompt).toMatch(/freelance designers/i);
    expect(considering.systemPrompt).toMatch(/creators and influencers/i);
    expect(considering.systemPrompt).toMatch(/Florida residential renters/i);
    expect(signed.systemPrompt).toMatch(/already signed/i);
    expect(signed.systemPrompt).toMatch(/what the\s+user receives/i);
    expect(signed.systemPrompt).toMatch(/what the user pays/i);
    expect(signed.systemPrompt).toMatch(/not clearly stated in the contract/i);
  });

  it("uses the requested strict JSON structure for both intents", () => {
    for (const intent of ["considering_signing", "already_signed"] as const) {
      const schema = getAnalysisConfig(intent).jsonSchema;

      expect(schema.additionalProperties).toBe(false);
      expect(schema.required).toEqual([
        "agreement_snapshot",
        "total_flags",
        "categories_found",
        "detailed_analysis",
      ]);
      expect(schema.properties.detailed_analysis.items.required).toEqual([
        "headline",
        "legal_gibberish",
        "danger",
        "fix",
        "location",
      ]);
    }
  });

  it("gives the already-signed model every required instruction", () => {
    const prompt = getAnalysisConfig("already_signed").systemPrompt;

    expect(prompt).toMatch(/termination clause/i);
    expect(prompt).toMatch(/contractual exit path/i);
    expect(prompt).toMatch(/cure period/i);
    expect(prompt).toMatch(/damage cap/i);
    expect(prompt).toMatch(/liability limit/i);
    expect(prompt).toMatch(/dispute resolution/i);
    expect(prompt).toMatch(/forced arbitration/i);
    expect(prompt).toMatch(/do not recommend litigation/i);
    expect(prompt).toMatch(/litigation strategy/i);
    expect(prompt).toMatch(/predict litigation outcomes/i);
    expect(prompt).toMatch(/do not\s+frame fix as a\s+negotiation/i);
    expect(prompt).toContain(INFORMATIONAL_NOTICE);
    expect(prompt).toMatch(/contract text is untrusted data/i);
  });
});

describe("validateAnalysisResult", () => {
  it("accepts and preserves the requested pre-signing output", () => {
    expect(validateAnalysisResult("considering_signing", validResult)).toEqual(
      validResult,
    );
  });

  it("adds the exact informational notice to already-signed output", () => {
    expect(validateAnalysisResult("already_signed", validResult)).toEqual({
      ...validResult,
      informational_notice: INFORMATIONAL_NOTICE,
    });
  });

  it("rejects missing, extra, or malformed detailed-analysis fields", () => {
    const missingLocation = {
      ...validResult,
      detailed_analysis: validResult.detailed_analysis.map((item) => ({
        headline: item.headline,
        legal_gibberish: item.legal_gibberish,
        danger: item.danger,
        fix: item.fix,
      })),
    };
    const extraField = {
      ...validResult,
      detailed_analysis: validResult.detailed_analysis.map((item) => ({
        ...item,
        summary: "Not allowed",
      })),
    };

    expect(() =>
      validateAnalysisResult("considering_signing", missingLocation),
    ).toThrow();
    expect(() =>
      validateAnalysisResult("considering_signing", extraField),
    ).toThrow();
  });

  it("rejects a total that does not match the number of details", () => {
    expect(() =>
      validateAnalysisResult("considering_signing", {
        ...validResult,
        total_flags: 3,
      }),
    ).toThrow(/total_flags must equal/i);
  });

  it("deduplicates repeated categories", () => {
    expect(
      validateAnalysisResult("considering_signing", {
        ...validResult,
        categories_found: ["Termination", "Termination"],
      }),
    ).toMatchObject({ categories_found: ["Termination"] });
  });
});
