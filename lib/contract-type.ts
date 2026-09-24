import { z } from "zod";

export const contractTypeSchema = z.enum([
  "rental_lease",
  "employment_contractor",
  "service_agreement",
  "brand_deal",
  "vendor_purchase",
  "confidentiality",
  "coaching_membership",
  "insurance_policy",
  "other",
]);

export type ContractType = z.infer<typeof contractTypeSchema>;

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  rental_lease: "Rental or lease",
  employment_contractor: "Employment or contractor agreement",
  service_agreement: "Client or service agreement",
  brand_deal: "Brand or sponsorship deal",
  vendor_purchase: "Vendor or purchase agreement",
  confidentiality: "NDA or confidentiality agreement",
  coaching_membership: "Membership, coaching, or subscription agreement",
  insurance_policy: "Insurance policy (early beta)",
  other: "Another kind of contract",
};

export const CONTRACT_ROLE_OPTIONS: Record<ContractType, readonly string[]> = {
  rental_lease: ["Tenant", "Landlord", "Property manager", "Guarantor", "Other"],
  employment_contractor: ["Employee", "Independent contractor", "Employer", "Hiring company", "Other"],
  service_agreement: ["Client or customer", "Service provider", "Agency", "Consultant", "Other"],
  brand_deal: ["Creator or influencer", "Brand", "Agency", "Talent manager", "Other"],
  vendor_purchase: ["Buyer or customer", "Vendor or seller", "Distributor", "Guarantor", "Other"],
  confidentiality: ["Disclosing party", "Receiving party", "Both parties", "Employee or contractor", "Other"],
  coaching_membership: ["Client or member", "Coach or provider", "Business owner", "Participant", "Other"],
  insurance_policy: ["Policyholder", "Business owner", "Insured person", "Beneficiary", "Other"],
  other: ["Client", "Service provider", "Employee", "Business owner", "Other"],
};
