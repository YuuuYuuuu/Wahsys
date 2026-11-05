"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ItemCondition, ItemKind } from "@prisma/client";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

type ScanItem = {
  id: string;
  assetCode: string | null;
  externalAssetCode: string | null;
  externalQrValue: string | null;
  name: string;
  kind: ItemKind;
  stock: number;
  location: string;
  condition: ItemCondition;
  description: string | null;
  category: { id: string; name: string };
  conditionLogs: { id: string; oldCondition: ItemCondition; newCondition: ItemCondition; note: string | null; changedAt: string }[];
  maintenanceLogs: { id: string; description: string; cost: number | null; performedAt: string }[];
};

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export default function ScanAssetPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const assetCode = String(params.assetCode ?? "");
  const canUpdate = user?.role === "ADMIN" || user?.role === "PETUGAS";

  const [tab, setTab] = useState<"detail" | "update">("detail");
  const [stock, setStock] = useState(0);
  const [location, setLocation] = useState("");
  const [condition, setCondition] = useState<ItemCondition>("BAIK");
  const [conditionNote, setConditionNote] = useState("");
  const [maintDesc, setMaintDesc] = useState("");
  const [maintCost, setMaintCost] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["scan-item", assetCode],
    enabled: hydrated && Boolean(assetCode),
    queryFn: async () => {
      const res = await apiFetch(`/api/items/lookup/${encodeURIComponent(assetCode)}`);
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        throw new ApiError(j.error || "Gagal memuat data", res.status, j.code);
      }
      return (await res.json()) as ScanItem;
    },
  });


  useEffect(() => {
    if (!data) return;
    setStock((prev) => (prev ? prev : data.stock));
    setLocation((prev) => (prev ? prev : data.location));
    setCondition((prev) => (prev ? prev : data.condition));
  }, [data]);

  const summary = useMemo(() => {
    if (!data) return [];
    return [
      data.kind === "ASET" ? "Aset" : "Non aset",
      data.category?.name ?? "",
      data.location ?? "",
      data.condition?.replace(/_/g, " ") ?? "",
    ].filter(Boolean);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!canUpdate) throw new ApiError("Hanya petugas/admin yang boleh update aset", 403);
      const res = await apiFetch(`/api/items/by-code/${encodeURIComponent(assetCode)}`, {
        method: "PATCH",
        body: JSON.stringify({
          stock,
          location: location || undefined,
          condition,
          conditionNote: conditionNote || undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        throw new ApiError(j.error || "Gagal menyimpan", res.status, j.code);
      }
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["scan-item", assetCode] });
      toast({ title: "Perubahan tersimpan" });
      setConditionNote("");
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : "Gagal menyimpan";
      toast({ variant: "destructive", title: msg });
    },
  });

  const addMaintenance = useMutation({
    mutationFn: async () => {
      if (!canUpdate) throw new ApiError("Hanya petugas/admin yang boleh tambah maintenance", 403);
      const res = await apiFetch(`/api/items/by-code/${encodeURIComponent(assetCode)}/maintenance`, {
        method: "POST",
        body: JSON.stringify({ description: maintDesc, cost: maintCost ? Number(maintCost) : null }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
        throw new ApiError(j.error || "Gagal tambah maintenance", res.status, j.code);
      }
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["scan-item", assetCode] });
      toast({ title: "Maintenance ditambah" });
      setMaintDesc("");
      setMaintCost("");
    },
    onError: (e: unknown) => {
      const msg = e instanceof ApiError ? e.message : "Gagal tambah maintenance";
      toast({ variant: "destructive", title: msg });
    },
  });

  if (!hydrated) {
    return <p className="p-4 text-sm text-muted-foreground">Memuat sesi…</p>;
  }

  if (isLoading || !data) {
    const msg = error instanceof Error ? error.message : "";
    return <p className="p-4 text-sm text-muted-foreground">{msg ? `Memuat… (${msg})` : "Memuat…"} </p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
            {data.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {data.assetCode ? (
              <Badge variant="secondary" className="font-mono text-[11px]">
                {data.assetCode}
              </Badge>
            ) : null}
            {data.externalAssetCode && data.externalAssetCode !== data.assetCode ? (
              <Badge variant="secondary" className="font-mono text-[11px]">
                Lembaga: {data.externalAssetCode}
              </Badge>
            ) : null}
            <Badge variant="outline" className="text-[11px]">
              {data.kind === "ASET" ? "Aset" : "Non aset"}
            </Badge>
            {summary.length ? <span className="text-xs text-muted-foreground">{summary.join(" · ")}</span> : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant={tab === "detail" ? "default" : "outline"} size="sm" onClick={() => setTab("detail")}>
            Detail
          </Button>
          <Button
            variant={tab === "update" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("update")}
            title={!user ? "Login untuk update" : !canUpdate ? "Hanya petugas/admin yang bisa update" : undefined}
          >
            Update
          </Button>
        </div>
      </div>

      {tab === "detail" && (
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base">Detail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Kode aset" value={data.assetCode || "—"} mono />
            <Row label="Nama barang (stiker)" value={data.externalQrValue || "—"} />
            <Row label="Kategori" value={data.category?.name || "—"} />
            <Row label="Lokasi" value={data.location || "—"} />
            <Row label="Kondisi" value={data.condition.replace(/_/g, " ")} />
          </CardContent>
        </Card>
      )}

      {tab === "update" && (
        <div className="space-y-4">
          {!user || !accessToken ? (
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="text-base">Login diperlukan untuk update</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Setelah scan, detail aset bisa dilihat tanpa login. Untuk update data aset, login sebagai petugas/admin.
                </p>
                <Button onClick={() => router.push(`/login?next=${encodeURIComponent(`/scan/${assetCode}`)}`)}>
                  Login
                </Button>
              </CardContent>
            </Card>
          ) : !canUpdate ? (
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="text-base">Akses update ditolak</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-destructive">Hanya role petugas/admin yang boleh melakukan update aset.</p>
              </CardContent>
            </Card>
          ) : null}

          {user && accessToken && canUpdate ? (
            <>
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-base">Pemindahan lokasi / kondisi</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div>
                <Label>Jumlah</Label>
                <Input type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value))} />
              </div>
              <div>
                <Label>Lokasi</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div>
                <Label>Kondisi</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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
              <div>
                <Label>Catatan perubahan kondisi (opsional)</Label>
                <Textarea value={conditionNote} onChange={(e) => setConditionNote(e.target.value)} />
              </div>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Menyimpan…" : "Simpan"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-base">Maintenance log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={maintDesc} onChange={(e) => setMaintDesc(e.target.value)} placeholder="Deskripsi" />
              <Input type="number" placeholder="Biaya (opsional)" value={maintCost} onChange={(e) => setMaintCost(e.target.value)} />
              <Button onClick={() => addMaintenance.mutate()} disabled={!maintDesc || addMaintenance.isPending}>
                {addMaintenance.isPending ? "Menyimpan…" : "Tambah log"}
              </Button>
            </CardContent>
          </Card>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[110px_12px_1fr] gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-muted-foreground">:</span>
      <span className={mono ? "font-mono" : ""}>{value}</span>
    </div>
  );
}

