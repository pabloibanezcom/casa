"use client";

import { useHA } from "@casa/core/react";
import { longDate, time } from "@/lib/format";
import { useNow } from "./useNow";

export function Clock() {
  const now = useNow();
  const { status } = useHA();
  return (
    <div className="clock">
      <div className="clock__time display num" suppressHydrationWarning>{time(now)}</div>
      <div className="clock__date" suppressHydrationWarning>
        {longDate(now)}
        {status !== "connected" && <span className="conn-dot" data-status={status} title="Conexión con Home Assistant" />}
      </div>
    </div>
  );
}
