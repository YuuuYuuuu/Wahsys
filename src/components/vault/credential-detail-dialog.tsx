"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decryptVaultPayload, decryptFileBytes, type VaultPayload } from "@/lib/vault-crypto";
import { apiFetch } from "@/lib/api-client";
import {
  buildVaultFilePreview,
  fetchEncryptedCredentialBlob,
  revokeVaultPreview,
  type VaultFilePreview,
} from "@/lib/client/credential-file-preview";
import { HoldToReveal } from "@/components/vault/hold-to-reveal";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

export type CredFileRow = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  iv: string | null;
  fileUrl: string;
};

export type CredDetailRow = {
  id: string;
  title: string;
  username: string | null;
  category: string | null;
  encryptedData: string;
  iv: string;
  salt: string;
  files: CredFileRow[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredDetailRow | null;
  passphrase: string;
};

type SecretsState = "idle" | "loading" | { data: VaultPayload } | "err";

type FilePreviewState =
  | { fileId: string; status: "loading" }
  | { fileId: string; status: "err" }
  | { fileId: string; status: "ok"; preview: VaultFilePreview };

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function PreviewBody({
  preview,
  size = "default",
}: {
  preview: VaultFilePreview;
  size?: "default" | "large";
}) {
  const isLarge = size === "large";
  if (preview.kind === "image") {
    return (
      <img
        src={preview.objectUrl}
        alt="Pratinjau lampiran"
        draggable={false}
        className={
          isLarge
            ? "max-h-[min(78vh,880px)] w-auto max-w-full object-contain"
            : "max-h-[min(50vh,420px)] w-auto max-w-full object-contain"
        }
      />
    );
  }
  if (preview.kind === "pdf") {
    const h = isLarge ? "min-h-[min(78vh,860px)] h-[min(78vh,860px)]" : "min-h-[min(50vh,480px)] h-[min(50vh,520px)]";
    return (
      <iframe
        title="PDF"
        src={`${preview.objectUrl}#view=FitH`}
        className={cn("w-full rounded-md border bg-background shadow-sm", h)}
      />
    );
  }
  if (preview.kind === "text") {
    return (
      <pre
        className={cn(
          "whitespace-pre-wrap break-words font-mono leading-relaxed text-foreground",
          isLarge ? "max-h-[min(70vh,720px)] overflow-auto text-sm" : "max-h-[min(45vh,400px)] overflow-auto text-xs",
        )}
      >
        {preview.text}
      </pre>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      Pratinjau tidak tersedia untuk tipe <code className="rounded bg-muted px-1">{preview.mime}</code>. Gunakan
      unduh.
    </p>
  );
}

export function CredentialDetailDialog({ open, onOpenChange, credential, passphrase }: Props) {
  const [secrets, setSecrets] = useState<SecretsState>("idle");
  const [filePreview, setFilePreview] = useState<FilePreviewState | null>(null);
  const heldPreviewRef = useRef<VaultFilePreview | null>(null);
  const secretsCredIdRef = useRef<string | null>(null);

  const revokeHeld = () => {
    revokeVaultPreview(heldPreviewRef.current);
    heldPreviewRef.current = null;
  };

  useEffect(() => {
    if (!open || !credential) {
      secretsCredIdRef.current = null;
      setSecrets("idle");
      setFilePreview(null);
      revokeHeld();
      return;
    }

    const switchedCred = secretsCredIdRef.current !== credential.id;
    secretsCredIdRef.current = credential.id;
    if (switchedCred) {
      setFilePreview(null);
      revokeHeld();
    }

    let cancelled = false;
    setSecrets("loading");

    (async () => {
      try {
        const data = await decryptVaultPayload(
          passphrase,
          credential.salt,
          credential.iv,
          credential.encryptedData,
        );
        if (cancelled) return;
        setSecrets({ data });
        void apiFetch(`/api/credentials/${credential.id}/audit-access`, {
          method: "POST",
          body: JSON.stringify({}),
        });
      } catch {
        if (!cancelled) {
          setSecrets("err");
          toast({ variant: "destructive", title: "Gagal dekripsi", description: "Passphrase salah atau data rusak." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, credential, passphrase]);

  useEffect(() => {
    if (!open) {
      revokeHeld();
      setFilePreview(null);
    }
  }, [open]);

  const loadFilePreview = useCallback(
    async (f: CredFileRow) => {
      if (!credential) return;
      if (!f.iv) {
        toast({
          variant: "destructive",
          title: "Tidak bisa pratinjau",
          description: "File ini tidak punya IV enkripsi (data lama). Unggah ulang lampiran.",
        });
        return;
      }
      setFilePreview({ fileId: f.id, status: "loading" });
      revokeHeld();
      try {
        const ciphertext = await fetchEncryptedCredentialBlob(f.fileUrl);
        const plain = await decryptFileBytes(passphrase, credential.salt, f.iv, ciphertext);
        const preview = buildVaultFilePreview(f.fileType, plain);
        heldPreviewRef.current = preview;
        setFilePreview({ fileId: f.id, status: "ok", preview });
      } catch (e) {
        revokeHeld();
        setFilePreview({ fileId: f.id, status: "err" });
        const msg = e instanceof Error ? e.message : "Gagal memuat file";
        toast({ variant: "destructive", title: "Pratinjau gagal", description: msg });
      }
    },
    [credential, passphrase],
  );

  /**
   * Muat otomatis lampiran pertama bila dialog terbuka dan belum ada pratinjau
   * (termasuk saat `credential` baru tersedia setelah `open`).
   */
  useEffect(() => {
    if (!open || !credential?.files?.length) return;
    const first = credential.files[0];
    if (!first?.iv) return;
    if (filePreview !== null) return;
    void loadFilePreview(first);
  }, [open, credential, loadFilePreview, filePreview]);

  function downloadDecrypted(f: CredFileRow) {
    if (!credential || filePreview?.fileId !== f.id || filePreview.status !== "ok") {
      toast({ title: "Buka pratinjau dulu", description: "Unduh memakai data yang sudah didekripsi di sesi ini." });
      return;
    }
    const p = filePreview.preview;
    if (p.kind === "unsupported") {
      toast({
        variant: "destructive",
        title: "Unduh tidak tersedia",
        description: "Tipe file ini tidak didukung untuk pratinjau/unduh cepat.",
      });
      return;
    }
    if (p.kind === "text") {
      const mime = (f.fileType || "text/plain").split(";")[0]!.trim();
      const blob = new Blob([p.text], { type: `${mime};charset=utf-8` });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = f.fileName;
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }
    const a = document.createElement("a");
    a.href = p.objectUrl;
    a.download = f.fileName;
    a.click();
  }

  const title = credential?.title ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={credential?.id ?? "closed"}
        className={cn(
          "vault-no-print flex max-h-[min(96vh,1200px)] w-[calc(100vw-1rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 print:hidden",
          "sm:p-6",
        )}
      >
        <div className="max-h-[min(96vh,1200px)] overflow-y-auto px-4 pb-4 pt-5 sm:px-0 sm:pb-0 sm:pt-0">
          <DialogHeader className="space-y-2 px-0 sm:px-0">
            <DialogTitle className="pr-10 text-xl sm:text-2xl">{title}</DialogTitle>
            <p className="text-left text-sm leading-relaxed text-muted-foreground">
              Pratinjau didekripsi di perangkat Anda. Tombol &quot;Tahan untuk melihat&quot; mengurangi risiko intipan
              cepat — bukan perlindungan mutlak.
            </p>
          </DialogHeader>

          {credential && (
            <div className="mt-4 grid gap-6 text-sm lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
              <div className="space-y-4">
                <div className="grid gap-2 rounded-lg border bg-card p-4">
                  <div>
                    <span className="text-muted-foreground">Username (plaintext): </span>
                    <span className="font-medium">{credential.username ?? "—"}</span>
                  </div>
                  {credential.category && (
                    <div>
                      <span className="text-muted-foreground">Kategori: </span>
                      {credential.category}
                    </div>
                  )}
                </div>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Secrets</h3>
                  {(secrets === "idle" || secrets === "loading") && (
                    <p className="text-muted-foreground">Membuka…</p>
                  )}
                  {secrets === "err" && (
                    <p className="text-destructive text-sm">Tidak dapat membuka secrets.</p>
                  )}
                  {secrets !== "loading" && secrets !== "err" && secrets !== "idle" && (
                    <HoldToReveal>
                      <div className="space-y-3">
                        <div>
                          <span className="text-xs text-muted-foreground">Password</span>
                          <div className="mt-0.5 font-mono text-sm break-all">
                            {secrets.data.password ? secrets.data.password : "—"}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Catatan</span>
                          <div className="mt-0.5 whitespace-pre-wrap break-words text-sm">
                            {secrets.data.notes ?? "—"}
                          </div>
                        </div>
                      </div>
                    </HoldToReveal>
                  )}
                </section>
              </div>

              <section className="min-w-0 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Lampiran ({credential.files.length})
                </h3>
                {credential.files.length === 0 && (
                  <p className="text-muted-foreground text-sm">Belum ada file.</p>
                )}
                {credential.files.length > 0 && (
                  <div className="flex flex-col gap-4 lg:flex-row lg:gap-5">
                    <ul className="shrink-0 space-y-2 lg:max-w-[min(100%,20rem)] lg:overflow-y-auto lg:pr-1 lg:max-h-[min(70vh,640px)]">
                      {credential.files.map((f) => {
                        const active = filePreview?.fileId === f.id;
                        return (
                          <li key={f.id}>
                            <button
                              type="button"
                              onClick={() => loadFilePreview(f)}
                              className={cn(
                                "w-full rounded-lg border p-3 text-left transition hover:bg-muted/50",
                                active && "border-primary ring-1 ring-primary/20",
                              )}
                            >
                              <p className="break-words font-medium leading-snug">{f.fileName}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {f.fileType} · {formatBytes(f.fileSize)}
                              </p>
                              <span className="mt-2 inline-block text-xs font-medium text-primary">
                                {!active
                                  ? "Ketuk untuk pratinjau"
                                  : !filePreview || filePreview.fileId !== f.id
                                    ? "…"
                                    : filePreview.status === "loading"
                                      ? "Memuat pratinjau…"
                                      : filePreview.status === "ok"
                                        ? "Dipilih — lihat panel kanan"
                                        : "Gagal memuat"}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="min-h-[12rem] min-w-0 flex-1 rounded-lg border border-dashed bg-muted/10 p-2 sm:p-3">
                      {!filePreview && (
                        <p className="flex h-full min-h-[10rem] items-center justify-center px-4 text-center text-sm text-muted-foreground">
                          Pilih lampiran di daftar untuk memuat pratinjau besar (PDF, gambar, atau teks).
                        </p>
                      )}
                      {filePreview?.status === "loading" && (
                        <p className="flex min-h-[12rem] items-center justify-center text-muted-foreground">
                          Memuat &amp; mendekripsi…
                        </p>
                      )}
                      {filePreview?.status === "err" && (
                        <p className="flex min-h-[12rem] items-center justify-center text-destructive">
                          Gagal memuat pratinjau.
                        </p>
                      )}
                      {filePreview?.status === "ok" && (
                        <div className="space-y-3">
                          {filePreview.preview.kind === "unsupported" ? (
                            <PreviewBody preview={filePreview.preview} size="large" />
                          ) : (
                            <HoldToReveal
                              className="bg-background"
                              hint="Tahan tombol di bawah untuk melihat PDF, gambar, atau teks dalam ukuran besar."
                            >
                              <PreviewBody preview={filePreview.preview} size="large" />
                            </HoldToReveal>
                          )}
                          {filePreview.preview.kind !== "unsupported" && (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const row = credential.files.find((x) => x.id === filePreview.fileId);
                                  if (row) downloadDecrypted(row);
                                }}
                              >
                                Unduh hasil dekripsi
                              </Button>
                              {(filePreview.preview.kind === "pdf" || filePreview.preview.kind === "image") && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    const pv = filePreview.preview;
                                    if (pv.kind === "pdf" || pv.kind === "image") {
                                      window.open(pv.objectUrl, "_blank", "noopener,noreferrer");
                                    }
                                  }}
                                >
                                  Buka di tab baru
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
