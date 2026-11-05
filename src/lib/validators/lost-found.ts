import { z } from "zod";
import { LostReportStatus, FoundItemStatus, ClaimStatus, HandoverStatus, ReceiptStatus } from "@prisma/client";

export const LOST_FOUND_CATEGORIES = [
  "Elektronik & Gadget",
  "Dokumen & Kartu Identitas",
  "Dompet & Tas",
  "Kunci & Gantungan",
  "Pakaian & Aksesoris",
  "Alat Tulis & Buku",
  "Perlengkapan Ibadah",
  "Lain-lain",
] as const;

export const lostFoundImageUrlSchema = z
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
    { message: "Format path atau URL gambar tidak valid" }
  )
  .optional()
  .nullable();

export const dateOrDatetimeSchema = z
  .string()
  .refine((s) => !isNaN(Date.parse(s)), { message: "Format tanggal tidak valid" });

export const createLostReportSchema = z.object({
  itemName: z.string().min(2, "Nama barang minimal 2 karakter").max(200),
  category: z.string().min(1, "Kategori wajib dipilih"),
  description: z.string().min(5, "Deskripsi minimal 5 karakter").max(2000),
  lastLocation: z.string().min(2, "Lokasi terakhir terlihat wajib diisi").max(200),
  lostDate: dateOrDatetimeSchema,
  imageUrl: lostFoundImageUrlSchema,
  additionalNotes: z.string().max(1000).nullable().optional(),
});

export const updateLostReportStatusSchema = z.object({
  status: z.nativeEnum(LostReportStatus),
  rejectionReason: z.string().max(500).optional(),
});

export const createFoundReportSchema = z.object({
  itemName: z.string().min(2, "Nama barang minimal 2 karakter").max(200),
  category: z.string().min(1, "Kategori wajib dipilih"),
  publicDescription: z.string().min(5, "Deskripsi publik minimal 5 karakter").max(2000),
  privateDescription: z.string().max(2000).nullable().optional(),
  foundLocation: z.string().min(2, "Lokasi penemuan wajib diisi").max(200),
  foundDate: dateOrDatetimeSchema,
  expiredAt: dateOrDatetimeSchema.nullable().optional(),
  imageUrl: lostFoundImageUrlSchema,
  finderName: z.string().max(150).nullable().optional(),
  finderContact: z.string().max(100).nullable().optional(),
  registerAsInventory: z.boolean().optional().default(false),
  storageLocation: z.string().max(200).optional(),
  condition: z.string().max(200).optional(),
});

export const registerFoundItemSchema = z.object({
  foundReportId: z.string().uuid().nullable().optional(),
  itemName: z.string().min(2).max(200),
  category: z.string().min(1),
  publicDescription: z.string().min(5).max(2000),
  privateDescription: z.string().max(2000).nullable().optional(),
  foundLocation: z.string().min(2).max(200),
  foundDate: dateOrDatetimeSchema,
  expiredAt: dateOrDatetimeSchema.nullable().optional(),
  storageLocation: z.string().min(1, "Lokasi penyimpanan fisik wajib diisi").max(200),
  condition: z.string().min(1, "Kondisi barang wajib diisi").max(200),
  imageUrl: lostFoundImageUrlSchema,
  status: z.nativeEnum(FoundItemStatus).optional().default(FoundItemStatus.AVAILABLE),
});

export const updateFoundItemSchema = z.object({
  itemName: z.string().min(2).max(200).optional(),
  category: z.string().min(1).optional(),
  publicDescription: z.string().min(5).max(2000).optional(),
  privateDescription: z.string().max(2000).nullable().optional(),
  foundLocation: z.string().min(2).max(200).optional(),
  storageLocation: z.string().min(1).max(200).optional(),
  condition: z.string().min(1).max(200).optional(),
  imageUrl: lostFoundImageUrlSchema,
  expiredAt: dateOrDatetimeSchema.nullable().optional(),
  status: z.nativeEnum(FoundItemStatus).optional(),
});

export const submitClaimSchema = z.object({
  foundItemId: z.string().uuid("ID barang temuan tidak valid"),
  ownershipDescription: z
    .string()
    .min(10, "Keterangan bukti kepemilikan minimal 10 karakter (ciri khusus, isi, nomor seri, dll)")
    .max(3000),
  evidencePhotos: z.array(z.string().refine((s) => s.startsWith("/") || s.startsWith("http://") || s.startsWith("https://"))).optional().default([]),
});

export const reviewClaimSchema = z.object({
  status: z.enum([ClaimStatus.APPROVED, ClaimStatus.REJECTED, ClaimStatus.NEED_MORE_INFO]),
  rejectionReason: z.string().max(1000).optional(),
  reviewerNotes: z.string().max(1000).optional(),
  scheduledPickupDate: z.string().datetime().optional(),
  pickupLocation: z.string().max(200).optional(),
});

export const scheduleHandoverSchema = z.object({
  scheduledAt: dateOrDatetimeSchema,
  pickupLocation: z.string().min(2).max(200),
  notes: z.string().max(1000).optional(),
});

export const completeHandoverSchema = z.object({
  notes: z.string().max(1000).optional(),
  proofPhotoUrl: lostFoundImageUrlSchema,
});

