"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  Trash2,
  RotateCcw,
  Check,
  SwitchCamera,
  Upload,
  AlertCircle,
} from "lucide-react";

export interface ImageUploadWithCameraProps {
  value: string | null;
  onChange: (url: string | null) => void;
  folder?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
}

export function ImageUploadWithCamera({
  value,
  onChange,
  folder = "lost",
  label = "Foto Pendukung",
  disabled = false,
  required = false,
}: ImageUploadWithCameraProps) {
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fallbackCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop current active camera stream
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Check if multiple camera devices exist
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === "videoinput");
          setHasMultipleCameras(videoInputs.length > 1);
        })
        .catch(() => {
          setHasMultipleCameras(false);
        });
    }
  }, []);

  // Start camera stream
  const startCameraStream = useCallback(async (mode: "environment" | "user") => {
    stopCameraStream();
    setCameraError(null);
    setCapturedBlob(null);
    setCapturedPreview(null);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Browser Anda tidak mendukung akses kamera langsung.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Tidak dapat membuka kamera.";
      setCameraError(
        message.includes("Permission") || message.includes("NotAllowed")
          ? "Izin akses kamera ditolak. Silakan berikan izin di pengaturan browser atau gunakan tombol 'Pilih File Kamera' di bawah."
          : `Gagal mengakses kamera (${message}). Anda tetap dapat mengambil foto dengan kamera perangkat menggunakan tombol di bawah.`
      );
    }
  }, [stopCameraStream]);

  // Manage camera lifecycle with modal open/close
  useEffect(() => {
    if (cameraModalOpen) {
      void startCameraStream(facingMode);
    } else {
      stopCameraStream();
      setCapturedBlob(null);
      if (capturedPreview) {
        URL.revokeObjectURL(capturedPreview);
        setCapturedPreview(null);
      }
      setCameraError(null);
    }
    return () => {
      stopCameraStream();
    };
  }, [cameraModalOpen, facingMode, startCameraStream, stopCameraStream]);

  // Flip camera between front and back
  function toggleCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  // Shutter click - capture frame from video stream
  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      toast({ variant: "destructive", title: "Kamera belum siap, tunggu beberapa detik." });
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // If front camera, mirror image for natural feeling
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast({ variant: "destructive", title: "Gagal mengambil foto dari kamera." });
          return;
        }
        setCapturedBlob(blob);
        const previewUrl = URL.createObjectURL(blob);
        setCapturedPreview(previewUrl);
        // Stop stream while reviewing captured photo
        stopCameraStream();
      },
      "image/jpeg",
      0.9
    );
  }

  // Retake photo
  function retakePhoto() {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
      setCapturedPreview(null);
    }
    setCapturedBlob(null);
    void startCameraStream(facingMode);
  }

  // Upload file helper
  async function uploadFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Ukuran file maksimal 5 MB" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await apiFetch("/api/lost-found/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal mengunggah foto");
      }

      const json = await res.json();
      onChange(json.url);
      toast({ title: "Foto berhasil diunggah" });
      setCameraModalOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: (e as Error).message });
    } finally {
      setUploading(false);
    }
  }

  // Use captured photo and upload
  async function handleUseCapturedPhoto() {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
    await uploadFile(file);
  }

  // Handle gallery / file select
  async function handleGallerySelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    // Reset input so same file can be selected again if needed
    e.target.value = "";
  }

  // Handle fallback native camera file select (mobile capture="environment")
  async function handleFallbackCameraSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        {uploading && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" /> Mengunggah...
          </span>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleGallerySelect}
        disabled={disabled || uploading}
      />
      <input
        ref={fallbackCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFallbackCameraSelect}
        disabled={disabled || uploading}
      />

      {/* Case 1: Image already uploaded */}
      {value ? (
        <div className="relative rounded-lg border border-border bg-muted/20 p-2">
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="Preview foto barang" className="h-full w-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Foto berhasil terlampir
              </p>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{value.split("/").pop()}</p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[11px] gap-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || uploading}
                >
                  <ImageIcon className="h-3 w-3" /> Ganti Galeri
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[11px] gap-1"
                  onClick={() => setCameraModalOpen(true)}
                  disabled={disabled || uploading}
                >
                  <Camera className="h-3 w-3" /> Ambil Kamera
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 gap-1 ml-auto"
                  onClick={() => onChange(null)}
                  disabled={disabled || uploading}
                >
                  <Trash2 className="h-3 w-3" /> Hapus
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Case 2: No image yet - Show dual options (Galeri & Kamera Langsung) */
        <div className="grid grid-cols-2 gap-2">
          {/* Opsi 1: Galeri */}
          <Button
            type="button"
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-1.5 border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            <div className="rounded-full bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium">Buka Galeri</p>
              <p className="text-[10px] text-muted-foreground">Pilih file foto</p>
            </div>
          </Button>

          {/* Opsi 2: Kamera Langsung */}
          <Button
            type="button"
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-1.5 border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all"
            onClick={() => setCameraModalOpen(true)}
            disabled={disabled || uploading}
          >
            <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <Camera className="h-4 w-4" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium">Kamera Langsung</p>
              <p className="text-[10px] text-muted-foreground">Jepret foto sekarang</p>
            </div>
          </Button>
        </div>
      )}

      {/* Modal Kamera Interaktif Langsung */}
      <Dialog open={cameraModalOpen} onOpenChange={setCameraModalOpen}>
        <DialogContent className="sm:max-w-md p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" />
                {capturedPreview ? "Pratinjau Hasil Foto" : "Jepret Foto Langsung"}
              </span>
              {!capturedPreview && hasMultipleCameras && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={toggleCamera}
                  title="Ganti Kamera Depan/Belakang"
                >
                  <SwitchCamera className="h-3.5 w-3.5" /> Ganti Kamera
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Camera Viewfinder or Captured Preview */}
          <div className="relative overflow-hidden rounded-lg bg-black aspect-4/3 flex items-center justify-center border border-border shadow-inner">
            {cameraError ? (
              <div className="p-4 text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
                <p className="text-xs text-white/90 leading-relaxed max-w-xs mx-auto">{cameraError}</p>
                <Button
                  type="button"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => fallbackCameraInputRef.current?.click()}
                >
                  <Camera className="h-3.5 w-3.5" /> Buka Kamera Perangkat
                </Button>
              </div>
            ) : capturedPreview ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={capturedPreview}
                alt="Hasil jepretan kamera"
                className="h-full w-full object-contain"
              />
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`h-full w-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
              />
            )}

            {/* Viewfinder crosshair overlay when camera is live */}
            {!cameraError && !capturedPreview && (
              <div className="pointer-events-none absolute inset-0 border border-white/20 rounded-lg m-4 flex items-center justify-center">
                <div className="w-12 h-12 border border-white/40 rounded-full" />
              </div>
            )}
          </div>

          {/* Action buttons inside Dialog */}
          <DialogFooter className="pt-2 sm:justify-between flex-row items-center gap-2">
            {capturedPreview ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 flex-1"
                  onClick={retakePhoto}
                  disabled={uploading}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Ambil Ulang
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="text-xs gap-1.5 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleUseCapturedPhoto}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengunggah...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Gunakan Foto Ini
                    </>
                  )}
                </Button>
              </>
            ) : !cameraError ? (
              <div className="flex items-center justify-between w-full">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setCameraModalOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="default"
                  className="rounded-full h-12 w-12 p-0 bg-white hover:bg-neutral-200 text-black shadow-lg border-4 border-emerald-500 hover:scale-105 active:scale-95 transition-all"
                  onClick={capturePhoto}
                  title="Jepret Foto"
                >
                  <Camera className="h-5 w-5 text-emerald-700" />
                </Button>
                <div className="w-12" /> {/* Spacer */}
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs w-full"
                onClick={() => setCameraModalOpen(false)}
              >
                Tutup
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

