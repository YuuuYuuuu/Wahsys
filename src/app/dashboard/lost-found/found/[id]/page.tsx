"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HeaderActions } from "@/components/dashboard/header-actions";
import { ImageUploadWithCamera } from "@/components/lost-found/image-upload-with-camera";
import { toast } from "@/hooks/use-toast";
import { FoundItemStatus, Role, ClaimStatus } from "@prisma/client";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Warehouse,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  FileQuestion,
  UserCheck,
  Image as ImageIcon,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

type ItemDetail = {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  publicDescription: string;
  privateDescription?: string;
  foundLocation: string;
  foundDate: string;
  expiredAt?: string | null;
  storageLocation: string;
  condition: string;
  imageUrl: string | null;
  status: FoundItemStatus;
  receivedAt: string;
  returnedAt: string | null;
  receivedBy: { id: string; name: string; email: string } | null;
  foundReport: { id: string; ticketNumber: string; finderName: string | null; finderContact: string | null } | null;
  claims: {
    id: string;
    claimNumber: string;
    ownershipDescription: string;
    evidencePhotos: unknown;
    status: ClaimStatus;
    createdAt: string;
    claimant: { id: string; name: string; email: string };
  }[];
  matches: {
    id: string;
    matchScore: number;
    lostReport: {
      id: string;
      ticketNumber: string;
      itemName: string;
      category: string;
      lastLocation: string;
      status: string;
      user: { name: string; email: string };
    };
  }[];
};

