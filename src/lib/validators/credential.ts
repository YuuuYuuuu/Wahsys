import { z } from "zod";

export const credentialCreateSchema = z.object({
  title: z.string().min(1).max(300),
  username: z.string().max(500).optional().nullable(),
  encryptedData: z.string().min(1),
  iv: z.string().min(1),
  salt: z.string().min(1),
  category: z.string().max(200).optional().nullable(),
});

export const credentialUpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  username: z.string().max(500).optional().nullable(),
  encryptedData: z.string().min(1).optional(),
  iv: z.string().min(1).optional(),
  salt: z.string().min(1).optional(),
  category: z.string().max(200).optional().nullable(),
});

export const presignSchema = z.object({
  fileName: z.string().min(1).max(500),
  fileType: z.string().min(1).max(200),
  fileSize: z.number().int().min(1).max(50 * 1024 * 1024),
});

/** FormData: fileName, iv, originalMime (opsional), file = ciphertext */
export const credentialEncryptedUploadFormSchema = z.object({
  fileName: z.string().min(1).max(500),
  iv: z.string().min(1),
  originalMime: z.string().max(200).optional(),
});
