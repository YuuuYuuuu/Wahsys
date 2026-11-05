"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ItemCondition, ItemKind, LoanPolicy, Role } from "@prisma/client";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Package, LayoutGrid, List, ChevronLeft, ChevronRight, MapPin, QrCode } from "lucide-react";
import { uploadItemImageClient } from "@/lib/client/upload-item-image";
import { uploadExternalQrImageClient } from "@/lib/client/upload-external-qr-image";
import { AssetQrLabel } from "@/components/inventory/AssetQrLabel";
import { AssetLabelScannerDialog } from "@/components/inventory/AssetLabelScannerDialog";
import { ExportCsvButton } from "@/components/dashboard/export-csv-button";
import { HeaderActions } from "@/components/dashboard/header-actions";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; loanPolicy?: LoanPolicy; _count?: { items: number } };
type Item = {
  id: string;
  assetCode: string | null;
  externalAssetCode: string | null;
  externalQrValue: string | null;
  externalQrImageUrl: string | null;
  name: string;
  kind: ItemKind;
  stock: number;
  location: string;
  condition: ItemCondition;
  imageUrl: string | null;
  category: Category;
};

const conditions: ItemCondition[] = ["BAIK", "PERLU_PERBAIKAN", "RUSAK"];

const INVENTORY_PAGE_SIZE = 16;

