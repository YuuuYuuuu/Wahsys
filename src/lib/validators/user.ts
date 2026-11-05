import { z } from "zod";
import { OrgRole, Role, StaffUnit } from "@prisma/client";

export const roleUpdateSchema = z.object({
  role: z.nativeEnum(Role),
});

export const adminCreateUserSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  role: z.nativeEnum(Role).optional(),
});

export const userOrgUpdateSchema = z
  .object({
    orgRole: z.nativeEnum(OrgRole).nullable(),
    unit: z.nativeEnum(StaffUnit).nullable(),
    supervisorId: z.string().uuid().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.orgRole === OrgRole.STAFF && !data.unit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unit wajib untuk Staff",
        path: ["unit"],
      });
    }
    if (data.orgRole === OrgRole.STAFF && !data.supervisorId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Supervisor wajib untuk Staff",
        path: ["supervisorId"],
      });
    }
    if (data.orgRole === OrgRole.KEPALA_SEKSI) {
      if (data.supervisorId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Kepala Seksi tidak memiliki supervisor",
          path: ["supervisorId"],
        });
      }
    }
    if (data.orgRole === null && (data.unit !== null || data.supervisorId !== null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Kosongkan unit dan supervisor jika tidak ikut modul kinerja",
        path: ["orgRole"],
      });
    }
  });
