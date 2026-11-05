import { z } from "zod";

export const smtpPatchSchema = z.object({
  host: z.string().max(500).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  secure: z.boolean().optional(),
  authUser: z.string().max(500).optional(),
  authPassword: z.string().max(500).optional().nullable(),
  fromEmail: z.string().email().max(320).optional(),
  fromName: z.string().max(200).optional(),
});

export const smtpTestSchema = z.object({
  to: z.string().email(),
});

export const emailTemplatePatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().min(1).max(500).optional(),
  bodyHtml: z.string().min(1).optional(),
});

export const reminderDaysSchema = z.object({
  daysBefore: z.number().int().min(0).max(90),
});
