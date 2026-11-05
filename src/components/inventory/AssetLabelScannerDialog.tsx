"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { detectAssetLabelFromPhoto, type AssetLabelDetectResult } from "@/lib/client/asset-label-detect";

type ScannerPayload = {
  externalAssetCode: string | null;
  itemName: string | null;
  qrImageFile: File | null;
  warnings: string[];
  ocrText: string;
};

export function AssetLabelScannerDialog({
  open,
  onOpenChange,
  onUseResult,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUseResult: (payload: ScannerPayload) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AssetLabelDetectResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  async function startCamera() {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCameraError("Kamera tidak tersedia. Gunakan unggah foto sebagai fallback.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  useEffect(() => {
    if (!open) {
      stopCamera();
      setResult(null);
      setBusy(false);
      setCameraError(null);
      return;
    }
    void startCamera();
    return () => stopCamera();
  }, [open]);

  async function runDetect(file: File) {
    setBusy(true);
    try {
      const detected = await detectAssetLabelFromPhoto(file);
      setResult(detected);
    } finally {
      setBusy(false);
    }
  }

  async function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
    if (!blob) return;
    const file = new File([blob], `asset-label-${Date.now()}.jpg`, { type: "image/jpeg" });
    await runDetect(file);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan Label Aset (Kamera)</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-md border border-border bg-black">
              <video ref={videoRef} playsInline muted className="h-64 w-full object-cover" />
            </div>
            {cameraError ? <p className="text-xs text-destructive">{cameraError}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => void captureFrame()} disabled={busy}>
                {busy ? "Mendeteksi..." : "Ambil Foto"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void startCamera()} disabled={busy}>
                Mulai Ulang Kamera
              </Button>
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                Unggah Foto
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void runDetect(f);
                }}
              />
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-border/70 p-3">
            <p className="text-sm font-medium">Hasil deteksi</p>
            <div className="space-y-1.5">
              <Label>Kode aset lembaga</Label>
              <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">
                {result?.externalAssetCode || "Belum terdeteksi"}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nama barang</Label>
              <div className="rounded-md border border-input bg-muted/40 px-3 py-2 break-all text-sm">
                {result?.itemName || "Belum terdeteksi"}
              </div>
            </div>
            {result?.qrImageFile ? (
              <div className="space-y-1.5">
                <Label>Preview foto QR</Label>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(result.qrImageFile)}
                  alt="Preview QR terdeteksi"
                  className="h-40 w-40 rounded border border-border bg-white p-2 object-contain"
                />
              </div>
            ) : null}
            {result?.warnings?.length ? (
              <div className="rounded-md border border-amber-300/50 bg-amber-50/20 p-2 text-xs text-amber-800 dark:text-amber-200">
                {result.warnings.map((w, i) => (
                  <p key={i}>- {w}</p>
                ))}
              </div>
            ) : null}
            <Button
              type="button"
              className="w-full"
              disabled={!result}
              onClick={() => {
                if (!result) return;
                onUseResult({
                  externalAssetCode: result.externalAssetCode,
                  itemName: result.itemName,
                  qrImageFile: result.qrImageFile,
                  warnings: result.warnings,
                  ocrText: result.ocrText,
                });
                onOpenChange(false);
              }}
            >
              Gunakan Hasil
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
