import jsQR from "jsqr";
import { recognize } from "tesseract.js";

export type AssetLabelDetectResult = {
  /** Raw value decoded from QR (for debugging/inspection). */
  qrValue: string | null;
  externalAssetCode: string | null;
  /** Human readable item name extracted from OCR text on the label. */
  itemName: string | null;
  qrImageFile: File | null;
  ocrText: string;
  warnings: string[];
};

type QrBounds = { x: number; y: number; width: number; height: number };
type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string; boundingBox?: DOMRectReadOnly }>>;
};
type BarcodeDetectorCtor = {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

function pickNumericCode(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  const m = t.match(/\b\d{4,}\b/);
  return m?.[0] ?? null;
}

const INSTITUTION_LINE_MARKERS = [
  "INSTITUT",
  "TEKNOLOGI",
  "BANDUNG",
  "SARANA",
  "PRASARANA",
  "SISTEM",
  "INFORMASI",
  "JAKARTA",
  "DEMK",
  "ITB",
];

function normalizeOcrLines(text: string): string[] {
  return (text ?? "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

/** Stiker: kolom kiri ~1/3 (QR), kanan ~2/3; kotak info aset di kanan-bawah. */
function cropBottomRightInfoRegion(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = canvas.width;
  const h = canvas.height;
  const x0 = Math.floor(w * 0.32);
  const y0 = Math.floor(h * 0.5);
  const cw = Math.max(1, w - x0 - 2);
  const ch = Math.max(1, h - y0 - 2);
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  const ctx = out.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(canvas, x0, y0, cw, ch, 0, 0, cw, ch);
  return out;
}

function lineDigitsOnly(line: string): string {
  return line.replace(/\D/g, "");
}

function lineLooksLikeAssetIdLine(line: string, assetCode: string | null): boolean {
  const digitsLine = lineDigitsOnly(line);
  if (!digitsLine || digitsLine.length < 4) return false;
  if (assetCode) {
    const codeDigits = lineDigitsOnly(assetCode);
    if (!codeDigits) return false;
    if (digitsLine === codeDigits) return true;
    if (digitsLine.length >= codeDigits.length && digitsLine.includes(codeDigits)) return true;
    return false;
  }
  const compact = line.trim().replace(/\s/g, "");
  if (/^\d{4,}$/.test(compact)) return true;
  return /^[\d\s|/\\-]+$/.test(line.trim()) && digitsLine.length >= 4;
}

function isInstitutionNoiseLine(line: string): boolean {
  const upper = line.toUpperCase();
  return INSTITUTION_LINE_MARKERS.some((s) => upper.includes(s));
}

/**
 * Nama barang = baris-baris tepat setelah baris kode aset (angka) di kotak kanan-bawah,
 * sama seperti layout stiker contoh (baris 1 = kode, baris 2+ = nama).
 */
function extractItemNameAfterAssetCodeBlock(lines: string[], assetCode: string | null): string | null {
  if (!lines.length) return null;

  let anchor = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lineLooksLikeAssetIdLine(lines[i] ?? "", assetCode)) {
      anchor = i;
      break;
    }
  }

  if (anchor < 0) {
    for (let i = 0; i < lines.length; i++) {
      const d = lineDigitsOnly(lines[i] ?? "");
      if (d.length >= 4 && /^\d[\d\s-]*$/.test((lines[i] ?? "").trim())) {
        anchor = i;
        break;
      }
    }
  }

  if (anchor < 0 || anchor + 1 >= lines.length) return null;

  const parts: string[] = [];
  for (let i = anchor + 1; i < lines.length && parts.length < 6; i++) {
    const l = lines[i] ?? "";
    const t = l.trim();
    if (!t) break;
    if (isInstitutionNoiseLine(t)) break;
    if (/^20\d{2}$/.test(t)) continue;
    if (assetCode && !/[A-Za-z]/.test(t) && lineDigitsOnly(t) === lineDigitsOnly(assetCode)) continue;

    const hasLetters = /[A-Za-z]/.test(t);
    const looksLikeDescriptionTail = /[-–—]/.test(t) && parts.length > 0;
    if (!hasLetters && !looksLikeDescriptionTail) break;

    parts.push(t);
  }

  const joined = parts.join(" ").replace(/\s+/g, " ").trim();
  return joined ? joined.slice(0, 300) : null;
}

/** Fallback: OCR penuh tanpa anchor kotak (kurang akurat). */
function pickItemNameFromFullOcrHeuristic(text: string): string | null {
  const lines = normalizeOcrLines(text);
  if (!lines.length) return null;

  const filtered = lines.filter((l) => {
    if (isInstitutionNoiseLine(l)) return false;
    if (/^\d[\d\s-]*$/.test(l)) return false;
    if (/\b20\d{2}\b/.test(l) && l.length <= 8) return false;
    return /[A-Za-z]/.test(l);
  });

  if (!filtered.length) return null;
  const first = filtered[0] ?? "";
  const second = filtered[1] ?? "";
  const joined = second ? `${first} ${second}` : first;
  return joined.trim().slice(0, 300) || null;
}

async function fileToImageData(file: File): Promise<{
  canvas: HTMLCanvasElement;
  imageData: ImageData;
}> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context tidak tersedia");
  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { canvas, imageData };
}

