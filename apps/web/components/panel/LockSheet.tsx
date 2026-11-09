"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { domainOf, type HassEntity } from "@casa/core";
import { useCallService, useEntities, useHA } from "@casa/core/react";
import { CloseIcon, LockIcon, LockOpenIcon } from "./icons";

const CONFIRM_MS = 4000;
const LOW_BATTERY = 30;

export interface LockExtras {
  battery: number | null;
  critical: boolean;
  charging: boolean;
  lockNGo?: string;
}

/** The lock's battery and Lock 'n' Go button, found through the lock's device in HA. */
export function useLockExtras(lock: HassEntity): LockExtras {
  const { session } = useHA();
  const entities = useEntities();
  const siblings = useMemo(() => {
    const reg = session?.registries.entities;
    const device = reg?.find((e) => e.entity_id === lock.entity_id)?.device_id;
    if (!reg || !device) return [];
    return reg.filter((e) => e.device_id === device && !e.disabled_by).map((e) => e.entity_id);
  }, [session, lock.entity_id]);

  const find = (domain: string, pred: (e: HassEntity) => boolean) =>
    siblings.map((id) => entities[id]).find((e): e is HassEntity => !!e && domainOf(e.entity_id) === domain && pred(e));

  const level = Number(find("sensor", (e) => e.attributes.device_class === "battery")?.state);
  const lockNGo = find("button", (e) => /lock 'n' go/i.test(String(e.attributes.friendly_name)) && !/unlatch/i.test(String(e.attributes.friendly_name)));
  return {
    battery: Number.isFinite(level) ? Math.round(level) : null,
    critical: find("binary_sensor", (e) => e.attributes.device_class === "battery")?.state === "on",
    charging: find("binary_sensor", (e) => e.attributes.device_class === "battery_charging")?.state === "on",
    lockNGo: lockNGo?.entity_id,
  };
}

export const batteryLow = (x: LockExtras) => x.critical || (x.battery !== null && x.battery <= LOW_BATTERY && !x.charging);

export function lockLabel(state: string, armed = false) {
  return armed ? "Toca para abrir"
    : state === "locked" ? "Cerrada con llave"
    : state === "unlocked" ? "Sin llave"
    : state === "open" ? "Abierta"
    : state === "locking" ? "Cerrando…"
    : state === "unlocking" || state === "opening" ? "Abriendo…"
    : state === "jammed" ? "Atascada"
    : state === "unavailable" ? "Sin conexión"
    : state;
}

/** The front door: lock, unlock, open the latch and Lock 'n' Go. Opening actions need a second tap. */
export function LockSheet({ lock, extras, onClose }: { lock: HassEntity; extras: LockExtras; onClose: () => void }) {
  const callService = useCallService();
  const ref = useRef<HTMLDialogElement>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const locked = lock.state === "locked";
  const busy = ["locking", "unlocking", "opening"].includes(lock.state) || lock.state === "unavailable";
  const target = { entity_id: lock.entity_id };

  useEffect(() => { ref.current?.showModal(); }, []);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(null), CONFIRM_MS);
    return () => clearTimeout(id);
  }, [armed]);

  const done = () => ref.current?.close();
  /** Anything that lets someone in asks for a second tap first. */
  const confirmed = (key: string, run: () => void) => () => {
    if (armed !== key) return setArmed(key);
    run();
    done();
  };

  const battery = extras.battery;
  const batteryText =
    extras.critical ? "Batería crítica"
    : battery !== null ? `Batería ${battery} %${extras.charging ? " · cargando" : ""}`
    : null;

  return (
    <dialog ref={ref} className="blind" aria-label="Puerta" onClose={onClose} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}>
      <div className="blind__sheet">
        <header className="blind__head">
          <div>
            <h3 className="blind__title">Puerta</h3>
            <p className="blind__status">{lockLabel(lock.state)}</p>
          </div>
          <button type="button" className="round-btn" aria-label="Cerrar" onClick={done}><CloseIcon /></button>
        </header>

        {batteryText && (
          <p className={`lock-sheet__battery${batteryLow(extras) ? " warn" : ""}`}>
            {batteryText}{batteryLow(extras) && !extras.critical ? " · conviene cargarla" : ""}
            {battery !== null && <span className="lock-sheet__bar" aria-hidden="true"><span style={{ width: `${battery}%` }} /></span>}
          </p>
        )}

        <div className="lock-sheet__actions">
          {locked ? (
            <Action icon={<LockOpenIcon />} label={armed === "unlock" ? "Toca de nuevo para confirmar" : "Desbloquear"} armed={armed === "unlock"} disabled={busy}
              onClick={confirmed("unlock", () => void callService("lock", "unlock", {}, target))} />
          ) : (
            <Action icon={<LockIcon />} label="Cerrar con llave" disabled={busy}
              onClick={() => { void callService("lock", "lock", {}, target); done(); }} />
          )}
          <Action icon={<DoorIcon />} label={armed === "open" ? "Toca de nuevo para confirmar" : "Abrir puerta"} sub="Desbloquea y suelta el pestillo" armed={armed === "open"} disabled={busy}
            onClick={confirmed("open", () => void callService("lock", "open", {}, target))} />
          {extras.lockNGo && (
            <Action icon={<LockIcon />} label={armed === "lng" ? "Toca de nuevo para confirmar" : "Lock 'n' Go"} sub="Abre y vuelve a cerrar al salir" armed={armed === "lng"} disabled={busy}
              onClick={confirmed("lng", () => void callService("button", "press", {}, { entity_id: extras.lockNGo! }))} />
          )}
        </div>
      </div>
    </dialog>
  );
}

function Action({ icon, label, sub, armed, disabled, onClick }: { icon: ReactNode; label: string; sub?: string; armed?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className="lock-sheet__action" data-armed={armed || undefined} disabled={disabled} onClick={onClick}>
      <span className="lock-sheet__icon">{icon}</span>
      <span className="lock-sheet__text">
        <span className="lock-sheet__label">{label}</span>
        {sub && !armed && <span className="lock-sheet__sub">{sub}</span>}
      </span>
    </button>
  );
}

const DoorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18" /><circle cx="14.5" cy="12.5" r="0.8" fill="currentColor" />
  </svg>
);
