import { apiFetch } from "@/lib/api-client";
import { encryptFileBytes } from "@/lib/vault-crypto";

export const VAULT_ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024;

export type CredentialUploadRef = { id: string; salt: string };

type ApiFetchFn = typeof apiFetch;

function messageFromApiBody(text: string, fallback: string) {
  try {
    const j = JSON.parse(text) as { error?: string };
    if (j?.error) return j.error;
  } catch {
    /* plain */
  }
  return text.trim() || fallback;
}

/**
 * Enkripsi di browser, lalu unggah (S3 presign + PUT, atau fallback POST encrypted-upload).
 */
export async function uploadEncryptedCredentialAttachment(
  passphrase: string,
  cred: CredentialUploadRef,
  file: File,
  fetchApi: ApiFetchFn
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (file.size > VAULT_ATTACHMENT_MAX_BYTES) {
    return { ok: false, message: `Ukuran maks. ${VAULT_ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB per file` };
  }

  let ciphertext: ArrayBuffer;
  let iv: string;
  try {
    const buf = await file.arrayBuffer();
    const enc = await encryptFileBytes(passphrase, cred.salt, buf);
    iv = enc.iv;
    ciphertext = enc.ciphertext;
  } catch {
    return { ok: false, message: "Gagal mengenkripsi file" };
  }

  const ctLen = ciphertext.byteLength;
  if (ctLen > VAULT_ATTACHMENT_MAX_BYTES) {
    return { ok: false, message: "File terlalu besar setelah enkripsi" };
  }

  const pres = await fetchApi(`/api/credentials/${cred.id}/presign`, {
    method: "POST",
    body: JSON.stringify({
      fileName: file.name,
      fileType: "application/octet-stream",
      fileSize: ctLen,
    }),
  });

  if (pres.ok) {
    const { uploadUrl, fileUrl, fileName } = (await pres.json()) as {
      uploadUrl: string;
      fileUrl: string;
      fileName: string;
    };
    const put = await fetch(uploadUrl, {
      method: "PUT",
      body: ciphertext,
      headers: { "Content-Type": "application/octet-stream" },
    });
    if (!put.ok) {
      return { ok: false, message: "Upload ke storage gagal" };
    }
    const att = await fetchApi(`/api/credentials/${cred.id}/files`, {
      method: "POST",
      body: JSON.stringify({
        fileName,
        fileUrl,
        fileType: file.type || "application/octet-stream",
        fileSize: ctLen,
        iv,
      }),
    });
    if (!att.ok) {
      const t = await att.text();
      return { ok: false, message: messageFromApiBody(t, "Gagal simpan metadata file") };
    }
    return { ok: true };
  }

  if (pres.status !== 503) {
    const t = await pres.text();
    return { ok: false, message: messageFromApiBody(t, "Presign gagal") };
  }

  const fd = new FormData();
  fd.append("file", new Blob([ciphertext], { type: "application/octet-stream" }), "blob.enc");
  fd.append("fileName", file.name);
  fd.append("iv", iv);
  if (file.type) fd.append("originalMime", file.type);

  const local = await fetchApi(`/api/credentials/${cred.id}/encrypted-upload`, {
    method: "POST",
    body: fd,
  });
  if (!local.ok) {
    const t = await local.text();
    return { ok: false, message: messageFromApiBody(t, "Unggah lokal gagal") };
  }
  return { ok: true };
}
