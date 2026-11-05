"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { refreshAccessToken } from "@/lib/api-client";
import { Toaster } from "@/components/ui/toaster";

function AuthHydrate({ children }: { children: React.ReactNode }) {
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    (async () => {
      const ok = await refreshAccessToken();
      if (!ok) clear();
      setHydrated(true);
    })();
  }, [clear, setHydrated]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30000 } } })
  );

  return (
    <QueryClientProvider client={client}>
      <AuthHydrate>{children}</AuthHydrate>
      <Toaster />
    </QueryClientProvider>
  );
}
