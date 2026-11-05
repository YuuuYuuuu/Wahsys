"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { toast } from "@/hooks/use-toast";
import {
  PERIOD_TYPE_LABELS,
  REPORT_STATUS_LABELS,
  STAFF_UNIT_LABELS,
} from "@/lib/org/labels";
import { addDaysLocal, toDateInputValue, weekStartLocal } from "@/lib/org/dates";
import { HeaderActions } from "@/components/dashboard/header-actions";

type ReportDetail = {
  id: string;
  authorId: string;
  periodType: PerformancePeriodType;
  periodStart: string;
  periodEnd: string;
  activities: string;
  blockers: string | null;
  notes: string | null;
  status: PerformanceReportStatus;
  reviewerNote: string | null;
  reviewedAt: string | null;
  author: {
    id: string;
    name: string;
    email: string;
    unit: StaffUnit | null;
    supervisorId: string | null;
  };
  reviewedBy: { id: string; name: string; email: string } | null;
};

export default function KinerjaDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, error } = useQuery({
    queryKey: ["performance-report", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/performance-reports/${id}`);
      if (res.status === 404) throw new Error("Tidak ditemukan");
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json() as Promise<ReportDetail>;
    },
    enabled: Boolean(id),
  });

  const [periodType, setPeriodType] = useState<PerformancePeriodType>(PerformancePeriodType.DAILY);
  const [periodStart, setPeriodStart] = useState("");
  const [activities, setActivities] = useState("");
  const [blockers, setBlockers] = useState("");
  const [notes, setNotes] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");

  useEffect(() => {
    if (!data) return;
    setPeriodType(data.periodType);
    setPeriodStart(toDateInputValue(data.periodStart));
    setActivities(data.activities);
    setBlockers(data.blockers ?? "");
    setNotes(data.notes ?? "");
  }, [data]);

  const isOwner = data && user?.id === data.authorId;
  const canEdit = isOwner && data?.status === PerformanceReportStatus.DRAFT;
  const canReview =
    data?.status === PerformanceReportStatus.SUBMITTED &&
    (user?.role === Role.ADMIN ||
      (user?.orgRole === OrgRole.KEPALA_SEKSI && data.author.supervisorId === user.id));

  const effectiveStart =
    periodType === PerformancePeriodType.WEEKLY ? weekStartLocal(periodStart || toDateInputValue(new Date())) : periodStart;
  const periodEnd =
    periodType === PerformancePeriodType.DAILY ? effectiveStart : addDaysLocal(effectiveStart, 6);

  const saveMut = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/performance-reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          periodType,
          periodStart: effectiveStart,
          periodEnd,
          activities,
          blockers: blockers || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Gagal menyimpan");
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["performance-report", id] });
      void qc.invalidateQueries({ queryKey: ["performance-reports"] });
      toast({ title: "Draf diperbarui" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const submitMut = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/performance-reports/${id}/submit`, { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Gagal mengajukan");
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["performance-report", id] });
      void qc.invalidateQueries({ queryKey: ["performance-reports"] });
      toast({ title: "Laporan diajukan" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const reviewMut = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/performance-reports/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ reviewerNote: reviewerNote || null }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Gagal mereview");
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["performance-report", id] });
      void qc.invalidateQueries({ queryKey: ["performance-reports"] });
      toast({ title: "Laporan ditandai sudah direview" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Memuat…</p>;
  }
  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">{(error as Error)?.message ?? "Tidak ditemukan"}</p>
        <Button variant="outline" onClick={() => router.push("/dashboard/kinerja")}>
          Kembali
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HeaderActions>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
            <Link href="/dashboard/kinerja">← Daftar kinerja</Link>
          </Button>
          <Badge variant={data.status === "DRAFT" ? "secondary" : "outline"} className="text-xs">
            {REPORT_STATUS_LABELS[data.status]}
          </Badge>
        </div>
      </HeaderActions>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{data.author.name}</span>
        {data.author.unit ? <span>· {STAFF_UNIT_LABELS[data.author.unit]}</span> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Isi laporan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {canEdit ? (
            <>
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
                <Label>Tanggal</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Periode: {effectiveStart} s/d {periodEnd}
                </p>
              </div>
              <div className="space-y-1">
                <Label>Aktivitas</Label>
                <textarea
                  className="min-h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Hambatan</Label>
                <textarea
                  className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Catatan</Label>
                <textarea
                  className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={saveMut.isPending} onClick={() => saveMut.mutate()}>
                  Simpan draf
                </Button>
                <Button
                  disabled={submitMut.isPending || !activities.trim()}
                  onClick={() => {
                    saveMut.mutate(undefined, {
                      onSuccess: () => submitMut.mutate(),
                    });
                  }}
                >
                  Ajukan
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm">
                <span className="text-muted-foreground">Jenis:</span> {PERIOD_TYPE_LABELS[data.periodType]}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Periode:</span> {data.periodStart.slice(0, 10)}
                {data.periodEnd.slice(0, 10) !== data.periodStart.slice(0, 10)
                  ? ` – ${data.periodEnd.slice(0, 10)}`
                  : ""}
              </p>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Aktivitas</p>
                <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm font-sans">{data.activities}</pre>
              </div>
              {data.blockers ? (
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Hambatan</p>
                  <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm font-sans">{data.blockers}</pre>
                </div>
              ) : null}
              {data.notes ? (
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">Catatan</p>
                  <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm font-sans">{data.notes}</pre>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {(canReview || data.status === PerformanceReportStatus.REVIEWED) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Kepala Seksi</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.status === PerformanceReportStatus.REVIEWED ? (
              <>
                <p className="text-sm">
                  Direview oleh {data.reviewedBy?.name ?? "—"}
                  {data.reviewedAt ? ` · ${new Date(data.reviewedAt).toLocaleString("id-ID")}` : ""}
                </p>
                {data.reviewerNote ? (
                  <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm font-sans">
                    {data.reviewerNote}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">Tanpa catatan review.</p>
                )}
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <Label>Catatan review (opsional)</Label>
                  <textarea
                    className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={reviewerNote}
                    onChange={(e) => setReviewerNote(e.target.value)}
                  />
                </div>
                <Button disabled={reviewMut.isPending} onClick={() => reviewMut.mutate()}>
                  Tandai sudah direview
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
