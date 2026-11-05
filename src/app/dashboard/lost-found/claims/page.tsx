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
import { toast } from "@/hooks/use-toast";
import { ClaimStatus, Role } from "@prisma/client";
import {
  CheckCheck,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  User,
  Calendar,
  Package,
} from "lucide-react";
import Link from "next/link";

type ClaimRow = {
  id: string;
  claimNumber: string;
  ownershipDescription: string;
  evidencePhotos: unknown;
  status: ClaimStatus;
  rejectionReason: string | null;
  reviewerNotes: string | null;
  createdAt: string;
  claimant: { id: string; name: string; email: string };
  reviewedBy: { id: string; name: string; email: string } | null;
  foundItem: {
    id: string;
    itemCode: string;
    itemName: string;
    category: string;
    status: string;
    storageLocation: string;
    imageUrl: string | null;
  };
  handover: { id: string; handoverNumber: string; status: string } | null;
};

type ListResponse = {
  items: ClaimRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function ClaimsPage() {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isPrivileged = currentUser?.role === Role.ADMIN || currentUser?.role === Role.PETUGAS;

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | "">("");

  // Review Dialog State
  const [selectedClaim, setSelectedClaim] = useState<ClaimRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [pickupDate, setPickupDate] = useState(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [pickupLocation, setPickupLocation] = useState("Kantor Layanan Lost & Found / Customer Service");

  const { data: claimsData, isLoading } = useQuery({
    queryKey: ["claims", page, q, statusFilter],
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(page),
        limit: "15",
      });
      if (q) sp.set("q", q);
      if (statusFilter) sp.set("status", statusFilter);

      const res = await apiFetch(`/api/lost-found/claims?${sp.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil daftar klaim");
      return res.json() as Promise<ListResponse>;
    },
  });

  const reviewMut = useMutation({
    mutationFn: async ({
      status,
      reason,
      date,
      location,
    }: {
      status: ClaimStatus;
      reason?: string;
      date?: string;
      location?: string;
    }) => {
      if (!selectedClaim) return;
      const res = await apiFetch(`/api/lost-found/claims/${selectedClaim.id}/review`, {
        method: "POST",
        body: JSON.stringify({
          status,
          rejectionReason: reason,
          scheduledPickupDate: date ? new Date(date).toISOString() : undefined,
          pickupLocation: location,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Gagal memproses verifikasi klaim");
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["claims"] });
      qc.invalidateQueries({ queryKey: ["found-items"] });
      qc.invalidateQueries({ queryKey: ["lost-found-dashboard"] });
      setSelectedClaim(null);
      setRejectReason("");
      toast({
        title:
          vars.status === ClaimStatus.APPROVED
            ? "Klaim disetujui & Jadwal serah terima dibuat"
            : "Keputusan klaim disimpan",
      });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  return (
    <div className="space-y-6">
      <HeaderActions>
        <div className="flex items-center gap-2 flex-nowrap md:flex-wrap">
          {isPrivileged && (
            <ExportCsvButton href="/api/export/lost-found?type=claims" label="CSV Data Klaim" />
          )}
        </div>
      </HeaderActions>

      {/* Main Table Card */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-4">
          <CardTitle className="text-base font-medium">Manajemen Klaim Kepemilikan Barang</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Cari nomor klaim / barang…"
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
                setStatusFilter((e.target.value as ClaimStatus | "") || "");
                setPage(1);
              }}
            >
              <option value="">Semua Status Klaim</option>
              {Object.values(ClaimStatus).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Memuat data klaim…</p>
          ) : claimsData?.items.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">Belum ada pengajuan klaim.</p>
          ) : (
            <>
              {/* MOBILE CARDS VIEW (< md) */}
              <div className="space-y-3 p-3.5 block md:hidden">
                {claimsData?.items.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-border/80 bg-card p-3.5 space-y-3 shadow-2xs transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {row.claimNumber}
                        </span>
                        <h4 className="font-semibold text-sm text-foreground mt-1.5 leading-tight">
                          {row.foundItem.itemName}
                        </h4>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {row.foundItem.itemCode}
                        </span>
                      </div>
                      <Badge
                        variant={
                          row.status === "APPROVED"
                            ? "default"
                            : row.status === "COMPLETED"
                            ? "outline"
                            : row.status === "REJECTED"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-[10px] shrink-0"
                      >
                        {row.status.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-2.5 space-y-1.5 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>Pemohon: {row.claimant.name}</span>
                      </div>
                      <div className="text-muted-foreground pl-5">{row.claimant.email}</div>
                      <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>
                          Diajukan:{" "}
                          {new Date(row.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {row.handover && (
                        <div className="text-emerald-600 dark:text-emerald-400 font-medium pt-1 border-t border-border/40">
                          Serah Terima: {row.handover.status} ({row.handover.handoverNumber})
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs gap-1.5"
                      onClick={() => setSelectedClaim(row)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Periksa Bukti Klaim
                    </Button>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE VIEW (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto p-4 pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">No. Klaim</TableHead>
                      <TableHead>Barang Yang Diklaim</TableHead>
                      <TableHead>Pemohon</TableHead>
                      <TableHead>Waktu Pengajuan</TableHead>
                      <TableHead>Status Klaim</TableHead>
                      <TableHead>Status Serah Terima</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claimsData?.items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                          {row.claimNumber}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium text-foreground">{row.foundItem.itemName}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">{row.foundItem.itemCode}</div>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{row.claimant.name}</div>
                          <div className="text-[11px] text-muted-foreground">{row.claimant.email}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {new Date(row.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.status === "APPROVED"
                                ? "default"
                                : row.status === "COMPLETED"
                                ? "outline"
                                : row.status === "REJECTED"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {row.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.handover ? (
                            <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                              {row.handover.status} ({row.handover.handoverNumber})
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => setSelectedClaim(row)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Periksa
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Pagination */}
          {claimsData && claimsData.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border p-3.5 text-xs text-muted-foreground">
              <span>
                Halaman {claimsData.page} dari {claimsData.totalPages} ({claimsData.total} total)
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
                  disabled={page >= claimsData.totalPages}
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

      {/* Dialog Verifikasi Klaim */}
      <Dialog open={Boolean(selectedClaim)} onOpenChange={(open) => !open && setSelectedClaim(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Verifikasi Bukti Klaim</span>
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {selectedClaim?.claimNumber}
              </span>
            </DialogTitle>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-4 py-2 text-xs">
              {/* Ringkasan Barang & Pemohon */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/80 bg-muted/20 p-3">
                <div>
                  <span className="text-muted-foreground text-[11px]">Barang Yang Diklaim:</span>
                  <p className="font-medium text-foreground">{selectedClaim.foundItem.itemName}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{selectedClaim.foundItem.itemCode}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Pemohon Klaim:</span>
                  <p className="font-medium text-foreground">{selectedClaim.claimant.name}</p>
                  <p className="text-[11px] text-muted-foreground">{selectedClaim.claimant.email}</p>
                </div>
                <div className="col-span-2 border-t border-border/60 pt-2 flex items-center justify-between">
                  <span className="text-muted-foreground">Lokasi Penyimpanan Barang:</span>
                  <span className="font-medium">{selectedClaim.foundItem.storageLocation}</span>
                </div>
              </div>

              {/* Keterangan Bukti Kepemilikan */}
              <div className="space-y-1 rounded-lg border border-border p-3">
                <Label className="text-xs font-semibold text-foreground">Keterangan Bukti Kepemilikan (Pemohon):</Label>
                <p className="mt-1 whitespace-pre-line text-foreground leading-relaxed">
                  {selectedClaim.ownershipDescription}
                </p>
              </div>

              {/* Foto Bukti */}
              {Array.isArray(selectedClaim.evidencePhotos) && selectedClaim.evidencePhotos.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Foto / Lampiran Dokumen Bukti:</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedClaim.evidencePhotos.map((url: string, idx: number) => (
                      <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded border border-border/80">
                        <img src={url} alt={`Bukti ${idx + 1}`} className="aspect-video w-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Keputusan Admin/Petugas */}
              {isPrivileged && selectedClaim.status === "PENDING_REVIEW" && (
                <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <h4 className="font-semibold text-foreground">Keputusan Verifikasi</h4>

                  {/* Form Penjadwalan Pengambilan jika Disetujui */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Jadwal Pengambilan</Label>
                      <Input
                        type="datetime-local"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Lokasi Pengambilan</Label>
                      <Input
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px]">Alasan Penolakan (Hanya diisi jika menolak)</Label>
                    <Input
                      placeholder="Contoh: Bukti kepemilikan tidak cocok dengan data fisik barang."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs gap-1"
                      disabled={reviewMut.isPending}
                      onClick={() =>
                        reviewMut.mutate({
                          status: ClaimStatus.REJECTED,
                          reason: rejectReason || "Bukti kepemilikan tidak memenuhi verifikasi.",
                        })
                      }
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Tolak Klaim
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1"
                      disabled={reviewMut.isPending}
                      onClick={() =>
                        reviewMut.mutate({
                          status: ClaimStatus.APPROVED,
                          date: pickupDate,
                          location: pickupLocation,
                        })
                      }
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Setujui Klaim & Buat Jadwal
                    </Button>
                  </div>
                </div>
              )}

              {/* Status Selesai / Ditolak */}
              {selectedClaim.status !== "PENDING_REVIEW" && (
                <div className="rounded-lg border border-border p-3 space-y-1">
                  <span className="text-muted-foreground text-[11px]">Status Keputusan:</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedClaim.status}</Badge>
                    {selectedClaim.reviewedBy && (
                      <span className="text-[11px] text-muted-foreground">
                        Diverifikasi oleh: {selectedClaim.reviewedBy.name}
                      </span>
                    )}
                  </div>
                  {selectedClaim.rejectionReason && (
                    <p className="text-[11px] text-destructive mt-1">Alasan: {selectedClaim.rejectionReason}</p>
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

