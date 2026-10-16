"use client";

import { HAProvider } from "@casa/core/react";
import { browserTokenStore } from "@casa/core/stores/browser";

// Stable references: HAProvider reconnects if these change.
const tokenStore = browserTokenStore();
const hassUrl = process.env.NEXT_PUBLIC_HA_URL!;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HAProvider hassUrl={hassUrl} tokenStore={tokenStore}>
      {children}
    </HAProvider>
  );
}
