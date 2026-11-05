import { z } from "zod";
import { ItemCondition, ItemKind } from "@prisma/client";

export const itemConditionEnum = z.nativeEnum(ItemCondition);
export const itemKindEnum = z.nativeEnum(ItemKind);

const imageUrlSchema = z
  .string()
  .max(2000)
  .refine(
    (s) => {
      if (s.startsWith("/")) return true;
      try {
        const u = new URL(s);
        return u.protocol === "http:" || u.protocol === "https:" || u.protocol === "s3:";
      } catch {
        return false;
      }
    },
    { message: "URL gambar tidak valid" }
  )
  .optional()
  .nullable();

const externalCodeSchema = z.string().trim().min(1).max(300).optional().nullable();
const externalQrValueSchema = z.string().trim().min(1).max(1000).optional().nullable();
const externalQrImageUrlSchema = imageUrlSchema;

export const itemCreateSchema = z.object({
  name: z.string().min(1).max(300),
  kind: itemKindEnum.optional(),
  categoryId: z.string().uuid(),
  stock: z.number().int().min(0),
  location: z.string().min(1).max(300),
  condition: itemConditionEnum.optional(),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: imageUrlSchema,
  usesExternalIdentity: z.boolean().optional(),
  externalAssetCode: externalCodeSchema,
  externalQrValue: externalQrValueSchema,
  externalQrImageUrl: externalQrImageUrlSchema,
}).superRefine((v, ctx) => {
  const hasExternalCode = Boolean(v.externalAssetCode?.trim());
  const hasExternalQr = Boolean(v.externalQrValue?.trim());
  if (v.usesExternalIdentity || hasExternalCode || hasExternalQr) {
    if (!hasExternalCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["externalAssetCode"],
        message: "Kode aset lembaga wajib diisi",
      });
    }
    if (!hasExternalQr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["externalQrValue"],
        message: "Nama barang wajib diisi",
      });
    }
  }
});

export const itemUpdateSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  categoryId: z.string().uuid().optional(),
  stock: z.number().int().min(0).optional(),
  location: z.string().min(1).max(300).optional(),
  condition: itemConditionEnum.optional(),
  description: z.string().max(2000).optional().nullable(),
  conditionNote: z.string().max(1000).optional(),
  imageUrl: imageUrlSchema,
  usesExternalIdentity: z.boolean().optional(),
  externalAssetCode: externalCodeSchema,
  externalQrValue: externalQrValueSchema,
  externalQrImageUrl: externalQrImageUrlSchema,
}).superRefine((v, ctx) => {
  const hasExternalCode = Boolean(v.externalAssetCode?.trim());
  const hasExternalQr = Boolean(v.externalQrValue?.trim());
  if (v.usesExternalIdentity || hasExternalCode || hasExternalQr) {
    if (!hasExternalCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["externalAssetCode"],
        message: "Kode aset lembaga wajib diisi",
      });
    }
    if (!hasExternalQr) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["externalQrValue"],
        message: "Nama barang wajib diisi",
      });
    }
  }
});

export const maintenanceCreateSchema = z.object({
  description: z.string().min(1).max(2000),
  cost: z.number().min(0).optional().nullable(),
});

export const itemImagePresignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
