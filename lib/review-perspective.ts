import { z } from "zod";

export const reviewPerspectiveSchema = z.string().trim().min(2).max(120);

export type ReviewPerspective = z.infer<typeof reviewPerspectiveSchema>;