async function detectQrBoundsWithBarcodeDetector(file: File): Promise<{ value: string; bounds: QrBounds } | null> {
  const Detector = (window as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  if (!Detector) return null;
  const supported = await Detector.getSupportedFormats?.();
  if (supported && !supported.includes("qr_code")) return null;
  const detector = new Detector({ formats: ["qr_code"] });
  const bitmap = await createImageBitmap(file);
  const found = await detector.detect(bitmap);
  if (!found.length) return null;
  const item = found[0];
  if (!item.rawValue || !item.boundingBox) return null;
  const b = item.boundingBox;
  return {
    value: item.rawValue,
    bounds: {
      x: Math.max(0, b.x),
      y: Math.max(0, b.y),
      width: Math.max(1, b.width),
      height: Math.max(1, b.height),
    },
  };
}

function detectQrBoundsWithJsQr(imageData: ImageData): { value: string; bounds: QrBounds } | null {
  const found = jsQR(imageData.data, imageData.width, imageData.height);
  if (!found?.data) return null;
  const xs = [found.location.topLeftCorner.x, found.location.topRightCorner.x, found.location.bottomLeftCorner.x, found.location.bottomRightCorner.x];
  const ys = [found.location.topLeftCorner.y, found.location.topRightCorner.y, found.location.bottomLeftCorner.y, found.location.bottomRightCorner.y];
  const x = Math.max(0, Math.floor(Math.min(...xs)));
  const y = Math.max(0, Math.floor(Math.min(...ys)));
  const maxX = Math.ceil(Math.max(...xs));
  const maxY = Math.ceil(Math.max(...ys));
  return {
    value: found.data,
    bounds: {
      x,
      y,
      width: Math.max(1, maxX - x),
      height: Math.max(1, maxY - y),
    },
  };
}

async function cropQrFile(canvas: HTMLCanvasElement, bounds: QrBounds): Promise<File | null> {
  const srcW = canvas.width;
  const srcH = canvas.height;
  const pad = Math.floor(Math.min(bounds.width, bounds.height) * 0.2);
  const x = Math.max(0, bounds.x - pad);
  const y = Math.max(0, bounds.y - pad);
  const w = Math.min(srcW - x, bounds.width + pad * 2);
  const h = Math.min(srcH - y, bounds.height + pad * 2);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/png"));
  if (!blob) return null;
  return new File([blob], `external-qr-${Date.now()}.png`, { type: "image/png" });
}

export async function detectAssetLabelFromPhoto(file: File): Promise<AssetLabelDetectResult> {
  const warnings: string[] = [];
  const { canvas, imageData } = await fileToImageData(file);

  let qr = await detectQrBoundsWithBarcodeDetector(file);
  if (!qr) qr = detectQrBoundsWithJsQr(imageData);
  if (!qr) warnings.push("QR lembaga tidak terdeteksi dari foto.");

  const externalAssetCode = qr?.value ? pickNumericCode(qr.value) ?? qr.value.trim() : null;
  if (!externalAssetCode) warnings.push("Kode aset lembaga (dari QR) belum terbaca, silakan ulangi scan.");

  const roiCanvas = cropBottomRightInfoRegion(canvas);

  let ocrText = "";
  let ocrRoiText = "";
  try {
    const [full, roi] = await Promise.all([
      recognize(canvas, "eng", { logger: () => void 0 }),
      recognize(roiCanvas, "eng", { logger: () => void 0 }),
    ]);
    ocrText = (full.data.text ?? "").trim();
    ocrRoiText = (roi.data.text ?? "").trim();
  } catch {
    warnings.push("OCR gagal dijalankan.");
  }

  const linesRoi = normalizeOcrLines(ocrRoiText);
  const linesFull = normalizeOcrLines(ocrText);

  let itemName =
    extractItemNameAfterAssetCodeBlock(linesRoi, externalAssetCode) ??
    extractItemNameAfterAssetCodeBlock(linesFull, externalAssetCode) ??
    pickItemNameFromFullOcrHeuristic(ocrText);

  if (!itemName && ocrRoiText) {
    itemName = pickItemNameFromFullOcrHeuristic(ocrRoiText);
  }

  if (!itemName) warnings.push("Nama barang belum terbaca otomatis, silakan koreksi manual.");

  const qrImageFile = qr ? await cropQrFile(canvas, qr.bounds) : null;
  if (qr && !qrImageFile) warnings.push("QR terbaca namun crop foto QR gagal.");

  return {
    qrValue: qr?.value ?? null,
    externalAssetCode,
    itemName,
    qrImageFile,
    ocrText,
    warnings,
  };
}
