"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

export function ExportCsvButton({ href, label, className }: { href: string; label: string; className?: string }) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await apiFetch(href);
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Gagal mengunduh");
      }
      const cd = res.headers.get("Content-Disposition");
      const m = cd?.match(/filename="([^"]+)"/);
      const filename = m?.[1] ?? "export.csv";
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Unduhan dimulai", description: filename });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal mengunduh";
      toast({ variant: "destructive", title: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-8 text-xs gap-1.5", className)}
      disabled={busy}
      onClick={() => void run()}
    >
      <Download className="h-3.5 w-3.5" aria-hidden />
      {busy ? "…" : label}
    </Button>
  );
}
