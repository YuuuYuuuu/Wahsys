import { z } from "zod";

export const loanCreateSchema = z.object({
  itemId: z.string().uuid(),
  borrowerName: z.string().min(1).max(300),
  quantity: z.number().int().min(1),
  loanDate: z.string().datetime(),
  location: z.string().min(1).max(300),
  dueDate: z.string().datetime().optional(),
});

export const loanReturnSchema = z.object({
  returnDate: z.string().datetime().optional(),
});

export const loanRejectSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const publicLoanRequestSchema = z.object({
  itemId: z.string().uuid(),
  borrowerName: z.string().min(1).max(300),
  borrowerEmail: z.string().email().max(320),
  borrowerPhone: z.string().min(8).max(30),
  quantity: z.number().int().min(1),
  dueDate: z.string().datetime(),
  location: z.string().max(300).optional().default(""),
});
