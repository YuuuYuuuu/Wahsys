"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { HeaderActions } from "@/components/dashboard/header-actions";

type SmtpState = {
  host: string;
  port: number;
  secure: boolean;
  authUser: string;
  fromEmail: string;
  fromName: string;
  hasPassword: boolean;
};

type TemplateRow = {
  key: string;
  name: string;
  subject: string;
  bodyHtml: string;
};

const PLACEHOLDERS = `Placeholder umum:
{{appName}} {{borrowerName}} {{itemName}} {{quantity}} {{dueDate}} {{confirmUrl}} {{expiresAt}} {{availableStock}} {{reason}}`;

export default function PengaturanEmailPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"smtp" | "templates">("smtp");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [secure, setSecure] = useState(false);
  const [authUser, setAuthUser] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [testTo, setTestTo] = useState("");
  const [daysBefore, setDaysBefore] = useState(1);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tplSubject, setTplSubject] = useState("");
  const [tplBody, setTplBody] = useState("");

  const { data: smtp } = useQuery({
    queryKey: ["admin-smtp"],
    queryFn: async () => {
      const res = await apiFetch("/api/admin/smtp");
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<SmtpState>;
    },
  });

  const { data: reminder } = useQuery({
    queryKey: ["admin-reminder"],
    queryFn: async () => {
      const res = await apiFetch("/api/admin/reminder");
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<{ daysBefore: number }>;
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const res = await apiFetch("/api/admin/email-templates");
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<TemplateRow[]>;
    },
  });

  useEffect(() => {
    if (!smtp) return;
    setHost(smtp.host);
    setPort(smtp.port);
    setSecure(smtp.secure);
    setAuthUser(smtp.authUser);
    setFromEmail(smtp.fromEmail);
    setFromName(smtp.fromName);
  }, [smtp]);

  useEffect(() => {
    if (port === 465) setSecure(true);
    else if (port === 587) setSecure(false);
  }, [port]);

  useEffect(() => {
    if (reminder) setDaysBefore(reminder.daysBefore);
  }, [reminder]);

  useEffect(() => {
    if (!templates.length || selectedKey) return;
    const t0 = templates[0];
    setSelectedKey(t0.key);
    setTplSubject(t0.subject);
    setTplBody(t0.bodyHtml);
  }, [templates, selectedKey]);

  const saveSmtp = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/admin/smtp", {
        method: "PATCH",
        body: JSON.stringify({
          host,
          port,
          secure,
          authUser,
          fromEmail,
          fromName,
          authPassword: authPassword || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Gagal simpan");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-smtp"] });
      toast({
        title: "Pengaturan SMTP disimpan",
        description: "Kata sandi tetap di kolom ini sampai Anda mengosongkannya atau keluar halaman.",
      });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const saveReminder = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/admin/reminder", {
        method: "PATCH",
        body: JSON.stringify({ daysBefore }),
      });
      if (!res.ok) throw new Error("Gagal");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reminder"] });
      toast({ title: "Hari pengingat diperbarui" });
    },
    onError: () => toast({ variant: "destructive", title: "Gagal simpan pengingat" }),
  });

  const testMail = useMutation({
    mutationFn: async (to: string) => {
      const res = await apiFetch("/api/admin/smtp/test", {
        method: "POST",
        body: JSON.stringify({ to }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Gagal kirim uji");
      }
      return (await res.json()) as { ok: boolean; to: string };
    },
    onSuccess: (data) => {
      toast({
        title: "Email uji terkirim",
        description: `Periksa kotak masuk ${data.to} (folder spam jika perlu).`,
      });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Gagal kirim uji", description: e.message }),
  });

  const saveTpl = useMutation({
    mutationFn: async () => {
      if (!selectedKey) return;
      const res = await apiFetch(`/api/admin/email-templates/${encodeURIComponent(selectedKey)}`, {
        method: "PATCH",
        body: JSON.stringify({ subject: tplSubject, bodyHtml: tplBody }),
      });
      if (!res.ok) throw new Error("Gagal simpan template");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Template disimpan" });
    },
    onError: () => toast({ variant: "destructive", title: "Gagal simpan" }),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <HeaderActions>
        <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
          <Button
            type="button"
            variant={tab === "smtp" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2.5 text-xs"
            onClick={() => setTab("smtp")}
          >
            SMTP & Pengingat
          </Button>
          <Button
            type="button"
            variant={tab === "templates" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2.5 text-xs"
            onClick={() => setTab("templates")}
          >
            Template Email
          </Button>
        </div>
      </HeaderActions>

      <p className="text-xs text-muted-foreground">
        SMTP disimpan di database (password terenkripsi). Template HTML dikirim sebagai email — jangan sertakan skrip asing.
      </p>

      {tab === "smtp" && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Server SMTP</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Host</Label>
              <Input className="mt-1" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.example.com" />
              <p className="mt-1 text-xs text-muted-foreground">
                Hanya nama host, tanpa <code className="rounded bg-muted px-1">http://</code>. Gmail{" "}
                <code className="rounded bg-muted px-1">smtp.gmail.com</code>:{" "}
                <strong>587</strong> + TLS/SSL mati (STARTTLS), atau <strong>465</strong> + TLS/SSL aktif — server otomatis menyesuaikan jika port 465/587.
              </p>
            </div>
            <div>
              <Label>Port</Label>
              <Input className="mt-1" type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} />
                TLS/SSL (secure)
              </label>
            </div>
            <div>
              <Label>User SMTP</Label>
              <Input className="mt-1" value={authUser} onChange={(e) => setAuthUser(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Password {smtp?.hasPassword ? "(kosongkan jika tidak diubah)" : ""}</Label>
              <div className="relative mt-1">
                <Input
                  className="pr-10"
                  type={showSmtpPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-9 w-9 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSmtpPassword((v) => !v)}
                  aria-label={showSmtpPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label>From email</Label>
              <Input className="mt-1" type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
            </div>
            <div>
              <Label>From name</Label>
              <Input className="mt-1" value={fromName} onChange={(e) => setFromName(e.target.value)} />
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <Button onClick={() => saveSmtp.mutate()} disabled={saveSmtp.isPending}>
                Simpan SMTP
              </Button>
            </div>
            <div className="sm:col-span-2 rounded-md border border-dashed border-border bg-muted/30 p-4">
              <Label>Pengingat jatuh tempo (hari sebelum dueDate)</Label>
              <p className="mb-2 text-xs text-muted-foreground">
                Cron <code className="rounded bg-muted px-1">POST /api/cron/loan-reminders</code> dengan header{" "}
                <code className="rounded bg-muted px-1">Authorization: Bearer CRON_SECRET</code>
              </p>
              <div className="flex max-w-xs flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Input type="number" min={0} max={90} value={daysBefore} onChange={(e) => setDaysBefore(Number(e.target.value))} />
                </div>
                <Button type="button" variant="secondary" onClick={() => saveReminder.mutate()} disabled={saveReminder.isPending}>
                  Simpan
                </Button>
              </div>
            </div>
            <div className="sm:col-span-2 rounded-md border border-border p-4">
              <Label>Kirim email uji</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Pastikan sudah klik <strong>Simpan SMTP</strong> setelah mengisi password. Tanpa itu, server memakai pengaturan terakhir yang tersimpan.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Input
                  className="max-w-sm"
                  type="email"
                  placeholder="tujuan@email.com"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={() => testMail.mutate(testTo)}
                  disabled={!testTo || testMail.isPending}
                >
                  Kirim uji
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "templates" && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Template email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Template</Label>
              <select
                className="mt-1 flex h-9 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm"
                value={selectedKey ?? ""}
                onChange={(e) => {
                  const k = e.target.value;
                  setSelectedKey(k);
                  const t = templates.find((x) => x.key === k);
                  if (t) {
                    setTplSubject(t.subject);
                    setTplBody(t.bodyHtml);
                  }
                }}
              >
                {templates.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name} ({t.key})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Subjek</Label>
              <Input className="mt-1" value={tplSubject} onChange={(e) => setTplSubject(e.target.value)} />
            </div>
            <div>
              <Label>Body HTML</Label>
              <Textarea className="mt-1 min-h-[220px] font-mono text-xs" value={tplBody} onChange={(e) => setTplBody(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{PLACEHOLDERS}</p>
            <div>
              <Label className="text-muted-foreground">Pratinjau teks (aman, tanpa render HTML)</Label>
              <pre className="mt-1 max-h-48 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs">{tplBody}</pre>
            </div>
            <Button onClick={() => saveTpl.mutate()} disabled={saveTpl.isPending || !selectedKey}>
              Simpan template
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
