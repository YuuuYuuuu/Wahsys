import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const CREDENTIAL_ENCRYPTED_MAX_BYTES = 50 * 1024 * 1024;

/** Simpan ciphertext vault ke disk; URL relatif untuk CredentialFile.fileUrl */
export async function writeLocalEncryptedCredentialBlob(
  credentialId: string,
  ciphertext: Buffer
): Promise<string> {
  if (ciphertext.length > CREDENTIAL_ENCRYPTED_MAX_BYTES) {
    throw new Error("File terlalu besar (maks. 50 MB terenkripsi)");
  }
  const base = `${randomUUID()}.enc`;
  const dir = path.join(process.cwd(), "public", "uploads", "credentials", credentialId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, base), ciphertext);
  return `/uploads/credentials/${credentialId}/${base}`;
}
