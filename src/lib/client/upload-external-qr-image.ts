import { apiFetch } from "@/lib/api-client";

const MAX_IMAGE = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function messageFromApiBody(text: string, fallback: string) {
  try {
    const j = JSON.parse(text) as { error?: string };
    if (j?.error) return j.error;
  } catch {
    /* noop */
  }
  return text.trim() || fallback;
}

export async function uploadExternalQrImageClient(itemId: string, file: File) {
  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error("Gunakan JPEG, PNG, atau WebP");
  }
  if (file.size > MAX_IMAGE) throw new Error("Ukuran maks. 5 MB");

  const fd = new FormData();
  fd.append("file", file);
  const res = await apiFetch(`/api/items/${itemId}/external-qr-image`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(messageFromApiBody(t, "Unggah gambar QR lembaga gagal"));
  }
}
