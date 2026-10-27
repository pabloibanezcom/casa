"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { applianceStatus, domainOf, findAppliances, type ApplianceStatus, type HassEntity } from "@casa/core";
import { useCallService, useEntities, useHA } from "@casa/core/react";
import { dayLabel, duration, time } from "@/lib/format";
import { LockIcon, LockOpenIcon } from "./icons";
import { MusicStatusCard, useActivePlayers } from "./Music";
import { useNow } from "./useNow";

/** "What's happening now": music, running/finished appliances and the front door. */
export function StatusStrip() {
  const { session } = useHA();
  const entities = useEntities();
  const now = useNow();

  const appliances = useMemo(() => (session ? findAppliances(session.registries) : []), [session]);
  const lock = useMemo(() => Object.values(entities).find((e) => domainOf(e.entity_id) === "lock"), [entities]);

  const players = useActivePlayers();
  const player = players.length > 0;
  const slots = Math.max(1, 3 - (lock ? 1 : 0) - (player ? 1 : 0));

  const active = appliances
    .map((a) => ({ a, status: applianceStatus(a, entities) }))
    .filter(({ status }) => status.kind !== "idle")
    .sort((x, y) => rank(x.status) - rank(y.status))
    .slice(0, slots);

  // Each card with its column weight: music and running appliances get more room.
  const cards: { el: ReactNode; wide: boolean }[] = [
    ...(player ? [{ el: <MusicStatusCard key="music" players={players} />, wide: true }] : []),
    ...active.map(({ a, status }) => ({
      el: <ApplianceCard key={a.deviceId} name={a.name} status={status} now={now} />,
      wide: status.kind === "running",
    })),
    ...(active.length === 0 && !player
      ? [{ el: <div key="idle" className="card status"><span className="status__title">Electrodomésticos</span><span className="status__sub">Nada en marcha</span></div>, wide: false }]
      : []),
    ...(lock ? [{ el: <LockButton key="lock" lock={lock} />, wide: false }] : []),
  ];

  const columns = cards.map((c) => (c.wide && cards.length > 1 ? "1.6fr" : "1fr")).join(" ");

  return (
    // Columns go through a CSS variable so the stylesheet can stack them on phones.
    <section aria-label="En marcha" className="strip" style={{ "--strip-cols": columns } as CSSProperties}>
      {cards.map((c) => c.el)}
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
          <span className="status__sub">
            {status.paused ? "En pausa" : status.progress != null ? `${status.progress} %` : "En marcha"}
            {left != null && left > 0 && ` · quedan ${duration(left)}`}
            {status.finishesAt && ` · ${time(status.finishesAt)}`}
          </span>
        </div>
        <div className="progress" role="progressbar" aria-valuenow={status.progress ?? undefined} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress__bar" style={{ width: `${status.progress ?? 0}%` }} />
        </div>
      </div>
    );
  }
  if (status.kind === "finished") {
    return (
      <div className="card status">
        <span className="status__title">{name}</span>
        <span className="status__line">
          <span className="ok">Terminado {sinceLabel(status.at, now)}</span>
          <span className="status__sub"> · listo para vaciar</span>
        </span>
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

const CONFIRM_MS = 4000;

/**
 * The front door as one button: red while locked. Tapping locks straight away;
 * unlocking needs a second tap within a few seconds so a stray touch can't open the house.
 */
function LockButton({ lock }: { lock: HassEntity }) {
  const callService = useCallService();
  const [armed, setArmed] = useState(false);
  const state = lock.state;
  const locked = state === "locked";
  const busy = state === "locking" || state === "unlocking" || state === "opening";

  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => clearTimeout(id);
  }, [armed]);
  useEffect(() => setArmed(false), [state]);

  const label =
    armed ? "Toca otra vez para abrir"
    : state === "locked" ? "Cerrada con llave"
    : state === "unlocked" ? "Sin llave"
    : state === "open" ? "Abierta"
    : state === "locking" ? "Cerrando…"
    : state === "unlocking" || state === "opening" ? "Abriendo…"
    : state === "jammed" ? "Atascada"
    : state === "unavailable" ? "Sin conexión"
    : state;

  const onClick = () => {
    const target = { entity_id: lock.entity_id };
    if (locked) {
      if (!armed) return setArmed(true);
      setArmed(false);
      void callService("lock", "unlock", {}, target);
    } else {
      void callService("lock", "lock", {}, target);
    }
  };

  return (
    <button
      type="button"
      className="card status lock-btn"
      data-state={armed ? "armed" : state}
      disabled={state === "unavailable" || busy}
      onClick={onClick}
      aria-label={`Puerta de entrada: ${label}. ${locked ? "Tocar para abrir" : "Tocar para cerrar"}`}
    >
      <span className="lock-btn__icon">{locked ? <LockIcon /> : <LockOpenIcon />}</span>
      <span className="lock-btn__text">
        <span className="status__title">Puerta de entrada</span>
        <span className="status__line">{label}</span>
      </span>
    </button>
  );
}

/** "a las 17:58" today, "ayer a las 17:58" / "el lunes 12" otherwise. */
function sinceLabel(d: Date, now: Date, prefix = "a las") {
  const day = dayLabel(d, now);
  if (day === "Hoy") return `${prefix} ${time(d)}`;
  return `${day.toLowerCase()} · ${time(d)}`;
}
