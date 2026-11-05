"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { Activity, Clock, User, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AUDIT_PAGE_SIZE = 20;

type LogRow = {
  id: string;
  action: string;
  resource: string;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: { name: string; email: string };
};

type AuditPageResponse = {
  items: LogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function AuditPage() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (role && role !== Role.ADMIN) router.replace("/dashboard");
  }, [role, router]);

  const { data } = useQuery({
    queryKey: ["audit-logs", page],
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(page),
        limit: String(AUDIT_PAGE_SIZE),
      });
      const res = await apiFetch(`/api/audit-logs?${sp}`);
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<AuditPageResponse>;
    },
    enabled: role === Role.ADMIN,
  });

  useEffect(() => {
    if (data && data.page !== page) setPage(data.page);
  }, [data, page]);

  if (role !== Role.ADMIN) return null;

  const logs = data?.items ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Entri audit{data ? ` · ${data.total} total` : ""}
          </CardTitle>
          <p className="text-xs text-muted-foreground">Aktivitas login, CRUD, dan reveal kredensial.</p>
        </CardHeader>
        <CardContent className="p-0">
          {/* MOBILE CARDS VIEW (< md) */}
          <div className="space-y-3 p-3.5 block md:hidden">
            {logs.map((l) => (
              <div
                key={l.id}
                className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2.5 shadow-2xs transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline" className="font-mono text-[10px] bg-muted/50">
                    {l.action}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="rounded-lg bg-muted/40 p-2.5 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{l.user.email}</span>
                  </div>
                  <div className="font-mono text-[11px] truncate text-foreground/80">
                    Resource: {l.resource}
                  </div>
                  {l.ipAddress && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>IP: {l.ipAddress}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP TABLE VIEW (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto p-4 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Aksi</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(l.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{l.user.email}</TableCell>
                    <TableCell className="text-sm">{l.action}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">{l.resource}</TableCell>
                    <TableCell className="text-xs">{l.ipAddress ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data && (
            <div className="p-3.5 border-t border-border">
              <PaginationBar
                meta={{
                  page: data.page,
                  pageSize: data.pageSize,
                  total: data.total,
                  totalPages: data.totalPages,
                  itemCount: logs.length,
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
