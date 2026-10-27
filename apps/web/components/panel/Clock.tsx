"use client";

import { useHA } from "@casa/core/react";
import { longDate, time } from "@/lib/format";
import { ThemeButton } from "./theme";
import { useHydrated, useNow } from "./useNow";

export function Clock() {
  const now = useNow();
  const hydrated = useHydrated();
  const { status } = useHA();
  return (
    <div className="clock">
      <div className="clock__row">
        <div className="clock__time display num">{hydrated ? time(now) : "\u00a0"}</div>
        <ThemeButton />
      </div>
      <div className="clock__date">
        {hydrated ? longDate(now) : "\u00a0"}
        {status !== "connected" && <span className="conn-dot" data-status={status} title="Conexión con Home Assistant" />}
      </div>
    </div>
  );
}
