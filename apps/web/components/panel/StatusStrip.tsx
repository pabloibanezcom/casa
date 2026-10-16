"use client";

import { useMemo } from "react";
import { applianceStatus, domainOf, findAppliances, type ApplianceStatus, type HassEntity } from "@casa/core";
import { useEntities, useHA } from "@casa/core/react";
import { dayLabel, duration, time } from "@/lib/format";
import { useNow } from "./useNow";

/** "What's happening now": running/finished appliances and the front door. */
export function StatusStrip() {
  const { session } = useHA();
  const entities = useEntities();
  const now = useNow();

  const appliances = useMemo(() => (session ? findAppliances(session.registries) : []), [session]);
  const lock = useMemo(() => Object.values(entities).find((e) => domainOf(e.entity_id) === "lock"), [entities]);

  const active = appliances
    .map((a) => ({ a, status: applianceStatus(a, entities) }))
    .filter(({ status }) => status.kind !== "idle")
    .sort((x, y) => rank(x.status) - rank(y.status))
    .slice(0, lock ? 2 : 3);

  const cards = [
    ...active.map(({ a, status }) => <ApplianceCard key={a.deviceId} name={a.name} status={status} now={now} />),
    ...(active.length === 0
      ? [<div key="idle" className="card status"><span className="status__title">Electrodomésticos</span><span className="status__sub">Nada en marcha</span></div>]
      : []),
    ...(lock ? [<LockCard key="lock" lock={lock} now={now} />] : []),
  ];

  const wideFirst = active[0]?.status.kind === "running";
  const columns = cards.length === 3 ? (wideFirst ? "1.6fr 1fr 1fr" : "repeat(3, 1fr)") : wideFirst ? "1.6fr 1fr" : "repeat(2, 1fr)";

  return (
    <section aria-label="En marcha" className="strip" style={{ gridTemplateColumns: columns }}>
      {cards}
    </section>
  );
}

const rank = (s: ApplianceStatus) => (s.kind === "running" ? 0 : s.kind === "attention" ? 1 : 2);

function ApplianceCard({ name, status, now }: { name: string; status: ApplianceStatus; now: Date }) {
  if (status.kind === "running") {
    const title = status.program ? `${name} · ${status.program}` : name;
    const left = status.finishesAt ? status.finishesAt.getTime() - now.getTime() : null;
    return (
      <div className="card status status--wide">
        <div className="status__head">
          <span className="status__title">{title}</span>
          {status.finishesAt && <span className="status__sub">Termina {time(status.finishesAt)}</span>}
        </div>
        <div className="progress" role="progressbar" aria-valuenow={status.progress ?? undefined} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress__bar" style={{ width: `${status.progress ?? 0}%` }} />
        </div>
        <div className="status__sub">
          {status.paused ? "En pausa" : status.progress != null ? `${status.progress} %` : "En marcha"}
          {left != null && left > 0 && ` · quedan ${duration(left)}`}
        </div>
      </div>
    );
  }
  if (status.kind === "finished") {
    return (
      <div className="card status">
        <span className="status__title">{name}</span>
        <span className="status__line ok">Terminado {sinceLabel(status.at, now)}</span>
        <span className="status__sub">Listo para vaciar</span>
      </div>
    );
  }
  return (
    <div className="card status">
      <span className="status__title">{name}</span>
      <span className="status__line warn">{status.kind === "attention" ? status.label : ""}</span>
    </div>
  );
}

function LockCard({ lock, now }: { lock: HassEntity; now: Date }) {
  const since = new Date(lock.last_changed);
  const state = lock.state;
  const [label, tone] =
    state === "locked" ? ["Cerrada con llave", "ok"]
    : state === "unlocked" ? ["Sin llave", "warn"]
    : state === "open" ? ["Abierta", "warn"]
    : state === "jammed" ? ["Atascada", "warn"]
    : state === "unavailable" ? ["Sin conexión", "warn"]
    : [state, ""];
  return (
    <div className="card status">
      <span className="status__title">Puerta de entrada</span>
      <span className={`status__line ${tone}`}>{label}</span>
      <span className="status__sub">Desde {sinceLabel(since, now, "las")}</span>
    </div>
  );
}

/** "a las 17:58" today, "ayer a las 17:58" / "el lunes 12" otherwise. */
function sinceLabel(d: Date, now: Date, prefix = "a las") {
  const day = dayLabel(d, now);
  if (day === "Hoy") return `${prefix} ${time(d)}`;
  return `${day.toLowerCase()} · ${time(d)}`;
}
