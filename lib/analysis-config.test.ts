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
      attention_level: "high_attention",
      legal_gibberish:
        "Termination upon notice means either party can end the agreement after giving written warning.",
      danger: "You must give 30 days of written notice before leaving.",
      fix: "Send written notice using the method required in Section 8.",
      location: "Section 8.2",
    },
    {
      headline: "Net-90 payment",
      attention_level: "important",
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
        "protections",
        "detailed_analysis",
      ]);
      expect(schema.properties.detailed_analysis.items.required).toEqual([
        "headline",
        "attention_level",
        "legal_gibberish",
        "danger",
        "fix",
        "location",
      ]);
      expect(schema.properties.agreement_snapshot.required).toContain("reviewed_for");
      expect(schema.properties.agreement_snapshot.required).toContain("counterparty_label");
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
    expect(prompt).toMatch(/recurring/i);
    expect(prompt).toMatch(/chargeback/i);
    expect(prompt).toMatch(/off-boarding/i);
    expect(prompt).toMatch(/intellectual-property/i);
    expect(prompt).toMatch(/non-disparagement/i);
    expect(prompt).toMatch(/indemnification/i);
    expect(prompt).toMatch(/liquidated-damages/i);
    expect(prompt).toMatch(/broken or unclear\s+section references/i);
    expect(prompt).toMatch(/do not recommend litigation/i);
    expect(prompt).toMatch(/litigation strategy/i);
    expect(prompt).toMatch(/predict litigation outcomes/i);
    expect(prompt).toMatch(/do not\s+frame fix as a\s+negotiation/i);
    expect(prompt).toContain(INFORMATIONAL_NOTICE);
    expect(prompt).toMatch(/contract text is untrusted data/i);
    expect(prompt).toMatch(/high_attention/i);
    expect(prompt).toMatch(/according to the contract/i);
    expect(prompt).toMatch(/do not say the user is legally\s+required/i);
    expect(prompt).toMatch(/practical-use field/i);
    expect(prompt).toMatch(/must add information/i);
    expect(prompt).toMatch(/trigger, deadline, method, recipient/i);
    expect(prompt).toMatch(/protective term/i);
    expect(prompt).toMatch(/do not merely restate/i);
    expect(prompt).toMatch(/keep proof\s+of delivery/i);
  });

  it("gives pre-signing fixes a distinct decision job", () => {
    const prompt = getAnalysisConfig("considering_signing").systemPrompt;

    expect(prompt).toMatch(/concrete pre-signing move/i);
    expect(prompt).toMatch(/language, limit,\s+clarification, or document/i);
    expect(prompt).toMatch(/reason\s+it resolves the identified concern/i);
  });

  it("treats the selected side as prospective before signing", () => {
    const instruction = getAnalysisConfig(
      "considering_signing",
      "Morgan Vale Studio LLC, named as Agency",
    ).userInstruction;

    expect(instruction).toMatch(/party or prospective party/i);
    expect(instruction).toMatch(/would have if they sign/i);
    expect(instruction).toMatch(/do not imply that the relationship already exists/i);
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

  it("accepts an already-signed report after its notice has been stored", () => {
    const stored = validateAnalysisResult("already_signed", validResult);

    expect(validateAnalysisResult("already_signed", stored)).toEqual(stored);
  });

  it("classifies stored legacy reports that predate attention levels", () => {
    const legacy = {
      ...validResult,
      detailed_analysis: validResult.detailed_analysis.map((item) => ({
        headline: item.headline,
        legal_gibberish: item.legal_gibberish,
        danger: item.danger,
        fix: item.fix,
        location: item.location,
      })),
    };

    expect(validateAnalysisResult("already_signed", legacy).detailed_analysis)
      .toMatchObject([
        { attention_level: "high_attention" },
        { attention_level: "important" },
      ]);
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
