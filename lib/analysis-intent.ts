import { z } from "zod";

export const analysisIntentSchema = z.enum([
  "considering_signing",
  "already_signed",
]);

export type AnalysisIntent = z.infer<typeof analysisIntentSchema>;
