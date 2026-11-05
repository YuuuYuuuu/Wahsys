"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { AppLogo } from "@/components/ui/app-logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const pendingToastDone = useRef(false);
  const nextRaw = searchParams.get("next");
  const nextPath = nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : null;

  useEffect(() => {
    if (pendingToastDone.current) return;
    if (searchParams.get("pending") === "1") {
      pendingToastDone.current = true;
      toast({
        title: "Menunggu persetujuan",
        description: "Setelah admin menyetujui akun Anda, Anda dapat masuk dengan email dan password.",
      });
      const next = searchParams.get("next");
      const clean = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
      router.replace(clean, { scroll: false });
    }
  }, [searchParams, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        const title = res.status === 403 ? "Akun belum aktif" : "Gagal masuk";
        toast({ variant: "destructive", title, description: data.error ?? "Coba lagi." });
        return;
      }
      setSession(data.accessToken, data.user);
      router.push(nextPath ?? "/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-6">
        <AppLogo size="lg" />
      </div>
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl" style={{ fontFamily: "var(--font-display), serif" }}>Masuk ke Sistem</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Gunakan akun Anda untuk mengakses portal operasional</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Memproses…" : "Masuk"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Belum punya akun?{" "}
              <Link href="/register" className="text-primary underline">
                Daftar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/30 text-sm text-muted-foreground">Memuat…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
