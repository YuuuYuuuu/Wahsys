"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, FileSpreadsheet, FileText, Printer, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api-client";
import { downloadItemDetailPdf } from "@/lib/inventory/item-pdf";
import { type ItemCondition, type ItemKind } from "@prisma/client";

export type ExportItemData = {
  id: string;
  assetCode: string | null;
  externalAssetCode: string | null;
  externalQrValue: string | null;
  name: string;
  kind: ItemKind;
  createdAt: string;
  updatedAt?: string;
  stock: number;
  location: string;
  condition: ItemCondition;
  description: string | null;
  category: { id: string; name: string };
  conditionLogs: {
    id: string;
    oldCondition: ItemCondition;
    newCondition: ItemCondition;
    note: string | null;
    changedAt: string;
  }[];
  maintenanceLogs: {
    id: string;
    description: string;
    cost: number | null;
    performedAt: string;
  }[];
};

function formatRupiah(amount: number | null | undefined) {
  if (amount == null) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoString: string) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ItemExportDialog({
  open,
  onOpenChange,
  item,
  scanUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ExportItemData;
  scanUrl: string;
}) {
  const printSheetRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Generate QR code for the document preview
  useEffect(() => {
    let active = true;
    if (scanUrl) {
      QRCode.toDataURL(scanUrl, { margin: 1, width: 200, errorCorrectionLevel: "M" })
        .then((url) => {
          if (active) setQrDataUrl(url);
        })
        .catch(() => {
          if (active) setQrDataUrl("");
        });
    }
    return () => {
      active = false;
    };
  }, [scanUrl]);

  const safeFilenameBase = (item.assetCode || item.externalAssetCode || item.name || "item")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .toLowerCase();

  // Export CSV via API
  async function handleExportCsv() {
    setDownloadingCsv(true);
    try {
      const res = await apiFetch(`/api/export/items/${item.id}`);
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Gagal mengunduh CSV");
      }
      const cd = res.headers.get("Content-Disposition");
      const match = cd?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `wahsys-item-${safeFilenameBase}.csv`;

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

      toast({
        title: "CSV Berhasil Diunduh",
        description: `File tersimpan sebagai ${filename}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal mengunduh CSV";
      toast({ variant: "destructive", title: msg });
    } finally {
      setDownloadingCsv(false);
    }
  }

  // Export PDF via html2pdf
  async function handleExportPdf() {
    if (!printSheetRef.current) return;
    setDownloadingPdf(true);
    try {
      const filename = `lembar-aset-${safeFilenameBase}-${new Date().toISOString().slice(0, 10)}.pdf`;
      await downloadItemDetailPdf(printSheetRef.current, filename);
      toast({
        title: "PDF Berhasil Dibuat",
        description: `File tersimpan sebagai ${filename}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal membuat PDF";
      toast({ variant: "destructive", title: msg });
    } finally {
      setDownloadingPdf(false);
    }
  }

  // Native Print
  function handlePrint() {
    if (!printSheetRef.current) return;
    const printContent = printSheetRef.current.innerHTML;
    const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=750");
    if (!w) {
      toast({ variant: "destructive", title: "Jendela cetak diblokir oleh browser" });
      return;
    }
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lembar Data Aset - ${item.name}</title>
          <meta charset="utf-8" />
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            * { box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; font-size: 11px; line-height: 1.4; padding: 0; margin: 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; color: #334155; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }
            .badge-baik { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .badge-perbaikan { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
            .badge-rusak { background: #ffe4e6; color: #be123c; border: 1px solid #fecdd3; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    w.document.close();
  }

  const totalMaintenanceCost = item.maintenanceLogs.reduce((sum, m) => sum + (m.cost ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Ekspor Data Barang
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unduh spreadsheet data atau cetak lembar resmi kartu riwayat aset ini.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs font-medium"
                disabled={downloadingCsv}
                onClick={handleExportCsv}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                {downloadingCsv ? "Mengunduh…" : "Unduh CSV"}
              </Button>

              <Button
                type="button"
                variant="default"
                size="sm"
                className="gap-1.5 h-8 text-xs font-medium"
                disabled={downloadingPdf}
                onClick={handleExportPdf}
              >
                <FileText className="h-3.5 w-3.5" />
                {downloadingPdf ? "Memproses PDF…" : "Unduh PDF"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5 h-8 text-xs font-medium"
                onClick={handlePrint}
              >
                <Printer className="h-3.5 w-3.5" />
                Cetak
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Live Printable Preview Container */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Pratinjau Lembar Data Aset (A4):</span>
            <span className="text-[11px] text-muted-foreground">Format A4 Portrait</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/80 bg-slate-100 dark:bg-slate-900/40 p-4">
            {/* The printable sheet */}
            <div
              ref={printSheetRef}
              className="mx-auto w-[680px] bg-white text-slate-900 p-8 shadow-sm rounded-md text-[11px] leading-relaxed"
              style={{ minHeight: "842px" }}
            >
              {/* Document Header */}
              <div className="border-b-2 border-slate-800 pb-3 mb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-6 w-6 text-slate-800" />
                    <div>
                      <h2 className="text-base font-bold tracking-tight text-slate-900 leading-none">WAHSYS</h2>
                      <p className="text-[9px] uppercase tracking-wider font-semibold text-slate-500">
                        Sistem Manajemen Aset & Inventaris
                      </p>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mt-3 uppercase tracking-wide">
                    Lembar Data & Riwayat Aset
                  </h3>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  <p>Dicetak: {formatDate(new Date().toISOString())}</p>
                </div>
              </div>

              {/* Main Specification & QR Code Section */}
              <div className="grid grid-cols-12 gap-4 mb-5 border border-slate-200 rounded p-3 bg-slate-50/50">
                {/* Specs (9 cols) */}
                <div className="col-span-9 space-y-1.5">
                  <div className="text-sm font-bold text-slate-900">{item.name}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10.5px]">
                    <div>
                      <span className="text-slate-500">Kode Aset WahSys:</span>{" "}
                      <span className="font-mono font-semibold text-slate-800">{item.assetCode || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Kode Lembaga:</span>{" "}
                      <span className="font-mono font-semibold text-slate-800">
                        {item.externalAssetCode || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Kategori:</span>{" "}
                      <span className="font-medium text-slate-800">{item.category?.name || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Jenis Barang:</span>{" "}
                      <span className="font-medium text-slate-800">
                        {item.kind === "ASET" ? "Aset" : "Non Aset"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Lokasi Penempatan:</span>{" "}
                      <span className="font-medium text-slate-800">{item.location || "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Jumlah Stok:</span>{" "}
                      <span className="font-bold text-slate-800">{item.stock} unit</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Kondisi Terkini:</span>{" "}
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          item.condition === "BAIK"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.condition === "PERLU_PERBAIKAN"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {item.condition.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Tanggal Terdaftar:</span>{" "}
                      <span className="font-medium text-slate-800">{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                  {item.description ? (
                    <div className="pt-1 text-[10px] text-slate-600 border-t border-slate-200 mt-1.5">
                      <span className="font-semibold text-slate-700">Deskripsi:</span> {item.description}
                    </div>
                  ) : null}
                </div>

                {/* QR Code (3 cols) */}
                <div className="col-span-3 flex flex-col items-center justify-center border-l border-slate-200 pl-3">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrDataUrl} alt="QR Code" className="w-24 h-24 object-contain border border-slate-300 p-1 bg-white" />
                  ) : (
                    <div className="w-24 h-24 bg-slate-200 flex items-center justify-center text-[9px] text-slate-500 text-center p-1">
                      QR Code
                    </div>
                  )}
                  <span className="text-[9px] font-mono text-slate-500 mt-1 font-semibold">{item.assetCode || "Scan URL"}</span>
                </div>
              </div>

              {/* Condition Logs Table */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                    1. Riwayat Perubahan Kondisi Fisik ({item.conditionLogs.length})
                  </h4>
                </div>
                {item.conditionLogs.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic p-2 border border-slate-200 rounded bg-slate-50/50">
                    Belum ada riwayat perubahan kondisi tercatat.
                  </p>
                ) : (
                  <table className="w-full text-[10px] border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 text-left">
                        <th className="p-1.5 border border-slate-200 w-8 text-center">No</th>
                        <th className="p-1.5 border border-slate-200 w-32">Waktu</th>
                        <th className="p-1.5 border border-slate-200 w-24">Dari</th>
                        <th className="p-1.5 border border-slate-200 w-24">Ke</th>
                        <th className="p-1.5 border border-slate-200">Catatan Perubahan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.conditionLogs.map((log, idx) => (
                        <tr key={log.id} className="border-t border-slate-200">
                          <td className="p-1.5 border border-slate-200 text-center font-mono">{idx + 1}</td>
                          <td className="p-1.5 border border-slate-200 text-slate-600 whitespace-nowrap">
                            {formatDate(log.changedAt)}
                          </td>
                          <td className="p-1.5 border border-slate-200 font-medium">
                            {log.oldCondition.replace(/_/g, " ")}
                          </td>
                          <td className="p-1.5 border border-slate-200 font-bold text-slate-800">
                            {log.newCondition.replace(/_/g, " ")}
                          </td>
                          <td className="p-1.5 border border-slate-200 text-slate-600">
                            {log.note || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Maintenance Logs Table */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                    2. Riwayat Perawatan & Servis ({item.maintenanceLogs.length})
                  </h4>
                  <span className="text-[10.5px] font-bold text-slate-900">
                    Total Biaya: {formatRupiah(totalMaintenanceCost)}
                  </span>
                </div>
                {item.maintenanceLogs.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic p-2 border border-slate-200 rounded bg-slate-50/50">
                    Belum ada riwayat perawatan atau servis tercatat.
                  </p>
                ) : (
                  <table className="w-full text-[10px] border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 text-left">
                        <th className="p-1.5 border border-slate-200 w-8 text-center">No</th>
                        <th className="p-1.5 border border-slate-200 w-32">Tanggal</th>
                        <th className="p-1.5 border border-slate-200">Deskripsi Tindakan Perawatan</th>
                        <th className="p-1.5 border border-slate-200 w-28 text-right">Biaya</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.maintenanceLogs.map((m, idx) => (
                        <tr key={m.id} className="border-t border-slate-200">
                          <td className="p-1.5 border border-slate-200 text-center font-mono">{idx + 1}</td>
                          <td className="p-1.5 border border-slate-200 text-slate-600 whitespace-nowrap">
                            {formatDate(m.performedAt)}
                          </td>
                          <td className="p-1.5 border border-slate-200 text-slate-800">{m.description}</td>
                          <td className="p-1.5 border border-slate-200 text-right font-mono font-medium">
                            {formatRupiah(m.cost)}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                        <td colSpan={3} className="p-1.5 border border-slate-200 text-right uppercase text-[9.5px]">
                          Total Pengeluaran Perawatan:
                        </td>
                        <td className="p-1.5 border border-slate-200 text-right font-mono text-slate-900">
                          {formatRupiah(totalMaintenanceCost)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              {/* Signatures / Footer Verification */}
              <div className="grid grid-cols-2 gap-8 pt-6 mt-8 border-t border-slate-300 text-center text-[10px]">
                <div>
                  <p className="text-slate-500">Petugas Inventaris,</p>
                  <div className="h-14"></div>
                  <p className="font-semibold text-slate-800 underline underline-offset-4">( ............................................ )</p>
                </div>
                <div>
                  <p className="text-slate-500">Penanggung Jawab Sarpras / Aset,</p>
                  <div className="h-14"></div>
                  <p className="font-semibold text-slate-800 underline underline-offset-4">( ............................................ )</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
