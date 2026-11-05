import { z } from "zod";
import { LoanPolicy } from "@prisma/client";

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  loanPolicy: z.nativeEnum(LoanPolicy).optional(),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  loanPolicy: z.nativeEnum(LoanPolicy).optional(),
});
