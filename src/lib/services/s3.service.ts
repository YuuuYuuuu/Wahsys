import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function client(): S3Client | null {
  const endpoint = process.env.S3_ENDPOINT;
  const accessKey = process.env.S3_ACCESS_KEY_ID;
  const secret = process.env.S3_SECRET_ACCESS_KEY;
  const region = process.env.S3_REGION ?? "us-east-1";
  if (!accessKey || !secret || !process.env.S3_BUCKET) return null;
  return new S3Client({
    region,
    endpoint: endpoint || undefined,
    credentials: { accessKeyId: accessKey, secretAccessKey: secret },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  });
}

const ALLOWED_TYPES = new Set([
  "application/octet-stream",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
]);

const ITEM_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function isS3Configured(): boolean {
  return !!client();
}

export async function presignPut(key: string, contentType: string, expiresSec = 3600) {
  const c = client();
  const bucket = process.env.S3_BUCKET;
  if (!c || !bucket) throw new Error("S3 is not configured");
  if (!ALLOWED_TYPES.has(contentType) && !contentType.startsWith("application/")) {
    throw new Error("File type not allowed");
  }
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(c, cmd, { expiresIn: expiresSec });
  const publicBase = process.env.S3_PUBLIC_BASE_URL;
  const fileUrl = publicBase ? `${publicBase.replace(/\/$/, "")}/${key}` : `s3://${bucket}/${key}`;
  return { url, key, fileUrl };
}

export async function presignItemImagePut(
  itemId: string,
  filename: string,
  contentType: string,
  expiresSec = 3600
) {
  if (!ITEM_IMAGE_TYPES.has(contentType)) {
    throw new Error("Hanya gambar JPEG, PNG, atau WebP");
  }
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const key = `items/${itemId}/${randomUUID()}-${safeName}`;
  return presignPut(key, contentType, expiresSec);
}

/** Server-side upload when S3 is configured (avoids presigned PUT from browser). */
export async function putItemImageObject(
  itemId: string,
  filename: string,
  contentType: string,
  body: Buffer
): Promise<string> {
  if (!ITEM_IMAGE_TYPES.has(contentType)) {
    throw new Error("Hanya gambar JPEG, PNG, atau WebP");
  }
  const c = client();
  const bucket = process.env.S3_BUCKET;
  if (!c || !bucket) throw new Error("S3 is not configured");
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const key = `items/${itemId}/${randomUUID()}-${safeName}`;
  await c.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  const publicBase = process.env.S3_PUBLIC_BASE_URL;
  return publicBase ? `${publicBase.replace(/\/$/, "")}/${key}` : `s3://${bucket}/${key}`;
}
