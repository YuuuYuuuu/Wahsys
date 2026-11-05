"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { OvertimeRequestStatus, Role } from "@prisma/client";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { parseFormSnapshot } from "@/lib/lembur/form-defaults";
import type { OvertimeFormData } from "@/lib/lembur/form-defaults";
import { Calendar, User, Clock, ChevronLeft, ChevronRight } from "lucide-react";

type OvertimeRow = {
  id: string;
  status: OvertimeRequestStatus;
  createdAt: string;
  formSnapshot: unknown;
  user: { id: string; name: string; email: string };
};

type ListResponse = {
  items: OvertimeRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function statusLabel(s: OvertimeRequestStatus): string {
  switch (s) {
    case "DRAFT":
      return "Draf";
    case "MENUNGGU":
      return "Menunggu";
    case "DISETUJUI":
      return "Disetujui";
    case "DITOLAK":
      return "Ditolak";
    default:
      return s;
  }
}

function statusVariant(s: OvertimeRequestStatus): "default" | "secondary" | "outline" {
  if (s === "DISETUJUI") return "default";
  if (s === "MENUNGGU") return "secondary";
  return "outline";
}

export function OvertimeHistoryPanel({
  onLoadIntoComposer,
}: {
  onLoadIntoComposer: (data: OvertimeFormData, meta: { id: string; status: OvertimeRequestStatus }) => void;
}) {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const userId = useAuthStore((s) => s.user?.id);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<OvertimeRequestStatus | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["overtime-requests", page, statusFilter],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(page), limit: "15" });
      if (statusFilter) p.set("status", statusFilter);
      const res = await apiFetch(`/api/overtime-requests?${p}`);
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<ListResponse>;
    },
  });

  const submitMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/overtime-requests/${id}/submit`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Gagal mengajukan");
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["overtime-requests"] });
      toast({ title: "Diajukan", description: "Menunggu persetujuan admin." });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/overtime-requests/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Gagal menghapus");
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["overtime-requests"] });
      toast({ title: "Draf dihapus" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const reviewMut = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      const res = await apiFetch(`/api/overtime-requests/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Gagal");
      }
      return res.json();
    },
    onSuccess: (_, v) => {
      void qc.invalidateQueries({ queryKey: ["overtime-requests"] });
      toast({ title: v.action === "approve" ? "Disetujui" : "Ditolak" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const rows = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-col gap-3 border-b border-border/80 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">Riwayat pengajuan</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter((e.target.value || "") as OvertimeRequestStatus | "");
            }}
          >
            <option value="">Semua status</option>
            <option value="DRAFT">Draf</option>
            <option value="MENUNGGU">Menunggu</option>
            <option value="DISETUJUI">Disetujui</option>
            <option value="DITOLAK">Ditolak</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading && <p className="text-sm text-muted-foreground py-6 text-center">Memuat…</p>}
        {!isLoading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">Belum ada pengajuan.</p>
        )}
        {!isLoading && rows.length > 0 && (
          <>
            {/* MOBILE CARDS VIEW (< md) */}
            <div className="space-y-3 block md:hidden">
              {rows.map((row) => {
                const snap = parseFormSnapshot(row.formSnapshot);
                const isOwner = row.user.id === userId;
                return (
                  <div
                    key={row.id}
                    className="rounded-xl border border-border/80 bg-card p-3.5 space-y-3 shadow-2xs transition-colors hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {new Date(row.createdAt).toLocaleString("id-ID", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm text-foreground mt-1 leading-tight">
                          {snap.overtimeDay || "Lembur"} · {snap.date || "—"}
                        </h4>
                      </div>
                      <Badge variant={statusVariant(row.status)} className="text-[10px] shrink-0">
                        {statusLabel(row.status)}
                      </Badge>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-2.5 space-y-1 text-xs text-muted-foreground">
                      {role === Role.ADMIN && (
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>Pemohon: {row.user.name}</span>
                        </div>
                      )}
                      {(snap.startTime || snap.endTime) && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>
                            Jam: {snap.startTime || "—"} s/d {snap.endTime || "—"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/40">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs"
                        onClick={() =>
                          onLoadIntoComposer(parseFormSnapshot(row.formSnapshot), {
                            id: row.id,
                            status: row.status,
                          })
                        }
                      >
                        Buka
                      </Button>
                      {isOwner && row.status === "DRAFT" && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            className="flex-1 h-8 text-xs bg-primary text-primary-foreground"
                            onClick={() => submitMut.mutate(row.id)}
                            disabled={submitMut.isPending}
                          >
                            Ajukan
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs"
                            onClick={() => {
                              if (window.confirm("Hapus draf ini?")) delMut.mutate(row.id);
                            }}
                            disabled={delMut.isPending}
                          >
                            Hapus
                          </Button>
                        </>
                      )}
                      {role === Role.ADMIN && row.status === "MENUNGGU" && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            className="flex-1 h-8 text-xs bg-primary text-primary-foreground"
                            onClick={() => reviewMut.mutate({ id: row.id, action: "approve" })}
                            disabled={reviewMut.isPending}
                          >
                            Setujui
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-destructive/50 text-destructive hover:bg-destructive/10"
                            onClick={() => reviewMut.mutate({ id: row.id, action: "reject" })}
                            disabled={reviewMut.isPending}
                          >
                            Tolak
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE VIEW (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto rounded-md border border-border/80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    {role === Role.ADMIN && <TableHead>Pemohon</TableHead>}
                    <TableHead>Hari / tanggal lembur</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const snap = parseFormSnapshot(row.formSnapshot);
                    const isOwner = row.user.id === userId;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(row.createdAt).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </TableCell>
                        {role === Role.ADMIN && (
                          <TableCell className="max-w-[140px] truncate text-sm">{row.user.name}</TableCell>
                        )}
                        <TableCell className="text-sm">
                          {snap.overtimeDay || "—"} · {snap.date || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                onLoadIntoComposer(parseFormSnapshot(row.formSnapshot), {
                                  id: row.id,
                                  status: row.status,
                                })
                              }
                            >
                              Buka
                            </Button>
                            {isOwner && row.status === "DRAFT" && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => submitMut.mutate(row.id)}
                                  disabled={submitMut.isPending}
                                >
                                  Ajukan
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (window.confirm("Hapus draf ini?")) delMut.mutate(row.id);
                                  }}
                                  disabled={delMut.isPending}
                                >
                                  Hapus
                                </Button>
                              </>
                            )}
                            {role === Role.ADMIN && row.status === "MENUNGGU" && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => reviewMut.mutate({ id: row.id, action: "approve" })}
                                  disabled={reviewMut.isPending}
                                >
                                  Setujui
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                                  onClick={() => reviewMut.mutate({ id: row.id, action: "reject" })}
                                  disabled={reviewMut.isPending}
                                >
                                  Tolak
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
        {totalPages > 1 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs flex-1 sm:flex-none"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Sebelumnya
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs flex-1 sm:flex-none"
                disabled={page >= totalPages}
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
  );
}
