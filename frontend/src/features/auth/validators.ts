import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Phone or email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(8, 'Phone is required'),
  email: z
    .string()
    .trim()
    .email('Enter a valid email')
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
