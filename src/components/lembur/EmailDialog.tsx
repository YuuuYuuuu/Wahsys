"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { OvertimeFormData } from "@/lib/lembur/form-defaults";
import { generateOvertimePdfBase64 } from "@/lib/lembur/pdf";

function buildDefaultSubject(formData: OvertimeFormData) {
  const employee = formData.employeeName || "Karyawan";
  return `Permohonan Persetujuan Surat Perintah Lembur - ${employee}`;
}

function buildDefaultMessage(formData: OvertimeFormData) {
  const employee = formData.employeeName || "Karyawan";
  const nip = formData.employeeNip || "[NIP/NOPEG]";
  const date = formData.date || "[tanggal]";
  const day = formData.overtimeDay || "[hari]";
  const timeRange = `${formData.startTime || "[mulai]"}-${formData.endTime || "[selesai]"}`;
  const hours = formData.totalHours || "[durasi]";
  const activity = formData.activityDescription || "[pekerjaan]";
  return `Yth. Bapak/Ibu,\n\nBersama email ini kami sampaikan draft Surat Perintah Lembur dengan detail sebagai berikut:\n- Nama: ${employee}\n- NIP/NOPEG: ${nip}\n- Hari/Tanggal: ${day}, ${date}\n- Pukul: ${timeRange}\n- Total Jam: ${hours}\n- Pekerjaan: ${activity}\n\nMohon persetujuan dan arahan lebih lanjut.\n\nHormat kami.`;
}

export function EmailDialog({
  open,
  onOpenChange,
  formData,
  previewElement,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  formData: OvertimeFormData;
  previewElement: HTMLElement | null;
}) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [attachPdf, setAttachPdf] = useState(true);
  const [sending, setSending] = useState(false);

  const defaults = useMemo(
    () => ({ subject: buildDefaultSubject(formData), messageText: buildDefaultMessage(formData) }),
    [formData]
  );

  useEffect(() => {
    if (!open) return;
    setSubject(defaults.subject);
    setMessageText(defaults.messageText);
  }, [open, defaults.subject, defaults.messageText]);

  async function send() {
    if (!to.trim()) {
      toast({ variant: "destructive", title: "Email tujuan wajib diisi" });
      return;
    }
    if (!subject.trim() || !messageText.trim()) {
      toast({ variant: "destructive", title: "Subject dan message wajib diisi" });
      return;
    }
    if (!previewElement) {
      toast({ variant: "destructive", title: "Preview belum siap", description: "Coba tunggu sebentar lalu kirim lagi." });
      return;
    }

    setSending(true);
    try {
      const letterHtml = previewElement.outerHTML;
      const pdfBase64 = attachPdf ? await generateOvertimePdfBase64(previewElement) : undefined;
      const res = await apiFetch("/api/overtime/send", {
        method: "POST",
        body: JSON.stringify({ to, subject, messageText, letterHtml, pdfBase64 }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Gagal mengirim email");
      }
      toast({ title: "Email terkirim" });
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal mengirim email";
      toast({ variant: "destructive", title: msg });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Kirim email</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input placeholder="nama@instansi.id" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea rows={8} value={messageText} onChange={(e) => setMessageText(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={attachPdf}
              onChange={(e) => setAttachPdf(e.target.checked)}
              className="h-4 w-4"
            />
            Lampirkan PDF surat lembur
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
              Batal
            </Button>
            <Button type="button" onClick={send} disabled={sending}>
              {sending ? "Mengirim…" : "Kirim"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

