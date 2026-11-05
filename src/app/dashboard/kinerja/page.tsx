"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OrgRole,
  PerformancePeriodType,
  PerformanceReportStatus,
  Role,
  StaffUnit,
} from "@prisma/client";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  ORG_ROLE_LABELS,
  PERIOD_TYPE_LABELS,
  REPORT_STATUS_LABELS,
  STAFF_UNIT_LABELS,
} from "@/lib/org/labels";
import { addDaysLocal, todayDateInput, weekStartLocal } from "@/lib/org/dates";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { HeaderActions } from "@/components/dashboard/header-actions";

const KINERJA_PAGE_SIZE = 20;

type ReportRow = {
  id: string;
  periodType: PerformancePeriodType;
  periodStart: string;
  periodEnd: string;
  activities: string;
  status: PerformanceReportStatus;
  author: {
    id: string;
    name: string;
    unit: StaffUnit | null;
  };
};

type ListResponse = {
  items: ReportRow[];
  total: number;
  page: number;
  limit: number;
  pageSize: number;
  totalPages: number;
};

export default function KinerjaPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canAccess = user?.role === Role.ADMIN || Boolean(user?.orgRole);

  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PerformanceReportStatus | "">("");
  const [unitFilter, setUnitFilter] = useState<StaffUnit | "">("");
  const [periodType, setPeriodType] = useState<PerformancePeriodType>(PerformancePeriodType.DAILY);
  const [periodStart, setPeriodStart] = useState(todayDateInput());
  const [activities, setActivities] = useState("");
  const [blockers, setBlockers] = useState("");
  const [notes, setNotes] = useState("");

  const periodEnd = useMemo(() => {
    if (periodType === PerformancePeriodType.DAILY) return periodStart;
    const start = weekStartLocal(periodStart);
    return addDaysLocal(start, 6);
  }, [periodType, periodStart]);

  const effectiveStart = useMemo(() => {
    if (periodType === PerformancePeriodType.WEEKLY) return weekStartLocal(periodStart);
    return periodStart;
  }, [periodType, periodStart]);

  useEffect(() => {
    if (user && !canAccess) router.replace("/dashboard");
  }, [user, canAccess, router]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, unitFilter]);

  const isKepalaOrAdmin =
    user?.role === Role.ADMIN || user?.orgRole === OrgRole.KEPALA_SEKSI;

  const listQs = useMemo(() => {
    const sp = new URLSearchParams({
      page: String(page),
      limit: String(KINERJA_PAGE_SIZE),
    });
    if (statusFilter) sp.set("status", statusFilter);
    if (unitFilter && isKepalaOrAdmin) sp.set("unit", unitFilter);
    return sp.toString();
  }, [page, statusFilter, unitFilter, isKepalaOrAdmin]);

  const { data, isLoading } = useQuery({
    queryKey: ["performance-reports", listQs],
    queryFn: async () => {
      const res = await apiFetch(`/api/performance-reports?${listQs}`);
      if (!res.ok) throw new Error("Gagal memuat laporan");
      return res.json() as Promise<ListResponse>;
    },
    enabled: canAccess,
  });

  useEffect(() => {
    if (data && data.page !== page) setPage(data.page);
  }, [data, page]);

  const createMut = useMutation({
    mutationFn: async (submit: boolean) => {
      const res = await apiFetch("/api/performance-reports", {
        method: "POST",
        body: JSON.stringify({
          periodType,
          periodStart: effectiveStart,
          periodEnd,
          activities,
          blockers: blockers || null,
          notes: notes || null,
          submit,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Gagal menyimpan");
      }
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: (row, submit) => {
      void qc.invalidateQueries({ queryKey: ["performance-reports"] });
      setOpen(false);
      setActivities("");
      setBlockers("");
      setNotes("");
      toast({ title: submit ? "Laporan diajukan" : "Draf disimpan" });
      router.push(`/dashboard/kinerja/${row.id}`);
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  if (!canAccess) return null;

  return (
    <div className="space-y-6">
      <HeaderActions>
        <div className="flex items-center gap-2 flex-nowrap md:flex-wrap">
          {isKepalaOrAdmin && (
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href="/dashboard/kinerja/meeting">Ringkasan Meeting</Link>
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs">
                Buat laporan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Laporan aktivitas</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label>Jenis periode</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as PerformancePeriodType)}
                  >
                    <option value={PerformancePeriodType.DAILY}>Harian</option>
                    <option value={PerformancePeriodType.WEEKLY}>Mingguan</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>{periodType === PerformancePeriodType.WEEKLY ? "Tanggal dalam minggu" : "Tanggal"}</Label>
                  <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    Periode: {effectiveStart} s/d {periodEnd}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Aktivitas yang dikerjakan</Label>
                  <textarea
                    className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={activities}
                    onChange={(e) => setActivities(e.target.value)}
                    placeholder={"- Item pekerjaan 1\n- Item pekerjaan 2"}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Hambatan (opsional)</Label>
                  <textarea
                    className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={blockers}
                    onChange={(e) => setBlockers(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Catatan (opsional)</Label>
                  <textarea
                    className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={!activities.trim() || createMut.isPending}
                    onClick={() => createMut.mutate(false)}
                  >
                    Simpan draf
                  </Button>
                  <Button disabled={!activities.trim() || createMut.isPending} onClick={() => createMut.mutate(true)}>
                    Ajukan
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </HeaderActions>

      {(user?.orgRole || user?.unit) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Peran organisasi:</span>
          {user?.orgRole ? <Badge variant="secondary" className="text-[11px] font-normal">{ORG_ROLE_LABELS[user.orgRole]}</Badge> : null}
          {user?.unit ? <Badge variant="outline" className="text-[11px] font-normal">{STAFF_UNIT_LABELS[user.unit]}</Badge> : null}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Daftar laporan</CardTitle>
          <div className="flex flex-wrap gap-2">
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PerformanceReportStatus | "")}
            >
              <option value="">Semua status</option>
              {Object.values(PerformanceReportStatus).map((s) => (
                <option key={s} value={s}>
                  {REPORT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {isKepalaOrAdmin && (
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value as StaffUnit | "")}
              >
                <option value="">Semua unit</option>
                {Object.values(StaffUnit).map((u) => (
                  <option key={u} value={u}>
                    {STAFF_UNIT_LABELS[u]}
                  </option>
                ))}
              </select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          ) : !data?.items.length ? (
            <p className="text-sm text-muted-foreground">Belum ada laporan.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periode</TableHead>
                  {isKepalaOrAdmin && <TableHead>Penulis</TableHead>}
                  <TableHead>Jenis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      {r.periodStart.slice(0, 10)}
                      {r.periodEnd.slice(0, 10) !== r.periodStart.slice(0, 10)
                        ? ` – ${r.periodEnd.slice(0, 10)}`
                        : ""}
                    </TableCell>
                    {isKepalaOrAdmin && (
                      <TableCell className="text-sm">
                        {r.author.name}
                        {r.author.unit ? (
                          <span className="text-muted-foreground"> · {STAFF_UNIT_LABELS[r.author.unit]}</span>
                        ) : null}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline">{PERIOD_TYPE_LABELS[r.periodType]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "DRAFT" ? "secondary" : "outline"}>
                        {REPORT_STATUS_LABELS[r.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/dashboard/kinerja/${r.id}`}>Detail</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {data && (
            <div className="mt-4">
              <PaginationBar
                meta={{
                  page: data.page,
                  pageSize: data.pageSize ?? data.limit,
                  total: data.total,
                  totalPages: data.totalPages ?? Math.max(1, Math.ceil(data.total / (data.pageSize ?? data.limit))),
                  itemCount: data.items.length,
                }}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
