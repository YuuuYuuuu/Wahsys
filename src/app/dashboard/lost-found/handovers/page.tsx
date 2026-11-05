"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HeaderActions } from "@/components/dashboard/header-actions";
import { ExportCsvButton } from "@/components/dashboard/export-csv-button";
import { ImageUploadWithCamera } from "@/components/lost-found/image-upload-with-camera";
import { toast } from "@/hooks/use-toast";
import { HandoverStatus, Role } from "@prisma/client";
import {
  Handshake,
  CheckCircle2,
  Calendar,
  MapPin,
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
} from "lucide-react";

type HandoverRow = {
  id: string;
  handoverNumber: string;
  claimId: string;
  scheduledAt: string | null;
  pickupLocation: string | null;
  handoverAt: string | null;
  proofPhotoUrl: string | null;
  notes: string | null;
  status: HandoverStatus;
  createdAt: string;
  recipient: { id: string; name: string; email: string };
  admin: { id: string; name: string; email: string };
  claim: {
    claimNumber: string;
    foundItem: {
      id: string;
      itemCode: string;
      itemName: string;
      category: string;
      storageLocation: string;
      status: string;
    };
  };
};

type ListResponse = {
  items: HandoverRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function HandoversPage() {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isPrivileged = currentUser?.role === Role.ADMIN || currentUser?.role === Role.PETUGAS;

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<HandoverStatus | "">("");

  // Complete Dialog
  const [selectedHandover, setSelectedHandover] = useState<HandoverRow | null>(null);
  const [completeNotes, setCompleteNotes] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const { data: handoverData, isLoading } = useQuery({
    queryKey: ["handovers", page, q, statusFilter],
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(page),
        limit: "15",
      });
      if (q) sp.set("q", q);
      if (statusFilter) sp.set("status", statusFilter);

      const res = await apiFetch(`/api/lost-found/handovers?${sp.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data serah terima");
      return res.json() as Promise<ListResponse>;
    },
  });

  const completeMut = useMutation({
    mutationFn: async () => {
      if (!selectedHandover) return;
      const res = await apiFetch(`/api/lost-found/handovers/${selectedHandover.id}/complete`, {
        method: "POST",
        body: JSON.stringify({
          notes: completeNotes,
          proofPhotoUrl: proofUrl,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Gagal menyelesaikan serah terima");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handovers"] });
      qc.invalidateQueries({ queryKey: ["claims"] });
      qc.invalidateQueries({ queryKey: ["found-items"] });
      qc.invalidateQueries({ queryKey: ["lost-found-dashboard"] });
      setSelectedHandover(null);
      setCompleteNotes("");
      setProofUrl(null);
      toast({
        title: "Serah terima barang selesai",
        description: "Status barang telah diubah menjadi RETURNED.",
      });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  return (
    <div className="space-y-6">
      <HeaderActions>
        <div className="flex items-center gap-2 flex-nowrap md:flex-wrap">
          {isPrivileged && (
            <ExportCsvButton href="/api/export/lost-found?type=handovers" label="CSV Data Serah Terima" />
          )}
        </div>
      </HeaderActions>

      {/* Main Table Card */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-4">
          <CardTitle className="text-base font-medium">Jadwal & Riwayat Serah Terima Barang</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Cari nomor serah terima / barang…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="h-8 w-60 text-xs"
            />
            <select
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter((e.target.value as HandoverStatus | "") || "");
                setPage(1);
              }}
            >
              <option value="">Semua Status</option>
              {Object.values(HandoverStatus).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Memuat data serah terima…</p>
          ) : handoverData?.items.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">Belum ada transaksi serah terima.</p>
          ) : (
            <>
              {/* MOBILE CARDS VIEW (< md) */}
              <div className="space-y-3 p-3.5 block md:hidden">
                {handoverData?.items.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-border/80 bg-card p-3.5 space-y-3 shadow-2xs transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {row.handoverNumber}
                        </span>
                        <h4 className="font-semibold text-sm text-foreground mt-1.5 leading-tight">
                          {row.claim.foundItem.itemName}
                        </h4>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {row.claim.foundItem.itemCode} (Klaim: {row.claim.claimNumber})
                        </span>
                      </div>
                      <Badge
                        variant={row.status === "COMPLETED" ? "default" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {row.status}
                      </Badge>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-2.5 space-y-1.5 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>Penerima: {row.recipient.name}</span>
                      </div>
                      <div className="text-muted-foreground pl-5">{row.recipient.email}</div>
                      <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>
                          Jadwal:{" "}
                          {row.scheduledAt
                            ? new Date(row.scheduledAt).toLocaleString("id-ID", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "—"}
                        </span>
                      </div>
                      {row.pickupLocation && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{row.pickupLocation}</span>
                        </div>
                      )}
                    </div>

                    {isPrivileged && row.status === "SCHEDULED" ? (
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs gap-1.5 bg-primary text-primary-foreground font-medium"
                        onClick={() => setSelectedHandover(row)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Selesaikan Serah Terima
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs gap-1.5"
                        onClick={() => setSelectedHandover(row)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Lihat Detail Serah Terima
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE VIEW (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto p-4 pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">No. Serah Terima</TableHead>
                      <TableHead>Barang</TableHead>
                      <TableHead>Penerima Sah</TableHead>
                      <TableHead>Jadwal Pengambilan</TableHead>
                      <TableHead>Lokasi Pengambilan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {handoverData?.items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                          {row.handoverNumber}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium text-foreground">{row.claim.foundItem.itemName}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {row.claim.foundItem.itemCode} (Klaim: {row.claim.claimNumber})
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{row.recipient.name}</div>
                          <div className="text-[11px] text-muted-foreground">{row.recipient.email}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {row.scheduledAt
                            ? new Date(row.scheduledAt).toLocaleString("id-ID", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{row.pickupLocation || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={row.status === "COMPLETED" ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {isPrivileged && row.status === "SCHEDULED" ? (
                            <Button
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => setSelectedHandover(row)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Selesaikan
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => setSelectedHandover(row)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Detail
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Pagination */}
          {handoverData && handoverData.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border p-3.5 text-xs text-muted-foreground">
              <span>
                Halaman {handoverData.page} dari {handoverData.totalPages} ({handoverData.total} total)
              </span>
              <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs flex-1 sm:flex-none"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs flex-1 sm:flex-none"
                  disabled={page >= handoverData.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Berikutnya
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Konfirmasi Serah Terima */}
      <Dialog open={Boolean(selectedHandover)} onOpenChange={(open) => !open && setSelectedHandover(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Proses Serah Terima Barang</span>
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {selectedHandover?.handoverNumber}
              </span>
            </DialogTitle>
          </DialogHeader>
          {selectedHandover && (
            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Barang:</span>
                  <span className="font-semibold text-foreground">{selectedHandover.claim.foundItem.itemName}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-2">
                  <span className="text-muted-foreground">Kode Inventaris:</span>
                  <span className="font-mono">{selectedHandover.claim.foundItem.itemCode}</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-2">
                  <span className="text-muted-foreground">Penerima Sah:</span>
                  <span className="font-medium">
                    {selectedHandover.recipient.name} ({selectedHandover.recipient.email})
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-2">
                  <span className="text-muted-foreground">Petugas Penanggung Jawab:</span>
                  <span>{selectedHandover.admin.name}</span>
                </div>
              </div>

              {selectedHandover.status === "SCHEDULED" && isPrivileged ? (
                <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="font-semibold text-foreground">
                    Verifikasi Fisik & Identitas Penerima:
                  </p>
                  <div className="rounded bg-background p-2.5 text-[11px] text-muted-foreground space-y-1">
                    <p>✓ Pastikan penerima menunjukkan kartu identitas resmi (KTM / KTP / SIM).</p>
                    <p>✓ Pastikan penerima memeriksa fisik barang sebelum meninggalkan lokasi.</p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Catatan Serah Terima (Opsional)</Label>
                    <Textarea
                      placeholder="Contoh: Diserahkan kepada pemilik dengan menunjukkan identitas KTP No. 3201... Barang dalam kondisi lengkap."
                      value={completeNotes}
                      onChange={(e) => setCompleteNotes(e.target.value)}
                      className="min-h-[60px] text-xs bg-background"
                    />
                  </div>

                  <ImageUploadWithCamera
                    label="Foto Bukti Penyerahan (Opsional)"
                    value={proofUrl}
                    onChange={setProofUrl}
                    folder="handovers"
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedHandover(null)}>
                      Batal
                    </Button>
                    <Button size="sm" onClick={() => completeMut.mutate()} disabled={completeMut.isPending}>
                      {completeMut.isPending ? "Memproses…" : "Konfirmasi Serah Terima Selesai"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline">{selectedHandover.status}</Badge>
                  </div>
                  {selectedHandover.handoverAt && (
                    <div className="flex items-center justify-between border-t border-border/60 pt-2">
                      <span className="text-muted-foreground">Waktu Penyerahan Aktual:</span>
                      <span>{new Date(selectedHandover.handoverAt).toLocaleString("id-ID")}</span>
                    </div>
                  )}
                  {selectedHandover.notes && (
                    <div className="border-t border-border/60 pt-2">
                      <span className="text-muted-foreground">Catatan Petugas:</span>
                      <p className="mt-1 text-foreground whitespace-pre-line">{selectedHandover.notes}</p>
                    </div>
                  )}
                  {selectedHandover.proofPhotoUrl && (
                    <div className="border-t border-border/60 pt-2 space-y-1">
                      <span className="text-muted-foreground">Foto Bukti Penyerahan:</span>
                      <a href={selectedHandover.proofPhotoUrl} target="_blank" rel="noopener noreferrer" className="block max-w-[200px] overflow-hidden rounded border border-border">
                        <img src={selectedHandover.proofPhotoUrl} alt="Bukti Serah Terima" className="aspect-video w-full object-cover" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