type ItemsListResponse = {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function InventoryPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const fileRef = useRef<HTMLInputElement>(null);
  const externalQrFileRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [openItem, setOpenItem] = useState(false);
  const [openQr, setOpenQr] = useState(false);
  const [openScanner, setOpenScanner] = useState(false);
  const [openCat, setOpenCat] = useState(false);
  const [catLoanPolicy, setCatLoanPolicy] = useState<LoanPolicy>("LOANABLE");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ItemKind>("NON_ASET");
  const [categoryId, setCategoryId] = useState("");
  const [stock, setStock] = useState(0);
  const [location, setLocation] = useState("");
  const [condition, setCondition] = useState<ItemCondition>("BAIK");
  const [description, setDescription] = useState("");
  const [usesExternalIdentity, setUsesExternalIdentity] = useState(false);
  const [externalAssetCode, setExternalAssetCode] = useState("");
  const [externalQrValue, setExternalQrValue] = useState("");
  const [pendingExternalQrImage, setPendingExternalQrImage] = useState<File | null>(null);
  const [catName, setCatName] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [createdForQr, setCreatedForQr] = useState<Item | null>(null);

  const [panel, setPanel] = useState<null | "filter" | "izin">(null);

  // Search & filters (inventory listing)
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [filterKind, setFilterKind] = useState<ItemKind | "">("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterCondition, setFilterCondition] = useState<ItemCondition | "">("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await apiFetch("/api/categories");
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<Category[]>;
    },
  });

  useEffect(() => {
    const t = window.setTimeout(() => setQDebounced(q.trim()), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [qDebounced, filterKind, filterCategoryId, filterCondition, filterLocation, filterLowStock]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("lowStock") === "1") setFilterLowStock(true);
  }, []);

  function resetFilters() {
    setQ("");
    setQDebounced("");
    setFilterKind("");
    setFilterCategoryId("");
    setFilterCondition("");
    setFilterLocation("");
    setFilterLowStock(false);
    setPage(1);
  }

  function openPanel(next: "filter" | "izin") {
    setPanel((cur) => (cur === next ? null : next));
  }

  useEffect(() => {
    if (!panel) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [panel]);

  const { data: itemsPage } = useQuery({
    queryKey: [
      "items",
      "inventory",
      page,
      qDebounced,
      filterKind,
      filterCategoryId,
      filterCondition,
      filterLocation,
      filterLowStock,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(INVENTORY_PAGE_SIZE));
      if (qDebounced) params.set("q", qDebounced);
      if (filterKind) params.set("kind", filterKind);
      if (filterCategoryId) params.set("categoryId", filterCategoryId);
      if (filterCondition) params.set("condition", filterCondition);
      if (filterLocation.trim()) params.set("location", filterLocation.trim());
      if (filterLowStock) params.set("lowStock", "1");

      const res = await apiFetch(`/api/items?${params.toString()}`);
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<ItemsListResponse>;
    },
  });

  const items = itemsPage?.items ?? [];
  const total = itemsPage?.total ?? 0;
  const totalPages = itemsPage?.totalPages ?? 1;
  const pageSize = itemsPage?.pageSize ?? INVENTORY_PAGE_SIZE;
  const safePage = itemsPage?.page ?? page;

  useEffect(() => {
    if (itemsPage && itemsPage.page !== page) setPage(itemsPage.page);
  }, [itemsPage, page]);

  const rangeFrom = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(total, (safePage - 1) * pageSize + items.length);

  const createCat = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: catName, loanPolicy: catLoanPolicy }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setOpenCat(false);
      setCatName("");
      setCatLoanPolicy("LOANABLE");
      toast({ title: "Kategori dibuat" });
    },
    onError: () => toast({ variant: "destructive", title: "Gagal buat kategori" }),
  });

  const updateCatPolicy = useMutation({
    mutationFn: async (payload: { id: string; loanPolicy: LoanPolicy }) => {
      const res = await apiFetch(`/api/categories/${payload.id}`, {
        method: "PATCH",
        body: JSON.stringify({ loanPolicy: payload.loanPolicy }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Kebijakan pinjam diperbarui" });
    },
    onError: () => toast({ variant: "destructive", title: "Gagal memperbarui kebijakan" }),
  });

  const createItem = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/items", {
        method: "POST",
        body: JSON.stringify({
          name,
          kind,
          categoryId,
          stock,
          location,
          condition,
          description: description || null,
          usesExternalIdentity,
          externalAssetCode: usesExternalIdentity ? externalAssetCode.trim() || null : null,
          externalQrValue: usesExternalIdentity ? externalQrValue.trim() || null : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = (await res.json()) as Item;
      let imageWarning: string | null = null;
      let externalQrWarning: string | null = null;
      if (pendingImage) {
        try {
          await uploadItemImageClient(created.id, pendingImage);
        } catch (e) {
          imageWarning = e instanceof Error ? e.message : "Gambar tidak tersimpan";
        }
      }
      if (pendingExternalQrImage) {
        try {
          await uploadExternalQrImageClient(created.id, pendingExternalQrImage);
        } catch (e) {
          externalQrWarning = e instanceof Error ? e.message : "Gambar QR lembaga tidak tersimpan";
        }
      }
      return { created, imageWarning, externalQrWarning };
    },
    onSuccess: ({ imageWarning, externalQrWarning }) => {
      setPage(1);
      qc.invalidateQueries({ queryKey: ["items"] });
      setOpenItem(false);
      setCreatedForQr((prev) => {
        void prev;
        return null;
      });
      setName("");
      setKind("NON_ASET");
      setStock(0);
      setLocation("");
      setDescription("");
      setUsesExternalIdentity(false);
      setExternalAssetCode("");
      setExternalQrValue("");
      setPendingImage(null);
      setPendingExternalQrImage(null);
      if (fileRef.current) fileRef.current.value = "";
      if (externalQrFileRef.current) externalQrFileRef.current.value = "";
      toast({ title: "Barang ditambahkan" });
      if (imageWarning) {
        toast({
          title: "Gambar tidak tersimpan",
          description: imageWarning,
        });
      }
      if (externalQrWarning) {
        toast({
          title: "QR lembaga tidak tersimpan",
          description: externalQrWarning,
        });
      }
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message || "Gagal tambah barang" }),
  });

  useEffect(() => {
    if (!createItem.isSuccess) return;
    const last = createItem.data?.created as Item | undefined;
    if (!last) return;
    setCreatedForQr(last);
    setOpenQr(true);
  }, [createItem.isSuccess, createItem.data]);

  return (
    <div className="space-y-6">
      <HeaderActions>
        <div className="flex items-center gap-2 flex-nowrap">
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
            <Dialog open={openCat} onOpenChange={setOpenCat}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">Kategori baru</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Kategori</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Label>Nama</Label>
                  <Input value={catName} onChange={(e) => setCatName(e.target.value)} />
                  <div className="space-y-1.5">
                    <Label>Kebijakan pinjam</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={catLoanPolicy}
                      onChange={(e) => setCatLoanPolicy(e.target.value as LoanPolicy)}
                    >
                      <option value="LOANABLE">Boleh dipinjam</option>
                      <option value="NOT_LOANABLE">Tidak boleh dipinjam</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Item di kategori <strong>boleh dipinjam</strong> akan tampil di form pinjam.
                    </p>
                  </div>
                  <Button onClick={() => createCat.mutate()} disabled={!catName}>
                    Simpan
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button type="button" variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => openPanel("filter")}>
              Filter
              {filterLowStock && (
                <Badge variant="secondary" className="font-normal text-[10px] px-1 py-0">
                  Stok rendah
                </Badge>
              )}
            </Button>
            <ExportCsvButton href="/api/export/items?limit=2000" label="CSV barang" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => openPanel("izin")}
              disabled={role !== Role.ADMIN}
            >
              Izin
            </Button>
            <Dialog
              open={openItem}
              onOpenChange={(o) => {
                setOpenItem(o);
                if (!o) {
                  setPendingImage(null);
                  setPendingExternalQrImage(null);
                  if (fileRef.current) fileRef.current.value = "";
                  if (externalQrFileRef.current) externalQrFileRef.current.value = "";
                }
              }}
            >
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs font-medium">Barang baru</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Barang</DialogTitle>
                </DialogHeader>
                <div className="grid gap-3">
                  <div>
                    <Label>Gambar (opsional, max 5 MB)</Label>
                    <Input
                      ref={fileRef}
                      className="mt-1"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      onChange={(e) => setPendingImage(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div>
                    <Label>Nama</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Jenis aset</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={kind}
                      onChange={(e) => setKind(e.target.value as ItemKind)}
                    >
                      <option value="ASET">Aset</option>
                      <option value="NON_ASET">Non aset</option>
                    </select>
                  </div>
                  <div>
                    <Label>Kategori</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      <option value="">Pilih…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 rounded-md border border-border/70 p-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={usesExternalIdentity}
                        onChange={(e) => setUsesExternalIdentity(e.target.checked)}
                      />
                      Gunakan identitas aset lembaga (utama)
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Jika aktif, scan stiker aset lembaga untuk mengisi kode aset dan nama barang. QR WahSys tetap tersedia sebagai fallback.
                    </p>
                    <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setOpenScanner(true)}>
                      Scan Label Aset (Kamera)
                    </Button>
                    <div>
                      <Label>Kode aset lembaga</Label>
                      <Input
                        value={externalAssetCode}
                        onChange={(e) => setExternalAssetCode(e.target.value)}
                        placeholder="Contoh: 386573"
                      />
                    </div>
                    <div>
                      <Label>Nama barang</Label>
                      <Textarea
                        value={externalQrValue}
                        onChange={(e) => setExternalQrValue(e.target.value)}
                        placeholder="Contoh: Microphone Podium Ashley ..."
                      />
                    </div>
                    <div>
                      <Label>Gambar QR (opsional, max 5 MB)</Label>
                      <Input
                        ref={externalQrFileRef}
                        className="mt-1"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setPendingExternalQrImage(e.target.files?.[0] ?? null)}
                      />
                      {pendingExternalQrImage ? (
                        <p className="mt-1 text-xs text-muted-foreground">File siap upload: {pendingExternalQrImage.name}</p>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <Label>Stok</Label>
                    <Input type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label>Lokasi</Label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                  </div>
                  <div>
                    <Label>Kondisi</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as ItemCondition)}
                    >
                      {conditions.map((c) => (
                        <option key={c} value={c}>
                          {c.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Deskripsi</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                  <Button
                    onClick={() => createItem.mutate()}
                    disabled={
                      !name ||
                      !categoryId ||
                      !location ||
                      createItem.isPending ||
                      (usesExternalIdentity && (!externalAssetCode.trim() || !externalQrValue.trim()))
                    }
                  >
                    Simpan
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <AssetLabelScannerDialog
              open={openScanner}
              onOpenChange={setOpenScanner}
              onUseResult={({ externalAssetCode: code, itemName, qrImageFile, warnings }) => {
                setUsesExternalIdentity(true);
                if (code) setExternalAssetCode(code);
                if (itemName) setExternalQrValue(itemName);
                if (qrImageFile) setPendingExternalQrImage(qrImageFile);
                if (!code) {
                  toast({
                    variant: "destructive",
                    title: "Kode aset lembaga belum terdeteksi",
                    description: "Silakan ulangi scan atau isi Kode aset lembaga secara manual.",
                  });
                } else if (!itemName) {
                  toast({
                    title: "Nama barang belum terbaca penuh",
                    description: "Kode aset berhasil dibaca. Cek dan lengkapi Nama barang secara manual bila perlu.",
                  });
                } else {
                  toast({ title: "Deteksi label berhasil", description: "Field identitas lembaga telah diisi otomatis." });
                }
                warnings.forEach((warning) => {
                  toast({ title: "Info deteksi", description: warning });
                });
              }}
            />

            <Dialog
              open={openQr}
              onOpenChange={(o) => {
                setOpenQr(o);
                if (!o) setCreatedForQr(null);
              }}
            >
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Label QR</DialogTitle>
                </DialogHeader>
                {createdForQr?.assetCode ? (
                  <AssetQrLabel
                    assetCode={createdForQr.assetCode}
                    qrUrl={`${appUrl || (typeof window !== "undefined" ? window.location.origin : "")}/scan/${createdForQr.assetCode}`}
                    summaryLines={[
                      createdForQr.kind === "ASET" ? "Aset" : "Non aset",
                      createdForQr.category?.name ?? "",
                      createdForQr.location ?? "",
                      createdForQr.condition?.replace(/_/g, " ") ?? "",
                    ]}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Kode aset belum tersedia.</p>
                )}
              </DialogContent>
            </Dialog>
        </div>
      </HeaderActions>

      {panel ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setPanel(null)} />
          <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-border/80 bg-card p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Pengaturan Inventory</h2>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPanel(null)}>
                Tutup
              </Button>
            </div>

            <div className="mt-4 flex gap-2 rounded-lg border border-border bg-muted/40 p-0.5">
              <Button
                type="button"
                size="sm"
                variant={panel === "filter" ? "secondary" : "ghost"}
                className="flex-1"
                onClick={() => setPanel("filter")}
              >
                Filter
              </Button>
              <Button
                type="button"
                size="sm"
                variant={panel === "izin" ? "secondary" : "ghost"}
                className="flex-1"
                onClick={() => setPanel("izin")}
                disabled={role !== Role.ADMIN}
              >
                Izin
              </Button>
            </div>

            <div className="mt-4">
              {panel === "filter" ? (
                <div className="grid gap-3">
                  <div>
                    <Label>Search (nama / kode aset)</Label>
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Contoh: Laptop / AS-2401…" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Jenis</Label>
                      <select
                        className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={filterKind}
                        onChange={(e) => setFilterKind(e.target.value as ItemKind | "")}
                      >
                        <option value="">Semua</option>
                        <option value="ASET">Aset</option>
                        <option value="NON_ASET">Non aset</option>
                      </select>
                    </div>
                    <div>
                      <Label>Kondisi</Label>
                      <select
                        className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={filterCondition}
                        onChange={(e) => setFilterCondition(e.target.value as ItemCondition | "")}
                      >
                        <option value="">Semua</option>
                        {conditions.map((c) => (
                          <option key={c} value={c}>
                            {c.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Kategori</Label>
                      <select
                        className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={filterCategoryId}
                        onChange={(e) => setFilterCategoryId(e.target.value)}
                      >
                        <option value="">Semua</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Lokasi</Label>
                      <Input
                        className="mt-1"
                        value={filterLocation}
                        onChange={(e) => setFilterLocation(e.target.value)}
                        placeholder="Contoh: Ruang A…"
                      />
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={filterLowStock}
                      onChange={(e) => setFilterLowStock(e.target.checked)}
                    />
                    Hanya stok rendah (sesuai ambang ringkasan)
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={resetFilters}>
                      Reset
                    </Button>
                    <Button type="button" onClick={() => setPanel(null)}>
                      Terapkan
                    </Button>
                  </div>
                </div>
              ) : role === Role.ADMIN ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Kategori “Boleh” akan tampil di form pinjam.</p>
                  <div className="grid gap-2">
                    {categories.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-border/80 bg-background p-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c._count?.items != null ? `${c._count.items} item` : ""}</p>
                        </div>
                        <select
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                          value={c.loanPolicy ?? "LOANABLE"}
                          onChange={(e) => updateCatPolicy.mutate({ id: c.id, loanPolicy: e.target.value as LoanPolicy })}
                          disabled={updateCatPolicy.isPending}
                        >
                          <option value="LOANABLE">Boleh</option>
                          <option value="NOT_LOANABLE">Tidak</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Hanya admin yang dapat mengatur izin peminjaman.</p>
              )}
            </div>
          </aside>
        </>
      ) : null}

      {view === "grid" && (
        <div className="relative z-0 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
          {items.map((i) => (
            <Link key={i.id} href={`/dashboard/inventory/${i.id}`} className="group flex flex-col">
              <Card className="h-full overflow-hidden border-border/80 bg-card transition-all duration-150 hover:border-primary/40 hover:shadow-xs group-hover:scale-[1.01] flex flex-col justify-between">
                <div>
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/40">
                    {i.imageUrl ? (
                      <img
                        src={i.imageUrl}
                        alt={i.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground/40 bg-muted/20">
                        <Package className="h-8 w-8 opacity-40" aria-hidden />
                      </div>
                    )}

                    <div className="absolute top-1.5 right-1.5">
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold backdrop-blur-md shadow-2xs",
                          i.stock > 0
                            ? "bg-black/60 text-white dark:bg-white/20"
                            : "bg-destructive text-destructive-foreground"
                        )}
                      >
                        Stok {i.stock}
                      </span>
                    </div>

                    {i.externalQrValue && (
                      <div className="absolute bottom-1.5 left-1.5">
                        <span className="rounded bg-primary/80 backdrop-blur-md px-1.5 py-0.5 text-[8px] sm:text-[9px] font-medium text-white flex items-center gap-0.5 shadow-2xs">
                          <QrCode className="h-2.5 w-2.5" />
                          <span>QR</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-2 sm:p-3 space-y-1">
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{i.category?.name || "Umum"}</p>
                    <h3 className="line-clamp-2 text-xs sm:text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                      {i.name}
                    </h3>
                  </div>
                </div>

                <div className="p-2 sm:p-3 pt-0 mt-auto">
                  <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border/50 text-[10px] text-muted-foreground">
                    <span className="truncate flex items-center gap-1 min-w-0" title={i.location}>
                      <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                      <span className="truncate">{i.location}</span>
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 font-normal">
                      {i.condition.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {view === "table" && (
        <Card className="relative z-0 border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Daftar barang</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14" />
                  <TableHead>Nama</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Kondisi</TableHead>
                  <TableHead>Identitas</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
                        {i.imageUrl ? (
                          <img src={i.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Package className="h-4 w-4" aria-hidden />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell>{i.category.name}</TableCell>
                    <TableCell>{i.stock}</TableCell>
                    <TableCell className="max-w-[140px] truncate">{i.location}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{i.condition.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {i.externalAssetCode ? (
                        <span className="rounded border border-border px-1.5 py-0.5">{i.externalAssetCode}</span>
                      ) : (
                        <span className="text-muted-foreground">WahSys</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/dashboard/inventory/${i.id}`}>Detail</a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col gap-2.5 border-t border-border/80 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Menampilkan {rangeFrom}–{rangeTo} dari {total} · Halaman {safePage} dari {totalPages}
          </p>
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 flex-1 sm:flex-none h-8 text-xs"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              Sebelumnya
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 flex-1 sm:flex-none h-8 text-xs"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
