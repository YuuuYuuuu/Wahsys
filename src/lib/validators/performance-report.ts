import { z } from "zod";
import { PerformancePeriodType, PerformanceReportStatus, StaffUnit } from "@prisma/client";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD")
  .transform((s) => new Date(`${s}T00:00:00.000Z`));

export const performanceReportCreateSchema = z
  .object({
    periodType: z.nativeEnum(PerformancePeriodType),
    periodStart: dateOnly,
    periodEnd: dateOnly,
    activities: z.string().min(1).max(10000),
    blockers: z.string().max(5000).optional().nullable(),
    notes: z.string().max(5000).optional().nullable(),
    submit: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.periodEnd < data.periodStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tanggal akhir tidak boleh sebelum tanggal mulai",
        path: ["periodEnd"],
      });
    }
  });

export const performanceReportUpdateSchema = z
  .object({
    periodType: z.nativeEnum(PerformancePeriodType).optional(),
    periodStart: dateOnly.optional(),
    periodEnd: dateOnly.optional(),
    activities: z.string().min(1).max(10000).optional(),
    blockers: z.string().max(5000).optional().nullable(),
    notes: z.string().max(5000).optional().nullable(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Tidak ada field untuk diubah" });

export const performanceReportReviewSchema = z.object({
  reviewerNote: z.string().max(5000).optional().nullable(),
});

export const performanceReportListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(PerformanceReportStatus).optional(),
  unit: z.nativeEnum(StaffUnit).optional(),
  authorId: z.string().uuid().optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const meetingBriefQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
