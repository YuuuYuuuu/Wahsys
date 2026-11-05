import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { isS3Configured, putItemImageObject } from "@/lib/services/s3.service";

const ITEM_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function extForType(contentType: string): string {
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  return ".jpg";
}

async function saveItemImageLocal(
  itemId: string,
  contentType: string,
  body: Buffer
): Promise<string> {
  if (!ITEM_IMAGE_TYPES.has(contentType)) {
    throw new Error("Hanya gambar JPEG, PNG, atau WebP");
  }
  const base = `${randomUUID()}${extForType(contentType)}`;
  const dir = path.join(process.cwd(), "public", "uploads", "items", itemId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, base), body);
  return `/uploads/items/${itemId}/${base}`;
}

/** S3 if configured; otherwise files under `public/uploads/items`. */
export async function storeItemImage(
  itemId: string,
  filename: string,
  contentType: string,
  body: Buffer
): Promise<string> {
  if (isS3Configured()) {
    return putItemImageObject(itemId, filename, contentType, body);
  }
  return saveItemImageLocal(itemId, contentType, body);
}
