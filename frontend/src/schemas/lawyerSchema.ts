import { z } from "zod";

export const lawyerSchema = z.object({
  name: z.string().trim().min(1, "Full name is required.").max(200),
  email: z.string().trim().email("Enter a valid email address.").max(200),
  phoneNumber: z.string().max(50),
  qualification: z.string().max(200),
  experience: z.number().int("Experience must be a whole number.").min(0, "Experience must be between 0 and 70 years.").max(70, "Experience must be between 0 and 70 years."),
  licenseNumber: z.string().trim().min(1, "License number is required.").max(100),
  profileDescription: z.string().max(2000),
  category: z.string().trim().min(1, "Select one Practice Area."),
  password: z.string().max(128),
});
export type LawyerFormValues = z.infer<typeof lawyerSchema>;
