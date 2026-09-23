import { describe, expect, it } from "vitest";

import {
  CONTRACT_ROLE_OPTIONS,
  CONTRACT_TYPE_LABELS,
  contractTypeSchema,
} from "./contract-type";

describe("contractTypeSchema", () => {
  it.each(["rental_lease", "brand_deal", "insurance_policy", "other"])(
    "accepts %s",
    (contractType) => {
      expect(contractTypeSchema.parse(contractType)).toBe(contractType);
    },
  );

  it.each([undefined, null, "", "employment"])(
    "rejects an unsupported contract type: %s",
    (contractType) => {
      expect(contractTypeSchema.safeParse(contractType).success).toBe(false);
    },
  );

  it("keeps a visible label and role choices for every contract type", () => {
    for (const contractType of contractTypeSchema.options) {
      expect(CONTRACT_TYPE_LABELS[contractType]).toBeTruthy();
      expect(CONTRACT_ROLE_OPTIONS[contractType].length).toBeGreaterThan(1);
      expect(CONTRACT_ROLE_OPTIONS[contractType]).toContain("Other");
    }
  });
});
