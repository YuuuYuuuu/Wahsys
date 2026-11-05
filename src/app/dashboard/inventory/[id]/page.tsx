"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { ItemCondition, ItemKind } from "@prisma/client";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Plus,
  FileText,
  History,
  Wrench,
  Activity,
  Trash2,
  Calendar,
  Banknote,
  ClipboardList,
  Download,
  Tag,
  Package,
  MapPin,
  QrCode,
} from "lucide-react";
import { uploadItemImageClient } from "@/lib/client/upload-item-image";
import { uploadExternalQrImageClient } from "@/lib/client/upload-external-qr-image";
import { Badge } from "@/components/ui/badge";
import { AssetQrLabel } from "@/components/inventory/AssetQrLabel";
import { ItemExportDialog } from "@/components/inventory/ItemExportDialog";
import { parseItemImageUrls } from "@/lib/item-images";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { HeaderActions } from "@/components/dashboard/header-actions";

type ItemDetail = {
  id: string;
  assetCode: string | null;
  externalAssetCode: string | null;
  externalQrValue: string | null;
  externalQrImageUrl: string | null;
  name: string;
  kind: ItemKind;
  createdAt: string;
  stock: number;
  location: string;
  condition: ItemCondition;
  description: string | null;
  imageUrl: string | null;
  imageUrls: unknown;
  category: { id: string; name: string };
  conditionLogs: { id: string; oldCondition: ItemCondition; newCondition: ItemCondition; note: string | null; changedAt: string }[];
  maintenanceLogs: { id: string; description: string; cost: number | null; performedAt: string }[];
};

function formatRupiah(amount: number | null | undefined) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function ConditionBadge({ condition }: { condition: ItemCondition | null }) {
  if (!condition) return <span className="text-muted-foreground">—</span>;
  if (condition === "BAIK") {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        BAIK
      </span>
    );
  }
  if (condition === "PERLU_PERBAIKAN") {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
        PERLU PERBAIKAN
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-500/20">
      RUSAK
    </span>
  );
}

