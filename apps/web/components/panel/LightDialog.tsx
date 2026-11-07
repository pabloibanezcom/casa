"use client";

import { useEffect, useRef, useState } from "react";
import type { HassEntity } from "@casa/core";
import { useCallService } from "@casa/core/react";
import { CloseIcon, PowerIcon } from "./icons";

const COMMIT_DELAY = 300;
const PRESETS = [10, 25, 50, 75, 100];

/** Brightness 0–100 as HA reports it (0 when off). */
const levelOf = (e: HassEntity) => {
  const b = e.attributes.brightness;
  return e.state === "on" && typeof b === "number" ? Math.max(1, Math.round((b / 255) * 100)) : e.state === "on" ? 100 : 0;
};

/** Long-press popup for a dimmable light: big slider, quick levels and on/off. */
export function LightDialog({ entity, label, onClose }: { entity: HassEntity; label: string; onClose: () => void }) {
  const callService = useCallService();
  const ref = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [draft, setDraft] = useState<number | null>(null);
  const target = { entity_id: entity.entity_id };
  const value = draft ?? levelOf(entity);

  useEffect(() => {
    ref.current?.showModal();
    return () => clearTimeout(timer.current);
  }, []);
  // Back to what HA reports once it has caught up.
  useEffect(() => setDraft(null), [entity.state, entity.attributes.brightness]);

  const commit = (v: number) => {
    clearTimeout(timer.current);
    setDraft(v);
    void (v === 0 ? callService("light", "turn_off", {}, target) : callService("light", "turn_on", { brightness_pct: v }, target));
  };
  const slide = (v: number) => {
    setDraft(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(v), COMMIT_DELAY);
  };

  return (
    <dialog
      ref={ref}
      className="blind"
      aria-label={`Luz ${label}`}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
    >
      <div className="blind__sheet">
        <header className="blind__head">
          <div>
            <h3 className="blind__title">{label}</h3>
            <p className="blind__status">{value > 0 ? `Encendida · ${value} %` : "Apagada"}</p>
          </div>
          <button type="button" className="round-btn" aria-label="Cerrar" onClick={() => ref.current?.close()}>
            <CloseIcon />
          </button>
        </header>

        <div className="blind__side">
          <div className="blind__value num" aria-hidden="true">{value} %</div>
          <input
            className="blind__slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={(e) => slide(Number(e.target.value))}
            aria-label={`Brillo de ${label}`}
            aria-valuetext={`${value} %`}
          />
          <div className="blind__presets" role="group" aria-label="Niveles rápidos">
            {PRESETS.map((p) => (
              <button key={p} type="button" className="blind__preset" aria-pressed={value === p} onClick={() => commit(p)}>
                {p} %
              </button>
            ))}
          </div>
        </div>

        <div className="blind__actions">
          <button type="button" className="blind__action" onClick={() => commit(value > 0 ? 0 : 100)}>
            <PowerIcon />
            <span>{value > 0 ? "Apagar" : "Encender"}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
