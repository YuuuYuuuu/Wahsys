"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";
import { encryptVaultPayload, randomSaltBase64 } from "@/lib/vault-crypto";
import {
  uploadEncryptedCredentialAttachment,
  VAULT_ATTACHMENT_MAX_BYTES,
} from "@/lib/client/upload-credential-file";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  CredentialDetailDialog,
  type CredDetailRow,
} from "@/components/vault/credential-detail-dialog";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { HeaderActions } from "@/components/dashboard/header-actions";

const VAULT_KEY = "wahsys_vault_passphrase_session";
const VAULT_AUTO_LOCK_MS = 10 * 60 * 1000;
const VAULT_PAGE_SIZE = 12;

type CredRow = CredDetailRow;

type CredentialsPageResponse = {
  items: CredRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function VaultPage() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const [passphrase, setPassphrase] = useState("");
  const [storedPass, setStoredPass] = useState<string | null>(null);
  const autoLockTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState("");
  const [username, setUsername] = useState("");
  const [plainPassword, setPlainPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const newCredFileInputRef = useRef<HTMLInputElement>(null);
  const [detailCred, setDetailCred] = useState<CredDetailRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (role && role !== Role.ADMIN) router.replace("/dashboard");
  }, [role, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = sessionStorage.getItem(VAULT_KEY);
    if (s) setStoredPass(s);
  }, []);

  const lock = useCallback(() => {
    sessionStorage.removeItem(VAULT_KEY);
    setStoredPass(null);
    setDetailCred(null);
    setDetailOpen(false);
  }, []);

  const unlock = useCallback(() => {
    sessionStorage.setItem(VAULT_KEY, passphrase);
    setStoredPass(passphrase);
    setPassphrase("");
    toast({ title: "Vault terbuka (sesi browser ini saja)" });
  }, [passphrase]);

  useEffect(() => {
    if (autoLockTimerRef.current) {
      window.clearTimeout(autoLockTimerRef.current);
      autoLockTimerRef.current = null;
    }
    if (!storedPass) return;

    autoLockTimerRef.current = window.setTimeout(() => {
      lock();
      toast({ title: "Vault terkunci otomatis", description: "Sesi vault berakhir setelah 10 menit." });
    }, VAULT_AUTO_LOCK_MS);

    return () => {
      if (autoLockTimerRef.current) {
        window.clearTimeout(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }
    };
  }, [storedPass, lock]);

  const qc = useQueryClient();
  const { data: credPage } = useQuery({
    queryKey: ["credentials", page],
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(page),
        limit: String(VAULT_PAGE_SIZE),
      });
      const res = await apiFetch(`/api/credentials?${sp}`);
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<CredentialsPageResponse>;
    },
    enabled: role === Role.ADMIN,
  });

  useEffect(() => {
    if (credPage && credPage.page !== page) setPage(credPage.page);
  }, [credPage, page]);

  const list = credPage?.items ?? [];

  const createCred = useMutation({
    mutationFn: async () => {
      if (!storedPass) throw new Error("Passphrase required");
      const filesSnapshot = [...pendingFiles];
      for (const f of filesSnapshot) {
        if (f.size > VAULT_ATTACHMENT_MAX_BYTES) {
          throw new Error(`File "${f.name}" melebihi ${VAULT_ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB`);
        }
      }
      const salt = randomSaltBase64();
      const { encryptedData, iv } = await encryptVaultPayload(storedPass, salt, {
        password: plainPassword,
        notes,
      });
      const res = await apiFetch("/api/credentials", {
        method: "POST",
        body: JSON.stringify({
          title,
          username: username || null,
          encryptedData,
          iv,
          salt,
          category: category || null,
        }),
      });
      if (!res.ok) throw new Error("fail");
      const created = (await res.json()) as { id: string; salt: string };
      const uploadErrors: string[] = [];
      for (const f of filesSnapshot) {
        const r = await uploadEncryptedCredentialAttachment(storedPass, created, f, apiFetch);
        if (!r.ok) uploadErrors.push(`${f.name}: ${r.message}`);
      }
      return { uploadErrors, hadFiles: filesSnapshot.length > 0 };
    },
    onSuccess: (data) => {
      setPage(1);
      qc.invalidateQueries({ queryKey: ["credentials"] });
      setOpen(false);
      setTitle("");
      setUsername("");
      setPlainPassword("");
      setNotes("");
      setCategory("");
      setPendingFiles([]);
      if (newCredFileInputRef.current) newCredFileInputRef.current.value = "";
      if (data.uploadErrors.length > 0) {
        toast({
          variant: "destructive",
          title: "Kredensial disimpan; sebagian lampiran gagal",
          description: data.uploadErrors.join(" · "),
        });
      } else if (data.hadFiles) {
        toast({ title: "Kredensial & lampiran disimpan (terenkripsi)" });
      } else {
        toast({ title: "Kredensial disimpan (terenkripsi)" });
      }
    },
    onError: (e: Error) =>
      toast({ variant: "destructive", title: e.message === "fail" ? "Gagal simpan" : e.message }),
  });

  async function uploadEncryptedFile(c: CredRow, file: File) {
    if (!storedPass) {
      toast({ variant: "destructive", title: "Buka vault dengan passphrase" });
      return;
    }
    if (file.size > VAULT_ATTACHMENT_MAX_BYTES) {
      toast({
        variant: "destructive",
        title: `Ukuran maks. ${VAULT_ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB`,
      });
      return;
    }
    const r = await uploadEncryptedCredentialAttachment(storedPass, c, file, apiFetch);
    if (r.ok) {
      qc.invalidateQueries({ queryKey: ["credentials"] });
      toast({ title: "File terenkripsi diunggah" });
    } else {
      toast({ variant: "destructive", title: r.message });
    }
  }

  if (role !== Role.ADMIN) return null;

  return (
    <div className="space-y-6">
      {storedPass && (
        <HeaderActions>
          <div className="flex items-center gap-2 flex-nowrap md:flex-wrap">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={lock}>
              Kunci vault
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => setOpen(true)}>
              Tambah kredensial
            </Button>
          </div>
        </HeaderActions>
      )}

      <div>
        <p className="text-xs text-muted-foreground">
          Passphrase tidak dikirim ke server. Data sensitif dienkripsi di browser (AES-GCM + PBKDF2). Gunakan{" "}
          <strong className="font-medium text-foreground">Buka pratinjau</strong> untuk melihat password, catatan, dan
          lampiran dengan kontrol &quot;tahan untuk melihat&quot; agar lebih aman dari intipan cepat.
        </p>
      </div>
      {!storedPass ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buka vault</CardTitle>
          </CardHeader>
          <CardContent className="flex max-w-md flex-col gap-3">
            <Input
              type="password"
              placeholder="Passphrase master"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
            <Button onClick={unlock} disabled={!passphrase}>
              Buka sesi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Baru</DialogTitle>
                </DialogHeader>
                <div className="grid gap-2">
                  <Label>Judul</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Label>Username (plaintext opsional)</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} />
                  <Label>Password (akan dienkripsi)</Label>
                  <Input type="password" value={plainPassword} onChange={(e) => setPlainPassword(e.target.value)} />
                  <Label>Catatan (terenkripsi)</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                  <Label>Kategori</Label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} />
                  <Label>Lampiran (opsional)</Label>
                  <input
                    ref={newCredFileInputRef}
                    type="file"
                    multiple
                    className="mt-1 block w-full text-sm text-muted-foreground file:mr-2 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5"
                    onChange={(e) => {
                      const list = e.target.files ? Array.from(e.target.files) : [];
                      setPendingFiles(list);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    PDF, Word, atau tipe lain — dienkripsi di browser sebelum unggah. Maks.{" "}
                    {VAULT_ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB per file. Tanpa S3, file disimpan di{" "}
                    <code className="rounded bg-muted px-1">public/uploads/credentials</code>.
                  </p>
                  {pendingFiles.length > 0 && (
                    <ul className="max-h-24 list-inside list-disc overflow-y-auto text-xs text-muted-foreground">
                      {pendingFiles.map((f) => (
                        <li key={`${f.name}-${f.size}`}>{f.name}</li>
                      ))}
                    </ul>
                  )}
                  <Button onClick={() => createCred.mutate()} disabled={!title || createCred.isPending}>
                    Simpan
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          <CredentialTable
            list={list}
            pageMeta={
              credPage
                ? {
                    page: credPage.page,
                    pageSize: credPage.pageSize,
                    total: credPage.total,
                    totalPages: credPage.totalPages,
                    itemCount: list.length,
                  }
                : null
            }
            onPageChange={setPage}
            storedPass={storedPass}
            onOpenDetail={(c) => {
              setDetailCred(c);
              setDetailOpen(true);
            }}
            onUploadEncryptedFile={uploadEncryptedFile}
          />
          <CredentialDetailDialog
            open={detailOpen}
            onOpenChange={(o) => {
              setDetailOpen(o);
              if (!o) setDetailCred(null);
            }}
            credential={detailOpen ? detailCred : null}
            passphrase={storedPass ?? ""}
          />
        </>
      )}
    </div>
  );
}

function CredentialTable({
  list,
  pageMeta,
  onPageChange,
  storedPass,
  onOpenDetail,
  onUploadEncryptedFile,
}: {
  list: CredRow[];
  pageMeta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    itemCount: number;
  } | null;
  onPageChange: (page: number) => void;
  storedPass: string | null;
  onOpenDetail: (c: CredRow) => void;
  onUploadEncryptedFile: (c: CredRow, file: File) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Daftar{pageMeta ? ` · ${pageMeta.total} total` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Judul</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Lampiran</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.title}</TableCell>
                <TableCell>{c.username ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {c.files.length === 0 ? "—" : `${c.files.length} file`}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      disabled={!storedPass}
                      onClick={() => onOpenDetail(c)}
                    >
                      Buka pratinjau
                    </Button>
                    <input
                      id={`vault-file-${c.id}`}
                      type="file"
                      className="sr-only"
                      tabIndex={-1}
                      disabled={!storedPass}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUploadEncryptedFile(c, f);
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={!storedPass}
                      onClick={() => document.getElementById(`vault-file-${c.id}`)?.click()}
                    >
                      Upload
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {pageMeta && (
          <div className="mt-4">
            <PaginationBar meta={pageMeta} onPageChange={onPageChange} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
