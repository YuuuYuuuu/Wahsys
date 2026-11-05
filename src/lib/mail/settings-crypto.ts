import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function key32(): Buffer {
  const k = process.env.SMTP_CREDENTIALS_KEY;
  if (!k || k.length < 16) {
    throw new Error("SMTP_CREDENTIALS_KEY must be set (min 16 chars) for encrypted SMTP password storage");
  }
  return createHash("sha256").update(k).digest();
}

/** Returns "iv:tag:ciphertext" base64url-ish safe for DB */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key32(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptSecret(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return "";
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key32(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
