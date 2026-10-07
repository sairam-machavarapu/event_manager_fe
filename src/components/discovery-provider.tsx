"use client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 0, gcTime: 5 * 60_000 } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
