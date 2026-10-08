import { z } from "zod";
const list = z.array(z.string().trim().min(3, "Use at least 3 characters per item.").max(500)).min(1).max(8);
export const hiringDraftSchema = z.object({
  suggestedTitle: z.string().trim().min(3, "Role title needs at least 3 characters.").max(200),
  operationalReason: z.string().trim().min(3).max(1500), summary: z.string().trim().min(3).max(3000),
  responsibilities: list, focusAreas: list,
});
export const careerApprovalSchema = z.object({
  jobTitle: z.string().trim().min(3, "Career title needs at least 3 characters.").max(200),
  description: z.string().trim().min(3, "Career description needs at least 3 characters.").max(12000),
});
