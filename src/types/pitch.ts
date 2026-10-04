import { z } from "zod";

export const PitchStatusSchema = z.enum(["LOCKED", "DEVELOPING", "UNKNOWN", "RETIRED"]);
export const PitchKindSchema = z.enum(["METRIC", "CUSTOMER_PROOF", "DISCOUNT", "NO_DISCOUNT"]);

export const PitchFactInputSchema = z.object({
  productId: z.string().min(1),
  kind: PitchKindSchema,
  title: z.string().min(1),
  status: PitchStatusSchema.default("LOCKED"),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  customerName: z.string().min(1).nullable().default(null)
});

export type PitchStatus = z.infer<typeof PitchStatusSchema>;
export type PitchKind = z.infer<typeof PitchKindSchema>;
export type PitchFactInput = z.infer<typeof PitchFactInputSchema>;
