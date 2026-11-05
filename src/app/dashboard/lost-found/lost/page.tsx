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
import { LOST_FOUND_CATEGORIES } from "@/lib/validators/lost-found";
import { LostReportStatus, Role } from "@prisma/client";
import { Search, Plus, Sparkles, Eye, CheckCircle2, XCircle, ChevronLeft, ChevronRight, MapPin, Calendar, User } from "lucide-react";
import Link from "next/link";

type LostItemRow = {
  id: string;
  ticketNumber: string;
  itemName: string;
  category: string;
  description: string;
  lastLocation: string;
  lostDate: string;
  imageUrl: string | null;
  status: LostReportStatus;
  rejectionReason: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  matches: {
    id: string;
    matchScore: number;
    matchStatus: string;
    foundItem: {
      id: string;
      itemCode: string;
      itemName: string;
      status: string;
      storageLocation: string;
    };
  }[];
};

type ListResponse = {
  items: LostItemRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function LostReportsPage() {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isPrivileged = currentUser?.role === Role.ADMIN || currentUser?.role === Role.PETUGAS;

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<LostReportStatus | "">("");

  // Create Dialog State
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<string>(LOST_FOUND_CATEGORIES[0]);
  const [formDesc, setFormDesc] = useState("");
  const [formLoc, setFormLoc] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formNotes, setFormNotes] = useState("");
  const [uploadedImgUrl, setUploadedImgUrl] = useState<string | null>(null);

  // Detail / Action Dialog State
  const [selectedReport, setSelectedReport] = useState<LostItemRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["lost-reports", page, q, categoryFilter, statusFilter],
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(page),
        limit: "15",
      });
      if (q) sp.set("q", q);
      if (categoryFilter) sp.set("category", categoryFilter);
      if (statusFilter) sp.set("status", statusFilter);

      const res = await apiFetch(`/api/lost-found/lost?${sp.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil daftar laporan");
      return res.json() as Promise<ListResponse>;
    },
  });

  // Submit Create Lost Report
  const createMut = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/lost-found/lost", {
        method: "POST",
        body: JSON.stringify({
          itemName: formName,
          category: formCategory,
          description: formDesc,
          lastLocation: formLoc,
          lostDate: new Date(formDate).toISOString(),
          imageUrl: uploadedImgUrl,
          additionalNotes: formNotes || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const issuesText = j.issues?.fieldErrors
          ? Object.entries(j.issues.fieldErrors)
              .map(([f, msgs]) => `${f}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
              .join("; ")
          : null;
        throw new Error(issuesText || j.error || "Gagal menyimpan laporan");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lost-reports"] });
      qc.invalidateQueries({ queryKey: ["lost-found-dashboard"] });
      setCreateOpen(false);
      // Reset form
      setFormName("");
      setFormDesc("");
      setFormLoc("");
      setFormNotes("");
      setUploadedImgUrl(null);
      toast({ title: "Laporan kehilangan berhasil dibuat" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  // Status Change Mutation
  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: LostReportStatus; rejectionReason?: string }) => {
      const res = await apiFetch(`/api/lost-found/lost/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, rejectionReason }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Gagal memperbarui status");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lost-reports"] });
      qc.invalidateQueries({ queryKey: ["lost-found-dashboard"] });
      setSelectedReport(null);
      setRejectReason("");
      toast({ title: "Status laporan berhasil diperbarui" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  return (
    <div className="space-y-6">
      <HeaderActions>
        <div className="flex items-center gap-2 flex-nowrap md:flex-wrap">
          {isPrivileged && (
            <ExportCsvButton href="/api/export/lost-found?type=lost" label="CSV Laporan Hilang" />
          )}
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Lapor Kehilangan Baru
          </Button>
        </div>
      </HeaderActions>

      {/* Main Table Card */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0 pb-4">
          <CardTitle className="text-base font-medium">Daftar Laporan Kehilangan</CardTitle>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Input
              placeholder="Cari barang / tiket…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="h-8 w-full sm:w-44 text-xs"
            />
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                className="h-8 flex-1 sm:flex-none rounded-md border border-input bg-background px-2.5 text-xs text-foreground"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua Kategori</option>
                {LOST_FOUND_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                className="h-8 flex-1 sm:flex-none rounded-md border border-input bg-background px-2.5 text-xs text-foreground"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter((e.target.value as LostReportStatus | "") || "");
                  setPage(1);
                }}
              >
                <option value="">Semua Status</option>
                {Object.values(LostReportStatus).map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Memuat daftar laporan…</p>
          ) : reportData?.items.length === 0 ? (
            <p className="py-12 text-center text-xs text-muted-foreground">Tidak ada laporan kehilangan ditemukan.</p>
          ) : (
            <>
              {/* MOBILE CARDS VIEW (< md) */}
              <div className="space-y-3 p-3.5 block md:hidden">
                {reportData?.items.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-border/80 bg-card p-3.5 space-y-3 shadow-2xs transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {row.ticketNumber}
                        </span>
                        <h4 className="font-semibold text-sm text-foreground mt-1.5 leading-tight">
                          {row.itemName}
                        </h4>
                        <span className="text-[11px] text-muted-foreground">{row.category}</span>
                      </div>
                      <Badge
                        variant={
                          row.status === "RESOLVED"
                            ? "default"
                            : row.status === "MATCH_FOUND"
                            ? "secondary"
                            : row.status === "REJECTED" || row.status === "CANCELLED"
                            ? "destructive"
                            : "outline"
                        }
                        className="text-[10px] shrink-0"
                      >
                        {row.status.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    {row.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded-lg">
                        {row.description}
                      </p>
                    )}

                    <div className="rounded-lg bg-muted/40 p-2.5 space-y-1.5 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>Pelapor: {row.user.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{row.lastLocation}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>
                          Hilang:{" "}
                          {new Date(row.lostDate).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {row.matches.length > 0 && (
                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium pt-1 border-t border-border/40">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>{row.matches.length} kandidat temuan cocok</span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs gap-1.5"
                      onClick={() => setSelectedReport(row)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Lihat Detail & Pencocokan
                    </Button>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE VIEW (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto p-4 pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Tiket</TableHead>
                      <TableHead>Nama Barang</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Lokasi Terakhir</TableHead>
                      <TableHead>Waktu Hilang</TableHead>
                      <TableHead>Pelapor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Kandidat Temuan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData?.items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                          {row.ticketNumber}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          <div>{row.itemName}</div>
                          <div className="line-clamp-1 text-[11px] text-muted-foreground">{row.description}</div>
                        </TableCell>
                        <TableCell className="text-xs">{row.category}</TableCell>
                        <TableCell className="text-xs">{row.lastLocation}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {new Date(row.lostDate).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-xs">{row.user.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.status === "RESOLVED"
                                ? "default"
                                : row.status === "MATCH_FOUND"
                                ? "secondary"
                                : row.status === "REJECTED" || row.status === "CANCELLED"
                                ? "destructive"
                                : "outline"
                            }
                            className="text-[10px]"
                          >
                            {row.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.matches.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              <Sparkles className="h-3 w-3" />
                              {row.matches.length} kecocokan
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
                            onClick={() => setSelectedReport(row)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {reportData && reportData.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border p-3.5 text-xs text-muted-foreground">
              <span>
                Halaman {reportData.page} dari {reportData.totalPages} ({reportData.total} total)
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
                  disabled={page >= reportData.totalPages}
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

      {/* Dialog: Buat Laporan Kehilangan */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Laporan Kehilangan Barang</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Nama Barang *</Label>
              <Input
                placeholder="Contoh: Laptop Asus Zenbook Hitam"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kategori *</Label>
              <select
                className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
              >
                {LOST_FOUND_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lokasi Terakhir Terlihat *</Label>
              <Input
                placeholder="Contoh: Perpustakaan Lt. 2 Meja 14"
                value={formLoc}
                onChange={(e) => setFormLoc(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Perkiraan Tanggal Kehilangan *</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deskripsi & Ciri-Ciri Barang *</Label>
              <Textarea
                placeholder="Jelaskan warna, stiker khusus, goresan, gantungan, atau ciri khusus lainnya..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="min-h-[70px] text-xs"
              />
            </div>
            <ImageUploadWithCamera
              label="Foto Pendukung (Opsional)"
              value={uploadedImgUrl}
              onChange={setUploadedImgUrl}
              folder="lost"
            />
            <div className="space-y-1">
              <Label className="text-xs">Catatan Tambahan (Opsional)</Label>
              <Input
                placeholder="Nomor kontak darurat, dsb..."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => createMut.mutate()}
                disabled={!formName.trim() || !formDesc.trim() || !formLoc.trim() || createMut.isPending}
              >
                {createMut.isPending ? "Menyimpan…" : "Simpan Laporan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detail Laporan & Kandidat Pencocokan */}
      <Dialog open={Boolean(selectedReport)} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Detail Laporan</span>
              <span className="font-mono text-xs font-normal text-muted-foreground">
                {selectedReport?.ticketNumber}
              </span>
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/80 bg-muted/20 p-3">
                <div>
                  <span className="text-muted-foreground">Nama Barang:</span>
                  <p className="font-medium text-foreground">{selectedReport.itemName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Kategori:</span>
                  <p className="font-medium text-foreground">{selectedReport.category}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Lokasi Terakhir:</span>
                  <p className="font-medium text-foreground">{selectedReport.lastLocation}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tanggal Hilang:</span>
                  <p className="font-medium text-foreground">
                    {new Date(selectedReport.lostDate).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Deskripsi:</span>
                  <p className="text-foreground whitespace-pre-line">{selectedReport.description}</p>
                </div>
                <div className="col-span-2 flex items-center justify-between border-t border-border pt-2 text-[11px]">
                  <span>
                    Pelapor: <strong>{selectedReport.user.name}</strong> ({selectedReport.user.email})
                  </span>
                  <Badge variant="outline">{selectedReport.status}</Badge>
                </div>
              </div>

              {/* Kandidat Pencocokan Barang Temuan */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Kandidat Barang Temuan Yang Cocok:</span>
                </div>
                {selectedReport.matches.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground rounded-lg border border-dashed border-border p-3 text-center">
                    Belum ditemukan barang temuan yang mendekati ciri-ciri laporan ini.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedReport.matches.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-semibold text-foreground">
                              {m.foundItem.itemCode}
                            </span>
                            <span className="font-medium text-foreground">{m.foundItem.itemName}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Penyimpanan: {m.foundItem.storageLocation} · Status: {m.foundItem.status}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            Skor: {m.matchScore}%
                          </Badge>
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                            <Link href={`/dashboard/lost-found/found/${m.foundItem.id}`}>Lihat Barang</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Aksi Verifikasi untuk Admin/Petugas */}
              {isPrivileged && (
                <div className="space-y-3 border-t border-border pt-3">
                  <span className="font-medium text-foreground">Aksi Status Laporan:</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.status === "SUBMITTED" && (
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => updateStatusMut.mutate({ id: selectedReport.id, status: LostReportStatus.PUBLISHED })}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verifikasi & Publikasikan
                      </Button>
                    )}
                    {selectedReport.status !== "RESOLVED" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs gap-1"
                        onClick={() => updateStatusMut.mutate({ id: selectedReport.id, status: LostReportStatus.RESOLVED })}
                      >
                        Tandai Selesai (Ditemukan)
                      </Button>
                    )}
                    {selectedReport.status !== "REJECTED" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs gap-1"
                        onClick={() =>
                          updateStatusMut.mutate({
                            id: selectedReport.id,
                            status: LostReportStatus.REJECTED,
                            rejectionReason: rejectReason || "Laporan tidak valid atau tidak memenuhi kriteria.",
                          })
                        }
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Tolak Laporan
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Pembatalan oleh pengguna sendiri */}
              {!isPrivileged && selectedReport.user.id === currentUser?.id && selectedReport.status === "SUBMITTED" && (
                <div className="border-t border-border pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => updateStatusMut.mutate({ id: selectedReport.id, status: LostReportStatus.CANCELLED })}
                  >
                    Batalkan Laporan Ini
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
