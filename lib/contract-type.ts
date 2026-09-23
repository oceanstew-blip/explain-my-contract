import { z } from "zod";

export const contractTypeSchema = z.enum([
  "rental_lease",
  "brand_deal",
  "insurance_policy",
  "other",
]);

export type ContractType = z.infer<typeof contractTypeSchema>;

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  rental_lease: "Rental or lease",
  brand_deal: "Brand deal",
  insurance_policy: "Insurance policy (early beta)",
  other: "Another kind of contract",
};

export const CONTRACT_ROLE_OPTIONS: Record<ContractType, readonly string[]> = {
  rental_lease: ["Tenant", "Landlord", "Property manager", "Guarantor", "Other"],
  brand_deal: ["Creator or influencer", "Brand", "Agency", "Talent manager", "Other"],
  insurance_policy: ["Policyholder", "Business owner", "Insured person", "Beneficiary", "Other"],
  other: ["Client", "Service provider", "Employee", "Business owner", "Other"],
};
