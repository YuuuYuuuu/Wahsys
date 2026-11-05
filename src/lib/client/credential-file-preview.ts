/**
 * Fetch ciphertext blob (same-origin path or absolute URL) for client-side vault decrypt.
 */
export async function fetchEncryptedCredentialBlob(fileUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(fileUrl, { credentials: "omit", cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Gagal mengambil file (${res.status})`);
  }
  return res.arrayBuffer();
}

function mostlyPrintableUtf8(text: string, sample = 8000): boolean {
  const n = Math.min(text.length, sample);
  if (n === 0) return true;
  let bad = 0;
  for (let i = 0; i < n; i++) {
    const c = text.charCodeAt(i);
    if (c === 9 || c === 10 || c === 13) continue;
    if (c < 32 || c === 0xfffd) bad++;
  }
  return bad / n < 0.02;
}

export type VaultFilePreview =
  | { kind: "image"; objectUrl: string }
  | { kind: "text"; text: string }
  | { kind: "pdf"; objectUrl: string }
  | { kind: "unsupported"; mime: string };

/** Build preview after decrypt; caller must URL.revokeObjectURL for image/pdf kinds. */
export function buildVaultFilePreview(originalMime: string, plain: ArrayBuffer): VaultFilePreview {
  const mime = (originalMime || "application/octet-stream").split(";")[0]!.trim().toLowerCase();
  const blobOf = (type: string) => new Blob([plain], { type: type || "application/octet-stream" });

  if (mime.startsWith("image/")) {
    return { kind: "image", objectUrl: URL.createObjectURL(blobOf(mime)) };
  }
  if (mime === "application/pdf") {
    return { kind: "pdf", objectUrl: URL.createObjectURL(blobOf("application/pdf")) };
  }
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/javascript"
  ) {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(plain);
    return { kind: "text", text };
  }

  const asUtf8 = new TextDecoder("utf-8", { fatal: false }).decode(plain);
  if (mostlyPrintableUtf8(asUtf8)) {
    return { kind: "text", text: asUtf8 };
  }

  return { kind: "unsupported", mime };
}

export function revokeVaultPreview(p: VaultFilePreview | null) {
  if (!p) return;
  if (p.kind === "image" || p.kind === "pdf") {
    URL.revokeObjectURL(p.objectUrl);
  }
}
