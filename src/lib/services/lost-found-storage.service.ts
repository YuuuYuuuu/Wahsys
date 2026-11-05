import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { isS3Configured, putItemImageObject } from "@/lib/services/s3.service";

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function extForType(contentType: string): string {
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  return ".jpg";
}

async function saveLostFoundImageLocal(
  subfolder: string,
  contentType: string,
  body: Buffer
): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    throw new Error("Hanya file gambar JPEG, PNG, atau WebP yang diperbolehkan.");
  }
  const filename = `${randomUUID()}${extForType(contentType)}`;
  const dir = path.join(process.cwd(), "public", "uploads", "lost-found", subfolder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), body);
  return `/uploads/lost-found/${subfolder}/${filename}`;
}

export async function storeLostFoundImage(
  subfolder: string,
  filename: string,
  contentType: string,
  body: Buffer
): Promise<string> {
  if (isS3Configured()) {
    return putItemImageObject(`lost-found/${subfolder}`, filename, contentType, body);
  }
  return saveLostFoundImageLocal(subfolder, contentType, body);
}

