import { z } from 'zod';
export const credentials = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((s) => s.toLowerCase()),
    password: z.string().min(12).max(128),
  })
  .strict();
export const resetPasswordBody = z
  .object({ token: z.string().min(40).max(100), password: z.string().min(12).max(128) })
  .strict();
