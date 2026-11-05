"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { OvertimeRequestStatus } from "@prisma/client";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmailDialog } from "@/components/lembur/EmailDialog";
import { LetterPreview } from "@/components/lembur/LetterPreview";
import { OvertimeForm } from "@/components/lembur/OvertimeForm";
import { OvertimeHistoryPanel } from "@/components/lembur/OvertimeHistoryPanel";
import { toast } from "@/hooks/use-toast";
import { HeaderActions } from "@/components/dashboard/header-actions";
import {
  defaultProfile,
  mergeWithTotalHours,
  type OvertimeFormData,
  type OvertimeFormErrors,
  validateFullForm,
  validateQuickForm,
} from "@/lib/lembur/form-defaults";
import { downloadOvertimePdf } from "@/lib/lembur/pdf";

type Section = "buat" | "riwayat";

export default function LemburPage() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [section, setSection] = useState<Section>("buat");
  const [mode, setMode] = useState<"full" | "quick">("full");
  const [formData, setFormData] = useState<OvertimeFormData>(() => ({
    ...defaultProfile,
    employeeName: user?.name ?? defaultProfile.employeeName,
    executorName: user?.name ?? defaultProfile.executorName,
  }));
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<OvertimeRequestStatus | null>(null);
  const [errors, setErrors] = useState<OvertimeFormErrors>({});
  const [emailOpen, setEmailOpen] = useState(false);
  const previewRef = useRef<HTMLElement | null>(null);

  const mergedFormData = useMemo(() => mergeWithTotalHours(formData), [formData]);

  function resetComposer() {
    setEditingRequestId(null);
    setEditingStatus(null);
    setFormData({
      ...defaultProfile,
      employeeName: user?.name ?? defaultProfile.employeeName,
      executorName: user?.name ?? defaultProfile.executorName,
    });
    setErrors({});
  }

  const saveDraftMut = useMutation({
    mutationFn: async () => {
      const body = { formSnapshot: mergedFormData, asDraft: true as const };
      if (editingRequestId && editingStatus === "DRAFT") {
        const res = await apiFetch(`/api/overtime-requests/${editingRequestId}`, {
          method: "PATCH",
          body: JSON.stringify({ formSnapshot: mergedFormData }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? "Gagal menyimpan");
        }
        return (await res.json()) as { id: string; status: OvertimeRequestStatus };
      }
      const res = await apiFetch("/api/overtime-requests", { method: "POST", body: JSON.stringify(body) });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Gagal menyimpan draf");
      }
      return (await res.json()) as { id: string; status: OvertimeRequestStatus };
    },
    onSuccess: (row: { id: string; status?: OvertimeRequestStatus }) => {
      void qc.invalidateQueries({ queryKey: ["overtime-requests"] });
      setEditingRequestId(row.id);
      setEditingStatus(row.status ?? "DRAFT");
      toast({ title: "Draf disimpan" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const submitNewMut = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/overtime-requests", {
        method: "POST",
        body: JSON.stringify({ formSnapshot: mergedFormData, asDraft: false }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Gagal mengajukan");
      }
      return (await res.json()) as { id: string };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["overtime-requests"] });
      resetComposer();
      toast({ title: "Diajukan", description: "Menunggu persetujuan admin." });
      setSection("riwayat");
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const submitDraftMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/overtime-requests/${id}/submit`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Gagal mengajukan");
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["overtime-requests"] });
      resetComposer();
      toast({ title: "Diajukan", description: "Menunggu persetujuan admin." });
      setSection("riwayat");
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const handleChange = (name: keyof OvertimeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileChange = (name: keyof OvertimeFormData, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, [name]: String(reader.result || "") }));
      setErrors((prev) => ({ ...prev, [name]: "" }));
    };
    reader.readAsDataURL(file);
  };

  const handleOpenEmail = () => {
    const formErrors = mode === "quick" ? validateQuickForm(mergedFormData) : validateFullForm(mergedFormData);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      toast({ variant: "destructive", title: "Form belum lengkap", description: "Periksa field yang ditandai merah." });
      return;
    }
    setEmailOpen(true);
  };

  function handleAjukan() {
    const formErrors = mode === "quick" ? validateQuickForm(mergedFormData) : validateFullForm(mergedFormData);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      toast({ variant: "destructive", title: "Form belum lengkap", description: "Periksa field yang ditandai merah." });
      return;
    }
    if (editingRequestId && editingStatus === "DRAFT") {
      submitDraftMut.mutate(editingRequestId);
    } else if (!editingRequestId) {
      submitNewMut.mutate();
    } else {
      toast({ variant: "destructive", title: "Tidak dapat mengajukan", description: "Buka draf dari riwayat untuk mengajukan." });
    }
  }

  function handleLoadFromHistory(data: OvertimeFormData, meta: { id: string; status: OvertimeRequestStatus }) {
    setFormData(mergeWithTotalHours(data));
    setEditingRequestId(meta.id);
    setEditingStatus(meta.status);
    setErrors({});
    setSection("buat");
    toast({
      title: "Form dimuat",
      description:
        meta.status === "DRAFT"
          ? "Lanjutkan edit, simpan draf, atau ajukan. Untuk email/PDF gunakan tombol di form."
          : "Untuk mengirim email atau mengunduh PDF gunakan tombol di form dan panel kanan.",
    });
  }

  const saving = saveDraftMut.isPending || submitNewMut.isPending || submitDraftMut.isPending;
  const canMutateDraftOrNew = !editingRequestId || editingStatus === "DRAFT";

  return (
    <div className="space-y-6">
      <HeaderActions>
        <div className="flex items-center gap-2 flex-nowrap md:flex-wrap">
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
            <Button
              type="button"
              variant={section === "buat" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={() => setSection("buat")}
            >
              Buat
            </Button>
            <Button
              type="button"
              variant={section === "riwayat" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={() => setSection("riwayat")}
            >
              Riwayat
            </Button>
          </div>
          {section === "buat" && (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={resetComposer}
                disabled={saving}
              >
                Form baru
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 text-xs"
                onClick={() => saveDraftMut.mutate()}
                disabled={saving || !canMutateDraftOrNew}
              >
                Simpan draf
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                onClick={handleAjukan}
                disabled={saving || !canMutateDraftOrNew}
              >
                Ajukan
              </Button>
            </>
          )}
        </div>
      </HeaderActions>

      {section === "riwayat" && <OvertimeHistoryPanel onLoadIntoComposer={handleLoadFromHistory} />}

      {section === "buat" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
              <Button
                type="button"
                size="sm"
                variant={mode === "full" ? "secondary" : "ghost"}
                className="h-8 px-2.5 text-xs"
                onClick={() => setMode("full")}
              >
                Mode Full
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "quick" ? "secondary" : "ghost"}
                className="h-8 px-2.5 text-xs"
                onClick={() => setMode("quick")}
              >
                Mode Cepat
              </Button>
            </div>
            {editingRequestId && (
              <p className="text-xs text-muted-foreground">
                Terhubung ke pengajuan: <span className="font-mono">{editingRequestId.slice(0, 8)}…</span>
                {editingStatus === "DRAFT" ? " (draf)" : ` (${editingStatus})`}
              </p>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <OvertimeForm
              mode={mode}
              formData={mergedFormData}
              errors={errors}
              onChange={handleChange}
              onFileChange={handleFileChange}
              onOpenEmail={handleOpenEmail}
            />
            <LetterPreview
              formData={mergedFormData}
              previewRef={previewRef}
              onDownloadPdf={() => {
                if (!previewRef.current) return;
                downloadOvertimePdf(previewRef.current).catch((e: unknown) => {
                  const msg = e instanceof Error ? e.message : "Gagal membuat PDF";
                  toast({ variant: "destructive", title: msg });
                });
              }}
            />
          </div>

          <EmailDialog open={emailOpen} onOpenChange={setEmailOpen} formData={mergedFormData} previewElement={previewRef.current} />
        </>
      )}
    </div>
  );
}
