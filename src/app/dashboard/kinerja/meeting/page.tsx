"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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
import { PERIOD_TYPE_LABELS, REPORT_STATUS_LABELS, STAFF_UNIT_LABELS } from "@/lib/org/labels";
import { addDaysLocal, todayDateInput } from "@/lib/org/dates";
import { HeaderActions } from "@/components/dashboard/header-actions";

type BriefReport = {
  id: string;
  periodType: PerformancePeriodType;
  periodStart: string;
  periodEnd: string;
  activities: string;
  blockers: string | null;
  status: PerformanceReportStatus;
  author: { id: string; name: string; unit: StaffUnit | null };
};

type BriefResponse = {
  from: string;
  to: string;
  total: number;
  byUnit: { unit: StaffUnit; reports: BriefReport[] }[];
  unassigned: BriefReport[];
};

export default function MeetingBriefPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const canAccess = user?.role === Role.ADMIN || user?.orgRole === OrgRole.KEPALA_SEKSI;

  const [from, setFrom] = useState(() => addDaysLocal(todayDateInput(), -6));
  const [to, setTo] = useState(todayDateInput());
  const [applied, setApplied] = useState({ from: addDaysLocal(todayDateInput(), -6), to: todayDateInput() });

  useEffect(() => {
    if (user && !canAccess) router.replace("/dashboard/kinerja");
  }, [user, canAccess, router]);

  const qs = useMemo(() => `from=${applied.from}&to=${applied.to}`, [applied]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["meeting-brief", qs],
    queryFn: async () => {
      const res = await apiFetch(`/api/performance-reports/meeting-brief?${qs}`);
      if (!res.ok) throw new Error("Gagal memuat ringkasan");
      return res.json() as Promise<BriefResponse>;
    },
    enabled: canAccess,
  });

  if (!canAccess) return null;

  return (
    <div className="space-y-6">
      <HeaderActions>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link href="/dashboard/kinerja">← Kembali ke Kinerja</Link>
        </Button>
      </HeaderActions>

      <p className="text-xs text-muted-foreground">
        Agregasi laporan aktivitas bawahan yang sudah diajukan/direview, dikelompokkan per unit.
      </p>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="space-y-1">
            <Label>Dari</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Sampai</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button
            onClick={() => setApplied({ from, to })}
            disabled={!from || !to || from > to || isFetching}
          >
            Terapkan
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} laporan · {applied.from} s/d {applied.to}
          </p>
          <div className="grid gap-4">
            {data?.byUnit.map((group) => (
              <Card key={group.unit}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">{STAFF_UNIT_LABELS[group.unit]}</CardTitle>
                  <Badge variant="outline">{group.reports.length} laporan</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!group.reports.length ? (
                    <p className="text-sm text-muted-foreground">Belum ada laporan di periode ini.</p>
                  ) : (
                    group.reports.map((r) => (
                      <div key={r.id} className="border-b border-border/60 pb-3 last:border-0 last:pb-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium">{r.author.name}</span>
                          <Badge variant="secondary">{PERIOD_TYPE_LABELS[r.periodType]}</Badge>
                          <Badge variant="outline">{REPORT_STATUS_LABELS[r.status]}</Badge>
                          <span className="text-muted-foreground">
                            {r.periodStart.slice(0, 10)}
                            {r.periodEnd.slice(0, 10) !== r.periodStart.slice(0, 10)
                              ? ` – ${r.periodEnd.slice(0, 10)}`
                              : ""}
                          </span>
                          <Link href={`/dashboard/kinerja/${r.id}`} className="text-primary underline text-xs">
                            Detail
                          </Link>
                        </div>
                        <pre className="whitespace-pre-wrap font-sans text-sm">{r.activities}</pre>
                        {r.blockers ? (
                          <p className="mt-2 text-sm text-amber-800 dark:text-amber-200">
                            <span className="font-medium">Hambatan: </span>
                            {r.blockers}
                          </p>
                        ) : null}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
            {data?.unassigned?.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tanpa unit</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.unassigned.map((r) => (
                    <div key={r.id}>
                      <p className="text-sm font-medium">{r.author.name}</p>
                      <pre className="whitespace-pre-wrap font-sans text-sm">{r.activities}</pre>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
