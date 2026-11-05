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
import { FoundItemStatus, Role } from "@prisma/client";
import {
  LayoutGrid,
  List,
  Plus,
  Eye,
  MapPin,
  Calendar,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

type FoundItemCard = {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  publicDescription: string;
  foundLocation: string;
  foundDate: string;
  expiredAt?: string | null;
  storageLocation: string;
  condition: string;
  imageUrl: string | null;
  status: FoundItemStatus;
  _count?: { claims: number; matches: number };
};

type ListResponse = {
  items: FoundItemCard[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function FoundItemsPage() {
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const isPrivileged = currentUser?.role === Role.ADMIN || currentUser?.role === Role.PETUGAS;

  const [view, setView] = useState<"grid" | "table">("grid");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<FoundItemStatus | "">("");

  // Register Dialog State
  const [registerOpen, setRegisterOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<string>(LOST_FOUND_CATEGORIES[0]);
  const [formPublicDesc, setFormPublicDesc] = useState("");
  const [formPrivateDesc, setFormPrivateDesc] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  // Default waktu expired 30 hari ke depan
  const [formExpiredAt, setFormExpiredAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [formStorage, setFormStorage] = useState("Lemari A-01 (Kantor Pengelola)");
  const [formCondition, setFormCondition] = useState("Baik");
  const [uploadedImgUrl, setUploadedImgUrl] = useState<string | null>(null);

  function isItemExpired(item: { expiredAt?: string | null; status: string }) {
    if (item.status === "RETURNED" || item.status === "DISPOSED") return false;
    if (item.status === "EXPIRED") return true;
    if (!item.expiredAt) return false;
    return new Date(item.expiredAt).getTime() < Date.now();
  }

  const { data: itemData, isLoading } = useQuery({
    queryKey: ["found-items", page, q, categoryFilter, statusFilter],
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(page),
        limit: "16",
      });
      if (q) sp.set("q", q);
      if (categoryFilter) sp.set("category", categoryFilter);
      if (statusFilter) sp.set("status", statusFilter);

      const res = await apiFetch(`/api/lost-found/found?${sp.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil katalog barang temuan");
      return res.json() as Promise<ListResponse>;
    },
  });

  const registerMut = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/lost-found/found", {
        method: "POST",
        body: JSON.stringify({
          directRegister: isPrivileged,
          itemName: formName,
          category: formCategory,
          publicDescription: formPublicDesc,
          privateDescription: formPrivateDesc || null,
          foundLocation: formLocation,
          foundDate: new Date(formDate).toISOString(),
          expiredAt: formExpiredAt ? new Date(formExpiredAt).toISOString() : null,
          storageLocation: formStorage,
          condition: formCondition,
          imageUrl: uploadedImgUrl,
          registerAsInventory: isPrivileged,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const issuesText = j.issues?.fieldErrors
          ? Object.entries(j.issues.fieldErrors)
              .map(([f, msgs]) => `${f}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`)
              .join("; ")
          : null;
        throw new Error(issuesText || j.error || "Gagal mendaftarkan barang temuan");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["found-items"] });
      qc.invalidateQueries({ queryKey: ["lost-found-dashboard"] });
      setRegisterOpen(false);
      // Reset form
      setFormName("");
      setFormPublicDesc("");
      setFormPrivateDesc("");
      setFormLocation("");
      setUploadedImgUrl(null);
      const nextExp = new Date();
      nextExp.setDate(nextExp.getDate() + 30);
      setFormExpiredAt(nextExp.toISOString().slice(0, 10));
      toast({ title: "Barang temuan berhasil didaftarkan ke sistem" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  return (
    <div className="space-y-6">
      <HeaderActions>
        <div className="flex items-center gap-2 flex-nowrap md:flex-wrap">
          {/* View switcher */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
            <Button
              type="button"
              variant={view === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="gap-1 h-8 px-2.5 text-xs"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              Kartu
            </Button>
            <Button
              type="button"
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              className="gap-1 h-8 px-2.5 text-xs"
              onClick={() => setView("table")}
            >
              <List className="h-3.5 w-3.5" aria-hidden />
              Tabel
            </Button>
          </div>

          {isPrivileged && (
            <ExportCsvButton href="/api/export/lost-found?type=found" label="CSV Barang Temuan" />
          )}

          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setRegisterOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            {isPrivileged ? "Registrasi Barang Temuan" : "Lapor Temuan Barang"}
          </Button>
        </div>
      </HeaderActions>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/80 bg-card p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Input
            placeholder="Cari kode / nama barang / lokasi…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="h-8 w-full sm:w-60 text-xs"
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
                setStatusFilter((e.target.value as FoundItemStatus | "") || "");
                setPage(1);
              }}
            >
              <option value="">Semua Status</option>
              {Object.values(FoundItemStatus).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground shrink-0">{itemData ? `${itemData.total} barang ditemukan` : "Memuat…"}</p>
      </div>

      {/* Main Content (Grid or Table) */}
      {isLoading ? (
        <p className="py-12 text-center text-xs text-muted-foreground">Memuat katalog barang temuan…</p>
      ) : itemData?.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-xs text-muted-foreground">
          Belum ada barang temuan yang cocok dengan filter.
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {itemData?.items.map((item) => (
            <Card
              key={item.id}
              className="flex flex-col overflow-hidden border-border/80 shadow-sm transition hover:border-primary/40"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-muted/40">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.itemName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
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
                    className="text-[10px] backdrop-blur-md"
                  >
                    {item.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </div>

              <CardContent className="flex flex-1 flex-col p-4 text-xs">
                <div className="mb-2">
                  <span className="font-mono text-[10px] text-muted-foreground">{item.itemCode}</span>
                  <h3 className="font-semibold text-foreground line-clamp-1 text-sm">{item.itemName}</h3>
                  <Badge variant="outline" className="mt-1 text-[10px] font-normal">
                    {item.category}
                  </Badge>
                </div>

                <p className="mb-3 text-[11px] text-muted-foreground line-clamp-2">{item.publicDescription}</p>

                <div className="mt-auto space-y-1 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.foundLocation}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>
                        {new Date(item.foundDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {item.expiredAt && (
                      <div
                        className={`flex items-center gap-1 text-[10px] ${
                          isItemExpired(item) ? "font-semibold text-red-600 dark:text-red-400" : "text-muted-foreground"
                        }`}
                        title={`Batas pengambilan: ${new Date(item.expiredAt).toLocaleDateString("id-ID")}`}
                      >
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>Exp: {new Date(item.expiredAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2">
                  <Button asChild size="sm" variant="secondary" className="w-full h-8 text-xs gap-1.5">
                    <Link href={`/dashboard/lost-found/found/${item.id}`}>
                      <Eye className="h-3.5 w-3.5" />
                      Lihat Detail & Klaim
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border/80 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Kode</TableHead>
                <TableHead>Nama Barang</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Lokasi Temuan</TableHead>
                <TableHead>Lokasi Simpan</TableHead>
                <TableHead>Kondisi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemData?.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs font-medium text-muted-foreground">{item.itemCode}</TableCell>
                  <TableCell className="text-xs font-medium">
                    <div>{item.itemName}</div>
                    <div className="line-clamp-1 text-[11px] text-muted-foreground">{item.publicDescription}</div>
                  </TableCell>
                  <TableCell className="text-xs">{item.category}</TableCell>
                  <TableCell className="text-xs">{item.foundLocation}</TableCell>
                  <TableCell className="text-xs">{item.storageLocation}</TableCell>
                  <TableCell className="text-xs">{item.condition}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      {isItemExpired(item) && (
                        <span className="inline-flex items-center rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
                          Expired
                        </span>
                      )}
                      <Badge variant={item.status === "AVAILABLE" ? "outline" : "secondary"} className="text-[10px]">
                        {item.status.replace(/_/g, " ")}
                      </Badge>
                      {item.expiredAt && (
                        <span className={`text-[10px] ${isItemExpired(item) ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                          Exp: {new Date(item.expiredAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                      <Link href={`/dashboard/lost-found/found/${item.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                        Detail
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {itemData && itemData.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <span>
            Halaman {itemData.page} dari {itemData.totalPages} ({itemData.total} total)
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={page >= itemData.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog Registrasi Barang Temuan */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isPrivileged ? "Registrasi Fisik Barang Temuan" : "Lapor Menemukan Barang"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Nama Barang *</Label>
              <Input
                placeholder="Contoh: Dompet Kulit Coklat Baellerry"
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
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Lokasi Penemuan *</Label>
                <Input
                  placeholder="Gedung C Ruang 302"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tanggal Ditemukan *</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Waktu Expired Pengambilan</Label>
                <span className="text-[10px] text-muted-foreground">Batas akhir klaim sebelum status expired</span>
              </div>
              <Input
                type="date"
                value={formExpiredAt}
                onChange={(e) => setFormExpiredAt(e.target.value)}
                min={formDate}
                className="h-8 text-xs"
              />
            </div>

            {isPrivileged && (
              <div className="grid grid-cols-2 gap-2 border-y border-border/60 py-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Lokasi Simpan Fisik *</Label>
                  <Input
                    placeholder="Contoh: Brankas A / Rak B-02"
                    value={formStorage}
                    onChange={(e) => setFormStorage(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Kondisi Fisik *</Label>
                  <Input
                    placeholder="Contoh: Baik / Layar retak"
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Deskripsi Publik (Bisa dilihat pemohon) *</Label>
              <Textarea
                placeholder="Tuliskan keterangan umum barang tanpa membocorkan ciri rahasia/bukti..."
                value={formPublicDesc}
                onChange={(e) => setFormPublicDesc(e.target.value)}
                className="min-h-[60px] text-xs"
              />
            </div>

            {isPrivileged && (
              <div className="space-y-1 rounded-md bg-amber-500/10 p-2.5 border border-amber-500/20">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Deskripsi Rahasia / Internal (Hanya Admin)</span>
                </div>
                <Textarea
                  placeholder="Isi rahasia untuk mencocokkan klaim: nomor seri, isi dompet, wallpaper HP, goresan tersembunyi..."
                  value={formPrivateDesc}
                  onChange={(e) => setFormPrivateDesc(e.target.value)}
                  className="min-h-[60px] text-xs bg-background"
                />
              </div>
            )}

            <ImageUploadWithCamera
              label="Foto Barang Temuan (Opsional)"
              value={uploadedImgUrl}
              onChange={setUploadedImgUrl}
              folder="found"
            />

            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRegisterOpen(false)}>
                Batal
              </Button>
              <Button
                size="sm"
                onClick={() => registerMut.mutate()}
                disabled={!formName.trim() || !formPublicDesc.trim() || !formLocation.trim() || registerMut.isPending}
              >
                {registerMut.isPending ? "Mendaftarkan…" : "Daftarkan Barang"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