export default function FoundItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id ?? "");
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isPrivileged = currentUser?.role === Role.ADMIN || currentUser?.role === Role.PETUGAS;

  const [claimOpen, setClaimOpen] = useState(false);
  const [claimDesc, setClaimDesc] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);

  const { data: item, isLoading, error } = useQuery({
    queryKey: ["found-item-detail", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/lost-found/found/${id}`);
      if (!res.ok) throw new Error("Barang temuan tidak ditemukan");
      return res.json() as Promise<ItemDetail>;
    },
    enabled: Boolean(id),
  });

  const claimMut = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/lost-found/claims", {
        method: "POST",
        body: JSON.stringify({
          foundItemId: id,
          ownershipDescription: claimDesc,
          evidencePhotos: evidenceUrl ? [evidenceUrl] : [],
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Gagal mengajukan klaim");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["found-item-detail", id] });
      qc.invalidateQueries({ queryKey: ["claims"] });
      setClaimOpen(false);
      setClaimDesc("");
      setEvidenceUrl(null);
      toast({
        title: "Klaim berhasil diajukan",
        description: "Petugas akan memeriksa bukti kepemilikan Anda.",
      });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  if (isLoading) {
    return <p className="text-xs text-muted-foreground py-8">Memuat detail barang…</p>;
  }

  if (error || !item) {
    return (
      <div className="space-y-3 py-6">
        <p className="text-xs text-destructive">{(error as Error)?.message ?? "Barang tidak ditemukan"}</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/lost-found/found")}>
          Kembali ke Katalog
        </Button>
      </div>
    );
  }

  function isItemExpired(it: { expiredAt?: string | null; status: string }) {
    if (it.status === "RETURNED" || it.status === "DISPOSED") return false;
    if (it.status === "EXPIRED") return true;
    if (!it.expiredAt) return false;
    return new Date(it.expiredAt).getTime() < Date.now();
  }

  const canClaim = item.status === FoundItemStatus.AVAILABLE || item.status === FoundItemStatus.CLAIM_PENDING;

  return (
    <div className="space-y-6">
      <HeaderActions>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => router.push("/dashboard/lost-found/found")}
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Kembali
          </Button>

          {canClaim && (
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setClaimOpen(true)}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Ajukan Klaim Barang Ini
            </Button>
          )}
        </div>
      </HeaderActions>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Image & Status */}
        <div className="space-y-4">
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <div className="relative aspect-square w-full bg-muted/40">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.itemName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                  <ImageIcon className="h-16 w-16" />
                </div>
              )}
            </div>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status Inventaris:</span>
                <div className="flex items-center gap-1.5">
                  {isItemExpired(item) && (
                    <span className="rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm ring-1 ring-red-500/50">
                      Expired
                    </span>
                  )}
                  <Badge
                    variant={
                      item.status === "AVAILABLE"
                        ? "default"
                        : item.status === "RESERVED"
                        ? "secondary"
                        : item.status === "RETURNED"
                        ? "outline"
                        : "destructive"
                    }
                  >
                    {item.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-2">
                <span className="text-muted-foreground">Kode Inventaris:</span>
                <span className="font-mono font-medium">{item.itemCode}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 pt-2">
                <span className="text-muted-foreground">Tanggal Diterima:</span>
                <span>{new Date(item.receivedAt).toLocaleDateString("id-ID")}</span>
              </div>
              {item.expiredAt && (
                <div className="flex items-center justify-between border-t border-border/60 pt-2">
                  <span className="text-muted-foreground">Batas Pengambilan:</span>
                  <span className={`font-medium ${isItemExpired(item) ? "text-red-600 font-bold dark:text-red-400" : ""}`}>
                    {new Date(item.expiredAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Center & Right Column: Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Expired Warning Banner */}
          {isItemExpired(item) && (
            <div className="flex items-center gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <div className="text-xs">
                <span className="font-semibold">Masa Berlaku Pengambilan Telah Kedaluwarsa</span>
                <p className="text-[11px] opacity-90 mt-0.5">
                  Barang temuan ini telah melewati batas waktu penyimpanan pada{" "}
                  {new Date(item.expiredAt!).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  .
                </p>
              </div>
            </div>
          )}

          {/* Item Info Card */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Badge variant="outline" className="mb-1 text-[10px]">
                    {item.category}
                  </Badge>
                  <CardTitle className="text-xl font-bold">{item.itemName}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <Label className="text-muted-foreground text-xs">Deskripsi Umum:</Label>
                <p className="mt-1 text-foreground whitespace-pre-line leading-relaxed">{item.publicDescription}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/80 bg-muted/20 p-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-muted-foreground text-[11px]">Lokasi Penemuan:</span>
                    <p className="font-medium text-foreground">{item.foundLocation}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-muted-foreground text-[11px]">Tanggal Ditemukan:</span>
                    <p className="font-medium text-foreground">
                      {new Date(item.foundDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 border-t border-border/60 pt-2">
                  <Warehouse className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-muted-foreground text-[11px]">Penyimpanan Fisik:</span>
                    <p className="font-medium text-foreground">{item.storageLocation}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 border-t border-border/60 pt-2">
                  <Activity className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-muted-foreground text-[11px]">Kondisi Barang:</span>
                    <p className="font-medium text-foreground">{item.condition}</p>
                  </div>
                </div>
                {item.expiredAt && (
                  <div className="flex items-start gap-2 border-t border-border/60 pt-2 col-span-2">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <span className="text-muted-foreground text-[11px]">Batas Waktu Pengambilan:</span>
                      <p className={`font-medium ${isItemExpired(item) ? "text-red-600 font-bold dark:text-red-400" : "text-foreground"}`}>
                        {new Date(item.expiredAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Private Description (Only for Admin/Petugas) */}
              {isPrivileged && item.privateDescription && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 font-semibold mb-1">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Ciri Khusus / Keterangan Rahasia (Internal):</span>
                  </div>
                  <p className="text-amber-950 dark:text-amber-200 whitespace-pre-line leading-relaxed">
                    {item.privateDescription}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Section: Submitted Claims */}
          {isPrivileged && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Pengajuan Klaim Kepemilikan ({item.claims.length})</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Daftar klaim yang diajukan pengguna untuk barang ini
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {item.claims.length === 0 ? (
                  <p className="py-4 text-center text-muted-foreground">Belum ada klaim untuk barang ini.</p>
                ) : (
                  item.claims.map((claim) => (
                    <div key={claim.id} className="rounded-lg border border-border/80 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold">{claim.claimNumber}</span>
                          <span className="font-medium text-foreground">{claim.claimant.name}</span>
                          <span className="text-muted-foreground">({claim.claimant.email})</span>
                        </div>
                        <Badge
                          variant={
                            claim.status === "APPROVED"
                              ? "default"
                              : claim.status === "COMPLETED"
                              ? "outline"
                              : claim.status === "REJECTED"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {claim.status}
                        </Badge>
                      </div>
                      <div className="rounded bg-muted/40 p-2 text-foreground text-[11px] whitespace-pre-line">
                        <strong>Keterangan Bukti:</strong> {claim.ownershipDescription}
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                          <Link href="/dashboard/lost-found/claims">Buka Menu Verifikasi Klaim</Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Admin Section: Matching Lost Reports */}
          {isPrivileged && (
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-1.5 font-semibold text-sm">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Kecocokan Dengan Laporan Kehilangan ({item.matches.length})</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {item.matches.length === 0 ? (
                  <p className="py-3 text-center text-muted-foreground">Tidak ada laporan kehilangan yang cocok.</p>
                ) : (
                  item.matches.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-semibold">{m.lostReport.ticketNumber}</span>
                          <span className="font-medium text-foreground">{m.lostReport.itemName}</span>
                          <span className="text-muted-foreground">({m.lostReport.user.name})</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Terakhir di: {m.lostReport.lastLocation} · Kategori: {m.lostReport.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          Skor: {m.matchScore}%
                        </Badge>
                        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                          <Link href="/dashboard/lost-found/lost">Lihat Laporan</Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog: Ajukan Klaim */}
      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajukan Klaim Kepemilikan</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 text-xs">
            <div className="rounded-lg border border-border bg-muted/20 p-2.5">
              <p className="text-muted-foreground text-[11px]">Barang yang diklaim:</p>
              <p className="font-semibold text-foreground text-sm">{item.itemName}</p>
              <p className="text-muted-foreground text-[11px]">Kode: {item.itemCode}</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Jelaskan Bukti Kepemilikan Anda *</Label>
              <Textarea
                placeholder="Tuliskan ciri rahasia yang hanya diketahui pemilik, misalnya: nomor seri, isi di dalam tas/dompet, stiker khusus, goresan, nomor HP yang tersimpan, atau wallpaper layar..."
                value={claimDesc}
                onChange={(e) => setClaimDesc(e.target.value)}
                className="min-h-[100px] text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Informasi ini dijaga kerahasiaannya dan hanya diverifikasi oleh Petugas Lost & Found.
              </p>
            </div>

            <ImageUploadWithCamera
              label="Unggah Dokumen / Foto Bukti (Opsional)"
              value={evidenceUrl}
              onChange={setEvidenceUrl}
              folder="claims"
            />

            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setClaimOpen(false)}>
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => claimMut.mutate()}
                disabled={claimDesc.trim().length < 10 || claimMut.isPending}
              >
                {claimMut.isPending ? "Mengirim…" : "Kirim Pengajuan Klaim"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

