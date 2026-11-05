import { z } from "zod";
import { OvertimeRequestStatus } from "@prisma/client";

/** Snapshot harus memuat field inti form lembur (string untuk kompatibilitas UI). */
export const overtimeFormSnapshotSchema = z.object({
  companyLogoUrl: z.string(),
  companyName: z.string(),
  companyUnit: z.string(),
  companyAddress: z.string(),
  companyContact: z.string(),
  employeeName: z.string(),
  employeeNip: z.string(),
  employeeGroup: z.string(),
  employeeUnit: z.string(),
  overtimeDay: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  totalHours: z.string(),
  activityDescription: z.string(),
  signCityDate: z.string(),
  approverName: z.string(),
  approverPosition: z.string(),
  approverNip: z.string(),
  executorName: z.string(),
  executorSignatureUrl: z.string(),
  approverSignatureUrl: z.string(),
});

export const overtimeRequestCreateSchema = z.object({
  formSnapshot: overtimeFormSnapshotSchema,
  /** true = simpan DRAFT, false/omit = langsung MENUNGGU */
  asDraft: z.boolean().optional(),
});

export const overtimeRequestUpdateSchema = z.object({
  formSnapshot: overtimeFormSnapshotSchema,
});

export const overtimeRequestListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.nativeEnum(OvertimeRequestStatus).optional(),
});

export const overtimeRequestReviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export type OvertimeFormSnapshotInput = z.infer<typeof overtimeFormSnapshotSchema>;
