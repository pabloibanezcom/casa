"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { HassEntity } from "@casa/core";
import { useCallService } from "@casa/core/react";
import { BlindIcon, ChevronDownIcon, ChevronUpIcon, CloseIcon, StopIcon } from "./icons";

// HA cover feature bits.
const SET_POSITION = 4;
const STOP = 8;
const COMMIT_DELAY = 350;
const PRESETS = [0, 25, 50, 75, 100];

const has = (e: HassEntity, bit: number) => (Number(e.attributes.supported_features ?? 0) & bit) !== 0;

/**
 * How open the blind is, 0–100. Falls back to open/closed when it doesn't report a position.
 * Some devices (Tuya curtain switches, for one) report it the wrong way round, so it can be inverted per blind.
 */
export function blindPosition(e: HassEntity, inverted = false): number {
  const p = e.attributes.current_position;
  const raw = typeof p === "number" && Number.isFinite(p) ? Math.max(0, Math.min(100, Math.round(p))) : e.state === "closed" ? 0 : 100;
  return inverted ? 100 - raw : raw;
}

const invertKey = (id: string) => `casa.blind.inverted.${id}`;
function useInverted(entityId: string) {
  const [inverted, setInverted] = useState(false);
  useEffect(() => {
    try { setInverted(localStorage.getItem(invertKey(entityId)) === "1"); } catch { /* storage unavailable */ }
  }, [entityId]);
  const toggle = () => {
    setInverted((v) => {
      try { localStorage.setItem(invertKey(entityId), v ? "0" : "1"); } catch { /* storage unavailable */ }
      return !v;
    });
  };
  return [inverted, toggle] as const;
}

function statusText(e: HassEntity, position: number) {
  if (e.state === "unavailable") return "Sin conexión";
  if (e.state === "opening") return "Abriendo…";
  if (e.state === "closing") return "Cerrando…";
  if (position === 0) return "Cerrada";
  if (position === 100) return "Abierta";
  return `Abierta al ${position} %`;
}

/** The room-card pill for a blind: the fill shows how open it is, tapping opens the full control. */
export function BlindPill({ entity, label }: { entity: HassEntity; label: string }) {
  const [open, setOpen] = useState(false);
  const [inverted, toggleInverted] = useInverted(entity.entity_id);
  const position = blindPosition(entity, inverted);
  const state = statusText(entity, position);
  const unavailable = entity.state === "unavailable";
  const partial = position > 0 && position < 100;

  return (
    <>
      <button
        type="button"
        className="control"
        aria-pressed={position > 0}
        aria-haspopup="dialog"
        disabled={unavailable}
        onClick={() => setOpen(true)}
        title={entity.attributes.friendly_name}
        aria-label={`${label}: ${state}. Abrir control`}
      >
        <span className="control__fill" style={{ width: `${position}%` }} aria-hidden="true" />
        <BlindIcon size={16} />
        <span className="control__text">
          <span className="control__label">{label}</span>
          <span className="control__state" aria-hidden="true">{state}</span>
        </span>
        {partial && <span className="control__value num" aria-hidden="true">{position}%</span>}
      </button>
      {open && <BlindDialog entity={entity} label={label} inverted={inverted} onToggleInverted={toggleInverted} onClose={() => setOpen(false)} />}
    </>
  );
}

function BlindDialog({ entity, label, inverted, onToggleInverted, onClose }: {
  entity: HassEntity; label: string; inverted: boolean; onToggleInverted: () => void; onClose: () => void;
}) {
  const callService = useCallService();
  const ref = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [draft, setDraft] = useState<number | null>(null);

  const target = { entity_id: entity.entity_id };
  const canSet = has(entity, SET_POSITION);
  const canStop = has(entity, STOP);
  const moving = entity.state === "opening" || entity.state === "closing";
  const value = draft ?? blindPosition(entity, inverted);

  useEffect(() => {
    ref.current?.showModal();
    return () => clearTimeout(timer.current);
  }, []);

  // Once the blind stops, go back to what HA reports. The timeout covers blinds that never report a stop.
  useEffect(() => {
    if (draft !== null && !moving) {
      const id = setTimeout(() => setDraft(null), 20_000);
      return () => clearTimeout(id);
    }
  }, [draft, moving]);
  useEffect(() => {
    if (!moving) setDraft(null);
  }, [entity.state]);

  const commit = (v: number) => {
    clearTimeout(timer.current);
    setDraft(v);
    void callService("cover", "set_cover_position", { position: inverted ? 100 - v : v }, target);
  };
  const slide = (v: number) => {
    setDraft(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(v), COMMIT_DELAY);
  };
  const run = (service: "open_cover" | "close_cover" | "stop_cover") => {
    clearTimeout(timer.current);
    setDraft(null);
    void callService("cover", service, {}, target);
  };

  const presetLabel = (p: number) => (p === 0 ? "Cerrada" : p === 100 ? "Abierta" : `${p} %`);

  return (
    <dialog
      ref={ref}
      className="blind"
      aria-label={`Persiana ${label}`}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
    >
      <div className="blind__sheet">
        <header className="blind__head">
          <div>
            <h3 className="blind__title">{label}</h3>
            <p className="blind__status">{statusText(entity, value)}</p>
          </div>
          <button type="button" className="round-btn" aria-label="Cerrar" onClick={() => ref.current?.close()}>
            <CloseIcon />
          </button>
        </header>

        <div className="blind__body">
          <div className="blind__preview" style={{ "--shut": `${100 - value}%` } as CSSProperties} aria-hidden="true">
            <div className="blind__slats" />
          </div>
          <div className="blind__side">
            {canSet ? (
              <>
                <div className="blind__value num" aria-hidden="true">{value} %</div>
                <input
                  className="blind__slider"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={value}
                  onChange={(e) => slide(Number(e.target.value))}
                  aria-label={`Apertura de ${label}`}
                  aria-valuetext={`${value} % abierta`}
                />
                <div className="blind__presets" role="group" aria-label="Posiciones rápidas">
                  {PRESETS.map((p) => (
                    <button key={p} type="button" className="blind__preset" aria-pressed={value === p} onClick={() => commit(p)}>
                      {presetLabel(p)}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="blind__note">Esta persiana no admite posiciones intermedias. Usa Abrir, Parar y Cerrar.</p>
            )}
          </div>
        </div>

        <div className="blind__actions">
          <ActionButton icon={<ChevronUpIcon />} label="Abrir" onClick={() => run("open_cover")} />
          {(canStop || !canSet) && <ActionButton icon={<StopIcon />} label="Parar" onClick={() => run("stop_cover")} />}
          <ActionButton icon={<ChevronDownIcon />} label="Cerrar" onClick={() => run("close_cover")} />
        </div>

        {canSet && (
          <label className="blind__invert">
            <input type="checkbox" checked={inverted} onChange={() => { setDraft(null); onToggleInverted(); }} />
            <span>
              Invertir posición
              <small>Actívalo si la persiana abierta aparece como cerrada.</small>
            </span>
          </label>
        )}
      </div>
    </dialog>
  );
}

function ActionButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" className="blind__action" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
