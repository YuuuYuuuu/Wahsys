import { z } from "zod";

export const overtimeSendSchema = z.object({
  to: z.string().email(),
  subject: z.string().trim().min(1).max(500),
  messageText: z.string().trim().min(1).max(20_000),
  letterHtml: z.string().trim().min(1).max(200_000).optional(),
  pdfBase64: z.string().trim().min(1).max(25_000_000).optional(),
});

export type OvertimeSendInput = z.infer<typeof overtimeSendSchema>;

