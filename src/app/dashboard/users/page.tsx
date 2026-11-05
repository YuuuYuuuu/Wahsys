"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OrgRole, Role, StaffUnit } from "@prisma/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ORG_ROLE_LABELS, STAFF_UNIT_LABELS } from "@/lib/org/labels";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { HeaderActions } from "@/components/dashboard/header-actions";
import { User, Mail, Shield, Building2 } from "lucide-react";

const USERS_PAGE_SIZE = 20;

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  orgRole: OrgRole | null;
  unit: StaffUnit | null;
  supervisorId: string | null;
  accountApproved: boolean;
  createdAt: string;
  supervisor: { id: string; name: string; email: string } | null;
};

type UsersPageResponse = {
  items: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type KepalaOption = { id: string; name: string; email: string };

export default function UsersPage() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [orgTarget, setOrgTarget] = useState<UserRow | null>(null);
  const [filterPending, setFilterPending] = useState(false);
  const [page, setPage] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>(Role.PETUGAS);

  const [orgRole, setOrgRole] = useState<OrgRole | "">("");
  const [unit, setUnit] = useState<StaffUnit | "">("");
  const [supervisorId, setSupervisorId] = useState("");

  useEffect(() => {
    if (role && role !== Role.ADMIN) router.replace("/dashboard");
  }, [role, router]);

  useEffect(() => {
    setPage(1);
  }, [filterPending]);

  const { data: usersPage } = useQuery({
    queryKey: ["users", page, filterPending],
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(page),
        limit: String(USERS_PAGE_SIZE),
      });
      if (filterPending) sp.set("pending", "1");
      const res = await apiFetch(`/api/users?${sp}`);
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<UsersPageResponse>;
    },
    enabled: role === Role.ADMIN,
  });

  useEffect(() => {
    if (usersPage && usersPage.page !== page) setPage(usersPage.page);
  }, [usersPage, page]);

  const { data: kepalaList = [] } = useQuery({
    queryKey: ["kepala-seksi"],
    queryFn: async () => {
      const res = await apiFetch("/api/users/kepala-seksi");
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<KepalaOption[]>;
    },
    enabled: role === Role.ADMIN && orgOpen,
  });

  const visible = usersPage?.items ?? [];

  const patchRole = useMutation({
    mutationFn: async ({ id, r }: { id: string; r: Role }) => {
      const res = await apiFetch(`/api/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: r }),
      });
      if (!res.ok) throw new Error("fail");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Role diperbarui" });
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/users/${id}/approve`, { method: "PATCH", body: JSON.stringify({}) });
      if (!res.ok) throw new Error("fail");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Pengguna disetujui" });
    },
    onError: () => toast({ variant: "destructive", title: "Gagal menyetujui" }),
  });

  const createUser = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role: newRole }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      toast({ title: "Pengguna dibuat" });
    },
    onError: () => toast({ variant: "destructive", title: "Gagal buat pengguna" }),
  });

  const patchOrg = useMutation({
    mutationFn: async () => {
      if (!orgTarget) throw new Error("no target");
      const body = {
        orgRole: orgRole === "" ? null : orgRole,
        unit: orgRole === OrgRole.STAFF && unit ? unit : null,
        supervisorId: orgRole === OrgRole.STAFF && supervisorId ? supervisorId : null,
      };
      const res = await apiFetch(`/api/users/${orgTarget.id}/org`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Gagal menyimpan organisasi");
      }
      return res.json();
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: ["kepala-seksi"] });
      setOrgOpen(false);
      setOrgTarget(null);
      toast({ title: "Hirarki organisasi diperbarui" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  function openOrgDialog(u: UserRow) {
    setOrgTarget(u);
    setOrgRole(u.orgRole ?? "");
    setUnit(u.unit ?? "");
    setSupervisorId(u.supervisorId ?? "");
    setOrgOpen(true);
  }

  if (role !== Role.ADMIN) return null;

  return (
    <div className="space-y-6">
      <HeaderActions>
        <div className="flex items-center gap-2 flex-nowrap md:flex-wrap">
          <Button
            type="button"
            variant={filterPending ? "secondary" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setFilterPending((v) => !v)}
          >
            {filterPending ? "Tampilkan semua" : "Hanya menunggu persetujuan"}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setOpen(true)}
          >
            Undang / buat pengguna
          </Button>
        </div>
      </HeaderActions>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pengguna baru</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Nama</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Label>Role</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
            >
              <option value={Role.PETUGAS}>PETUGAS</option>
              <option value={Role.ADMIN}>ADMIN</option>
            </select>
            <Button onClick={() => createUser.mutate()} disabled={!name || !email || password.length < 8}>
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={orgOpen}
        onOpenChange={(v) => {
          setOrgOpen(v);
          if (!v) setOrgTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hirarki kinerja — {orgTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Peran organisasi</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={orgRole}
              onChange={(e) => {
                const v = e.target.value as OrgRole | "";
                setOrgRole(v);
                if (v !== OrgRole.STAFF) {
                  setUnit("");
                  setSupervisorId("");
                }
              }}
            >
              <option value="">Tidak ikut modul kinerja</option>
              <option value={OrgRole.KEPALA_SEKSI}>{ORG_ROLE_LABELS.KEPALA_SEKSI}</option>
              <option value={OrgRole.STAFF}>{ORG_ROLE_LABELS.STAFF}</option>
            </select>
            {orgRole === OrgRole.STAFF && (
              <>
                <Label>Unit</Label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as StaffUnit | "")}
                >
                  <option value="">Pilih unit</option>
                  {Object.values(StaffUnit).map((u) => (
                    <option key={u} value={u}>
                      {STAFF_UNIT_LABELS[u]}
                    </option>
                  ))}
                </select>
                <Label>Kepala Seksi (supervisor)</Label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={supervisorId}
                  onChange={(e) => setSupervisorId(e.target.value)}
                >
                  <option value="">Pilih kepala seksi</option>
                  {kepalaList
                    .filter((k) => k.id !== orgTarget?.id)
                    .map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name} ({k.email})
                      </option>
                    ))}
                </select>
              </>
            )}
            <Button
              onClick={() => patchOrg.mutate()}
              disabled={
                patchOrg.isPending ||
                (orgRole === OrgRole.STAFF && (!unit || !supervisorId))
              }
            >
              Simpan hirarki
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Daftar Pengguna</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* MOBILE CARDS VIEW (< md) */}
          <div className="space-y-3 p-3.5 block md:hidden">
            {visible.map((u) => (
              <div
                key={u.id}
                className="rounded-xl border border-border/80 bg-card p-3.5 space-y-3 shadow-2xs transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <User className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-foreground truncate">{u.name}</h4>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>
                  {u.accountApproved ? (
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] shrink-0">
                      Aktif
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] shrink-0">
                      Menunggu
                    </Badge>
                  )}
                </div>

                <div className="rounded-lg bg-muted/40 p-2.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Hak Akses (Role):</span>
                    <select
                      className="h-7 rounded-md border border-input bg-background px-2 text-xs font-medium"
                      value={u.role}
                      onChange={(e) => patchRole.mutate({ id: u.id, r: e.target.value as Role })}
                    >
                      <option value={Role.PETUGAS}>PETUGAS</option>
                      <option value={Role.ADMIN}>ADMIN</option>
                    </select>
                  </div>
                  {u.orgRole && (
                    <div className="pt-1.5 border-t border-border/40 space-y-0.5 text-[11px] text-muted-foreground">
                      <div className="font-medium text-foreground">{ORG_ROLE_LABELS[u.orgRole]}</div>
                      {u.unit && <div>Unit: {STAFF_UNIT_LABELS[u.unit]}</div>}
                      {u.supervisor && <div>Supervisor: → {u.supervisor.name}</div>}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => openOrgDialog(u)}>
                    Hirarki
                  </Button>
                  {!u.accountApproved && (
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 h-8 text-xs bg-primary text-primary-foreground font-medium"
                      onClick={() => approve.mutate(u.id)}
                      disabled={approve.isPending}
                    >
                      Setujui Akun
                    </Button>
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
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organisasi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      {u.accountApproved ? (
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px]">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px]">
                          Menunggu
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        value={u.role}
                        onChange={(e) => patchRole.mutate({ id: u.id, r: e.target.value as Role })}
                      >
                        <option value={Role.PETUGAS}>PETUGAS</option>
                        <option value={Role.ADMIN}>ADMIN</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-xs">
                      {u.orgRole ? (
                        <div className="space-y-0.5">
                          <div>{ORG_ROLE_LABELS[u.orgRole]}</div>
                          {u.unit ? <div className="text-muted-foreground">{STAFF_UNIT_LABELS[u.unit]}</div> : null}
                          {u.supervisor ? (
                            <div className="text-muted-foreground">→ {u.supervisor.name}</div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2 whitespace-nowrap">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openOrgDialog(u)}>
                        Hirarki
                      </Button>
                      {!u.accountApproved && (
                        <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => approve.mutate(u.id)} disabled={approve.isPending}>
                          Setujui
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {usersPage && (
            <div className="p-3 border-t border-border">
              <PaginationBar
                meta={{
                  page: usersPage.page,
                  pageSize: usersPage.pageSize,
                  total: usersPage.total,
                  totalPages: usersPage.totalPages,
                  itemCount: visible.length,
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