function SectionCard({
  title,
  description,
  onAdd,
  addLabel,
  children,
  className,
}: {
  title: string;
  description?: string;
  onAdd?: () => void;
  addLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-border/60 shadow-none", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {onAdd ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 shrink-0 rounded-full p-0"
            onClick={onAdd}
            aria-label={addLabel ?? "Tambah"}
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ImageGrid({
  urls,
  emptyLabel,
  previewTitle = "Preview gambar",
}: {
  urls: string[];
  emptyLabel: string;
  previewTitle?: string;
}) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const closePreview = () => setPreviewIndex(null);
  const showPrev = () => {
    if (previewIndex === null || urls.length <= 1) return;
    setPreviewIndex((previewIndex - 1 + urls.length) % urls.length);
  };
  const showNext = () => {
    if (previewIndex === null || urls.length <= 1) return;
    setPreviewIndex((previewIndex + 1) % urls.length);
  };

  if (urls.length === 0) {
    return (
      <div className="flex aspect-square max-w-[120px] items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/30">
        <div className="flex flex-col items-center gap-1.5 px-3 text-center text-muted-foreground">
          <ImageIcon className="h-5 w-5 opacity-50" aria-hidden />
          <span className="text-[11px] leading-tight">{emptyLabel}</span>
        </div>
      </div>
    );
  }

  const activeUrl = previewIndex !== null ? urls[previewIndex] : null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {urls.map((url, index) => (
          <button
            key={url}
            type="button"
            onClick={() => setPreviewIndex(index)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border/70 bg-muted/20 transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label={`Lihat ${previewTitle} ${index + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      <Dialog open={previewIndex !== null} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-[min(92vw,960px)] gap-0 overflow-hidden border-none bg-black/95 p-0 text-white shadow-2xl sm:rounded-xl [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
          <DialogTitle className="sr-only">
            {previewTitle}
            {previewIndex !== null ? ` (${previewIndex + 1}/${urls.length})` : ""}
          </DialogTitle>

          {activeUrl ? (
            <div className="relative flex min-h-[240px] items-center justify-center p-4 sm:p-8">
              {urls.length > 1 ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute left-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full p-0 text-white hover:bg-white/10"
                    onClick={showPrev}
                    aria-label="Gambar sebelumnya"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full p-0 text-white hover:bg-white/10"
                    onClick={showNext}
                    aria-label="Gambar berikutnya"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              ) : null}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeUrl}
                alt=""
                className="max-h-[min(80vh,720px)] w-full object-contain"
              />
            </div>
          ) : null}

          {previewIndex !== null && urls.length > 1 ? (
            <p className="border-t border-white/10 px-4 py-2 text-center text-xs text-white/70">
              {previewIndex + 1} / {urls.length}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ItemDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const qc = useQueryClient();
  const imgRef = useRef<HTMLInputElement>(null);
  const externalQrRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"detail" | "record">("detail");
  const [exportOpen, setExportOpen] = useState(false);
  const [maintDesc, setMaintDesc] = useState("");
  const [maintCost, setMaintCost] = useState("");
  const [showMaintForm, setShowMaintForm] = useState(false);
  const [origin, setOrigin] = useState("");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  const { data, isLoading } = useQuery({
    queryKey: ["item", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/items/${id}`);
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<ItemDetail>;
    },
  });

  const [stock, setStock] = useState(0);
  const [location, setLocation] = useState("");
  const [condition, setCondition] = useState<ItemCondition>("BAIK");
  const [conditionNote, setConditionNote] = useState("");
  const [externalAssetCode, setExternalAssetCode] = useState("");
  const [externalQrValue, setExternalQrValue] = useState("");

  useEffect(() => {
    if (!data) return;
    setStock(data.stock);
    setLocation(data.location);
    setCondition(data.condition);
    setExternalAssetCode(data.externalAssetCode ?? "");
    setExternalQrValue(data.externalQrValue ?? "");
  }, [data]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          stock,
          location: location || undefined,
          condition,
          conditionNote: conditionNote || undefined,
          usesExternalIdentity: Boolean(externalAssetCode.trim() || externalQrValue.trim()),
          externalAssetCode: externalAssetCode.trim() || null,
          externalQrValue: externalQrValue.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("fail");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["item", id] });
      qc.invalidateQueries({ queryKey: ["items"] });
      setConditionNote("");
      toast({ title: "Disimpan" });
    },
    onError: () => toast({ variant: "destructive", title: "Gagal simpan" }),
  });

  const addMaint = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/items/${id}/maintenance`, {
        method: "POST",
        body: JSON.stringify({
          description: maintDesc,
          cost: maintCost ? Number(maintCost) : null,
        }),
      });
      if (!res.ok) throw new Error("fail");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["item", id] });
      setMaintDesc("");
      setMaintCost("");
      setShowMaintForm(false);
      toast({ title: "Log perawatan ditambah" });
    },
  });

  const uploadImg = useMutation({
    mutationFn: async (file: File) => {
      await uploadItemImageClient(id, file);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["item", id] });
      qc.invalidateQueries({ queryKey: ["items"] });
      if (imgRef.current) imgRef.current.value = "";
      toast({ title: "Gambar ditambahkan" });
    },
    onError: (e: Error) =>
      toast({
        variant: "destructive",
        title: "Unggah gambar gagal",
        description: e.message,
      }),
  });

  const uploadExternalQr = useMutation({
    mutationFn: async (file: File) => {
      await uploadExternalQrImageClient(id, file);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["item", id] });
      qc.invalidateQueries({ queryKey: ["items"] });
      if (externalQrRef.current) externalQrRef.current.value = "";
      toast({ title: "Gambar QR lembaga diperbarui" });
    },
    onError: (e: Error) =>
      toast({
        variant: "destructive",
        title: "Unggah gambar QR lembaga gagal",
        description: e.message,
      }),
  });

  const del = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("fail");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["items"] });
      router.push("/dashboard/inventory");
      toast({ title: "Barang dihapus" });
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Hapus barang "${data?.name}" secara permanen? Data yang telah dihapus tidak dapat dipulihkan.`)) {
      del.mutate();
    }
  };

  if (isLoading || !data) return <p className="text-sm text-muted-foreground p-6">Memuat…</p>;

  const createdAtDate = data.createdAt ? new Date(data.createdAt) : null;
  const formattedDate =
    createdAtDate && !Number.isNaN(createdAtDate.getTime())
      ? createdAtDate.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Tidak tersedia";

  const assetCode = data.assetCode?.trim();
  const extCode = data.externalAssetCode?.trim();
  const uniqueCodes: { label?: string; code: string }[] = [];
  if (assetCode) {
    uniqueCodes.push({ code: assetCode });
  }
  if (extCode && extCode !== assetCode) {
    uniqueCodes.push({ label: "Lembaga", code: extCode });
  } else if (!assetCode && extCode) {
    uniqueCodes.push({ code: extCode });
  }

  const itemImages = parseItemImageUrls(data.imageUrls, data.imageUrl);
  const qrImages = data.externalQrImageUrl ? [data.externalQrImageUrl] : [];

  const combinedConditionHistory = [
    ...data.conditionLogs.map((l) => ({
      kind: "condition" as const,
      id: l.id,
      at: l.changedAt,
      oldCondition: l.oldCondition,
      newCondition: l.newCondition,
      note: l.note,
    })),
    ...data.maintenanceLogs.map((m) => ({
      kind: "maintenance" as const,
      id: m.id,
      at: m.performedAt,
      oldCondition: null as ItemCondition | null,
      newCondition: null as ItemCondition | null,
      note: `Maintenance: ${m.description}${m.cost != null ? ` (Biaya: ${formatRupiah(m.cost)})` : ""}`,
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const totalRecordCount = data.maintenanceLogs.length + data.conditionLogs.length;
  const totalMaintenanceCost = data.maintenanceLogs.reduce((sum, m) => sum + (m.cost ?? 0), 0);

  return (
    <div className="w-full space-y-5 pb-12">
      <HeaderActions>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setExportOpen(true)}
          className="h-8 text-xs gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Ekspor Data</span>
        </Button>
      </HeaderActions>

      {/* Top Breadcrumb / Back Link */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/dashboard/inventory"
          className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-card transition-all group-hover:border-primary/40 group-hover:bg-primary/5">
            <ArrowLeft className="h-3.5 w-3.5" />
          </div>
          <span>Kembali ke Inventory</span>
        </Link>
      </div>

      {/* Item Title & Metadata Hero Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xs space-y-3.5">
        {/* Badges Row (Category, Kind, Condition, Stock) */}
        <div className="flex flex-wrap items-center gap-2">
          {data.category?.name && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <Tag className="h-3 w-3" />
              {data.category.name}
            </span>
          )}
          <Badge variant="outline" className="text-xs font-medium px-2 py-0.5">
            {data.kind === "ASET" ? "Aset Fisik" : "Non-Aset"}
          </Badge>
          <ConditionBadge condition={data.condition} />
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Package className="h-3 w-3" />
            Stok: <strong className="text-foreground">{data.stock}</strong> unit
          </span>
        </div>

        {/* Big Item Title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {data.name}
          </h1>
        </div>

        {/* Metadata Details Row (Unique Codes, Location, Created Date) */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground pt-3 border-t border-border/50">
          {uniqueCodes.map((c, i) => (
            <div key={i} className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-foreground">
              <QrCode className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="bg-muted px-2 py-0.5 rounded-md text-[11px] font-semibold">
                {c.label ? `${c.label}: ${c.code}` : c.code}
              </span>
            </div>
          ))}

          {data.location && (
            <div className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{data.location}</span>
            </div>
          )}

          <div className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>Ditambahkan {formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={imgRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadImg.mutate(f);
        }}
        disabled={uploadImg.isPending}
      />
      <input
        ref={externalQrRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) uploadExternalQr.mutate(f);
        }}
        disabled={uploadExternalQr.isPending}
      />

      {/* Modern Navigation Bar (Tabs: Detail vs Record) */}
      <div className="border-b border-border/60">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("detail")}
            className={cn(
              "group inline-flex items-center gap-2.5 border-b-2 py-3 px-4 text-sm font-medium transition-all",
              activeTab === "detail"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            <FileText
              className={cn(
                "h-4 w-4 transition-colors",
                activeTab === "detail" ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span>Detail</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("record")}
            className={cn(
              "group inline-flex items-center gap-2.5 border-b-2 py-3 px-4 text-sm font-medium transition-all",
              activeTab === "record"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            <History
              className={cn(
                "h-4 w-4 transition-colors",
                activeTab === "record" ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            <span>Record</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors",
                activeTab === "record"
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground group-hover:bg-accent"
              )}
            >
              {totalRecordCount}
            </span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT: DETAIL */}
      {activeTab === "detail" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Identity & Stock/Condition */}
          <div className="space-y-6 lg:col-span-7">
            {/* Stok & Kondisi */}
            <SectionCard title="Stok & Kondisi" description="Perbarui kuantitas, lokasi penempatan, dan status kelayakan aset">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Stok</Label>
                  <Input type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Lokasi</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Kondisi</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as ItemCondition)}
                  >
                    {(["BAIK", "PERLU_PERBAIKAN", "RUSAK"] as const).map((c) => (
                      <option key={c} value={c}>
                        {c.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Catatan perubahan kondisi</Label>
                  <Textarea
                    value={conditionNote}
                    onChange={(e) => setConditionNote(e.target.value)}
                    placeholder="Contoh: Bodi lecet ringan, fungsi audio normal"
                    rows={2}
                    className="min-h-[72px] resize-none"
                  />
                </div>
                <div className="sm:col-span-2 pt-1">
                  <Button onClick={() => save.mutate()} disabled={save.isPending}>
                    {save.isPending ? "Menyimpan…" : "Simpan perubahan"}
                  </Button>
                </div>
              </div>
            </SectionCard>

            {/* Identitas Stiker Aset Lembaga */}
            <SectionCard title="Identitas stiker aset lembaga" description="Data utama yang tertera pada label aset lembaga">
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Kode aset lembaga</Label>
                    <Input
                      value={externalAssetCode}
                      onChange={(e) => setExternalAssetCode(e.target.value)}
                      placeholder="Contoh: AST-2024-001"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Nama barang / Deskripsi Label</Label>
                    <Textarea
                      value={externalQrValue}
                      onChange={(e) => setExternalQrValue(e.target.value)}
                      rows={2}
                      className="min-h-[72px] resize-none"
                      placeholder="Informasi yang terbaca dari QR / label stiker"
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t border-border/60 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Gambar QR Lembaga</p>
                      <p className="text-xs text-muted-foreground">Foto QR fisik sebagai arsip verifikasi</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 shrink-0 rounded-full p-0"
                      onClick={() => externalQrRef.current?.click()}
                      aria-label="Tambah gambar QR"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <ImageGrid urls={qrImages} emptyLabel="Belum ada QR" previewTitle="Gambar QR" />
                  {uploadExternalQr.isPending ? <p className="text-xs text-muted-foreground">Mengunggah…</p> : null}
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Right Column (5 cols): Gambar, Label QR WahSys & Danger Zone */}
          <div className="space-y-6 lg:col-span-5">
            {/* Gambar Barang */}
            <SectionCard
              title="Gambar barang"
              description="JPEG / PNG / WebP, maks. 5 MB"
              onAdd={() => imgRef.current?.click()}
              addLabel="Tambah gambar barang"
            >
              <ImageGrid urls={itemImages} emptyLabel="Belum ada gambar" previewTitle="Gambar barang" />
              {uploadImg.isPending ? <p className="mt-2 text-xs text-muted-foreground">Mengunggah…</p> : null}
            </SectionCard>

            {/* Label QR WahSys */}
            {data.assetCode && origin ? (
              <SectionCard title="Label QR WahSys (Fallback)" description="QR internal untuk pemindaian dan pelabelan sistem">
                <AssetQrLabel
                  assetCode={data.assetCode}
                  qrUrl={`${appUrl || origin}/scan/${data.assetCode}`}
                  summaryLines={[
                    data.kind === "ASET" ? "Aset" : "Non aset",
                    data.category?.name ?? "",
                    data.location ?? "",
                    data.condition?.replace(/_/g, " ") ?? "",
                  ]}
                />
              </SectionCard>
            ) : null}

            {/* Hapus Barang */}
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-destructive">Hapus barang</p>
                <p className="text-xs text-muted-foreground">Data barang akan dihapus permanen dari sistem.</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0"
                onClick={handleDelete}
                disabled={del.isPending}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: RECORD (Maintenance & Log) */}
      {activeTab === "record" && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/60 shadow-none bg-card/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Perawatan</p>
                  <p className="text-xl font-bold tracking-tight">{data.maintenanceLogs.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-none bg-card/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Biaya Perawatan</p>
                  <p className="text-xl font-bold tracking-tight">{formatRupiah(totalMaintenanceCost)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-none bg-card/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Riwayat Kondisi</p>
                  <p className="text-xl font-bold tracking-tight">{data.conditionLogs.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 2 Tables Side-by-Side: Riwayat Kondisi (Kiri) & Maintenance/Biaya (Kanan) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Tabel 1 (Kiri): Riwayat Kondisi */}
            <SectionCard
              title="Riwayat Kondisi"
              description="Jejak kronologis perubahan kondisi fisik barang"
            >
              {data.conditionLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-2">
                    <ClipboardList className="h-6 w-6 opacity-60" />
                  </div>
                  <p className="text-sm font-medium">Belum ada riwayat kondisi</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Perubahan kondisi fisik pada form Detail akan tercatat di sini.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-[140px]">Waktu</TableHead>
                        <TableHead className="w-[110px]">Dari</TableHead>
                        <TableHead className="w-[110px]">Ke</TableHead>
                        <TableHead>Catatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.conditionLogs.map((l) => (
                        <TableRow key={l.id} className="hover:bg-muted/30">
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(l.changedAt).toLocaleString("id-ID", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell>
                            <ConditionBadge condition={l.oldCondition} />
                          </TableCell>
                          <TableCell>
                            <ConditionBadge condition={l.newCondition} />
                          </TableCell>
                          <TableCell className="text-sm text-foreground/90">
                            {l.note || <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>

            {/* Tabel 2 (Kanan): Maintenance & Biaya */}
            <SectionCard
              title="Maintenance & Biaya"
              description="Catatan riwayat perbaikan, servis, dan rincian biaya pengeluaran"
              onAdd={() => setShowMaintForm((v) => !v)}
              addLabel="Tambah log perawatan"
            >
              <div className="space-y-4">
                {showMaintForm ? (
                  <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 transition-all">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-primary">Catat Perawatan Baru</p>
                    </div>
                    <Textarea
                      value={maintDesc}
                      onChange={(e) => setMaintDesc(e.target.value)}
                      placeholder="Deskripsi perawatan (contoh: Service besar penggantian IC yang terbakar)"
                      rows={3}
                      className="min-h-[80px] resize-none bg-background"
                    />
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Biaya (opsional)</Label>
                      <Input
                        type="number"
                        placeholder="Contoh: 100000"
                        value={maintCost}
                        onChange={(e) => setMaintCost(e.target.value)}
                        className="bg-background"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button onClick={() => addMaint.mutate()} disabled={!maintDesc.trim() || addMaint.isPending}>
                        {addMaint.isPending ? "Menyimpan…" : "Simpan log perawatan"}
                      </Button>
                      <Button variant="ghost" onClick={() => setShowMaintForm(false)}>
                        Batal
                      </Button>
                    </div>
                  </div>
                ) : null}

                {data.maintenanceLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 mb-2">
                      <Wrench className="h-6 w-6 opacity-60" />
                    </div>
                    <p className="text-sm font-medium">Belum ada catatan perawatan</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Klik tombol + di atas untuk mencatat perbaikan & biaya baru.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border/60 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="w-[140px]">Tanggal</TableHead>
                          <TableHead>Deskripsi</TableHead>
                          <TableHead className="text-right w-[130px]">Biaya</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.maintenanceLogs.map((m) => (
                          <TableRow key={m.id} className="hover:bg-muted/30">
                            <TableCell className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                              {new Date(m.performedAt).toLocaleString("id-ID", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell className="text-sm">{m.description}</TableCell>
                            <TableCell className="text-right font-mono text-sm font-medium text-emerald-600 dark:text-emerald-400">
                              {formatRupiah(m.cost)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Dialog Ekspor Data Barang (CSV, PDF, Print) */}
      <ItemExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        item={data}
        scanUrl={data.assetCode ? `${appUrl || origin}/scan/${data.assetCode}` : (appUrl || origin)}
      />
    </div>
  );
}
