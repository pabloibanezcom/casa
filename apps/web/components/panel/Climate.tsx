"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { findClimateSystem, isHeating, PRESET_LABELS, type ClimateZone, type HassEntities } from "@casa/core";
import { useCallService, useEntities, useHA } from "@casa/core/react";
import { degrees } from "@/lib/format";
import { AwayIcon, FlameIcon, LeafIcon, MinusIcon, PlusIcon, PowerIcon } from "./icons";
import { useSetpoint } from "./useSetpoint";

const AUTO_CLOSE_MS = 20_000;
/** Approximate height of an open zone card, to decide which way it grows. */
const EXPANDED_HEIGHT = 250;

export function useClimateSystem() {
  const { session } = useHA();
  return useMemo(() => (session ? findClimateSystem(session.registries) : null), [session]);
}

export function Climate() {
  const { session } = useHA();
  const entities = useEntities();
  const callService = useCallService();
  const system = useClimateSystem();
  const [openId, setOpenId] = useState<string | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const close = useCallback(() => setOpenId(null), []);
  /** Wall panel: an open zone closes itself after a while without touches. */
  const bump = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(close, AUTO_CLOSE_MS);
  }, [close]);

  useEffect(() => {
    if (!openId) return;
    bump();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(idleTimer.current);
    };
  }, [openId, bump, close]);

  const floors = useMemo(() => {
    if (!session || !system) return [];
    const { registries } = session;
    const areas = new Map(registries.areas.map((a) => [a.area_id, a]));
    const floorList = [...registries.floors].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    return [...floorList.map((f) => ({ id: f.floor_id as string | null, name: f.name })), { id: null, name: "Otras" }]
      .map((f) => ({
        ...f,
        zones: system.zones
          .filter((z) => (z.areaId ? areas.get(z.areaId)?.floor_id ?? null : null) === f.id)
          .map((z) => ({ zone: z, name: (z.areaId && areas.get(z.areaId)?.name) || String(entities[z.entityId]?.attributes.friendly_name ?? z.entityId) }))
          .sort((a, b) => a.name.localeCompare(b.name, "es")),
      }))
      .filter((f) => f.zones.length > 0);
    // entities only used for fallback names; recompute when registries change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, system]);

  if (!system || system.zones.length === 0) {
    return <p className="empty">No hay termostatos en Home Assistant.</p>;
  }

  const zoneIds = system.zones.map((z) => z.entityId);
  const heating = system.zones.filter((z) => isHeating(z, entities));
  const boilerOn = system.boilerDemand.some((id) => entities[id]?.state === "on");
  const away = system.away ? entities[system.away] : undefined;
  const awayOn = away?.state === "on";
  const presets = zoneIds.map((id) => entities[id]?.attributes.preset_mode).filter(Boolean);
  const allEco = presets.length > 0 && presets.every((p) => p === "eco");
  const allComfort = presets.length > 0 && presets.every((p) => p === "comfort");
  const supportsPresets = zoneIds.some((id) => (entities[id]?.attributes.preset_modes as string[] | undefined)?.includes("eco"));

  const setAllPresets = (preset: string) =>
    void callService("climate", "set_preset_mode", { preset_mode: preset }, { entity_id: zoneIds });

  return (
    <div className="climate">
      <section className="card climate-summary" aria-label="Resumen de calefacción">
        <div className="climate-summary__text">
          <span className="climate-summary__title">
            {awayOn ? "Modo ausente" : heating.length ? `Calentando ${heating.length} ${heating.length === 1 ? "zona" : "zonas"}` : "En reposo"}
          </span>
          <span className="status__sub">
            {floorAverages(floors, entities)}
            {system.boilerDemand.length > 0 && ` · caldera ${boilerOn ? "en marcha" : "parada"}`}
          </span>
        </div>
        <div className="climate-summary__actions">
          {supportsPresets && (
            <div className="segmented" role="group" aria-label="Modo de todas las zonas">
              <button type="button" aria-pressed={allComfort} onClick={() => setAllPresets("comfort")}>Confort</button>
              <button type="button" aria-pressed={allEco} onClick={() => setAllPresets("eco")}>
                <LeafIcon /> Eco
              </button>
            </div>
          )}
          {away && (
            <button
              type="button"
              className="control"
              aria-pressed={awayOn}
              disabled={away.state === "unavailable"}
              onClick={() => void callService("switch", "toggle", {}, { entity_id: away.entity_id })}
            >
              <AwayIcon /> <span>Ausente</span>
            </button>
          )}
        </div>
      </section>

      {openId && <div className="zone-backdrop" onClick={close} aria-hidden="true" />}
      <div className="climate__floors">
        {floors.map((f) => (
          <section key={f.id ?? "none"} aria-label={f.name}>
            <h2 className="eyebrow climate__floor">{f.name}</h2>
            <div className="zones">
              {f.zones.map(({ zone, name }) => (
                <Zone
                  key={zone.entityId}
                  zone={zone}
                  name={name}
                  entities={entities}
                  open={openId === zone.entityId}
                  onToggle={() => setOpenId((id) => (id === zone.entityId ? null : zone.entityId))}
                  onActivity={bump}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function floorAverages(floors: { name: string; zones: { zone: ClimateZone }[] }[], entities: HassEntities) {
  return floors
    .map((f) => {
      const temps = f.zones.map(({ zone }) => Number(entities[zone.entityId]?.attributes.current_temperature)).filter(Number.isFinite);
      return temps.length ? `${f.name} ${degrees(temps.reduce((a, b) => a + b, 0) / temps.length, 1)}` : null;
    })
    .filter(Boolean)
    .join(" · ");
}

function Zone({
  zone,
  name,
  entities,
  open,
  onToggle,
  onActivity,
}: {
  zone: ClimateZone;
  name: string;
  entities: HassEntities;
  open: boolean;
  onToggle: () => void;
  onActivity: () => void;
}) {
  const entity = entities[zone.entityId]!;
  const callService = useCallService();
  const setpoint = useSetpoint(entity);
  const cardRef = useRef<HTMLElement>(null);
  const [growUp, setGrowUp] = useState(false);

  // Open downwards unless that would run past the bottom of the zones area.
  useLayoutEffect(() => {
    if (!open || !cardRef.current) return setGrowUp(false);
    const card = cardRef.current.getBoundingClientRect();
    const area = cardRef.current.closest(".climate__floors")?.getBoundingClientRect();
    setGrowUp(!!area && card.top + EXPANDED_HEIGHT > area.bottom);
  }, [open]);

  const unavailable = entity.state === "unavailable";
  const off = entity.state === "off";
  const heating = !off && isHeating(zone, entities);
  const current = Number(entity.attributes.current_temperature);
  const preset = entity.attributes.preset_mode as string | undefined;
  const presets = (entity.attributes.preset_modes as string[] | undefined) ?? [];
  const eco = preset === "eco";
  const setback = Number(entity.attributes.eco_setback);
  const demand = Number(entity.attributes.pulse_width_modulation);
  const canTurnOff = ((entity.attributes.hvac_modes as string[] | undefined) ?? []).includes("off");

  const state = unavailable
    ? "Sin conexión"
    : off
      ? "Apagado"
      : heating
        ? Number.isFinite(demand) ? `${demand} %` : "Calentando"
        : preset === "away"
          ? "Ausente"
          : null;

  const classes = [
    "card zone",
    heating && "zone--heating",
    (off || unavailable) && "zone--off",
    open && "zone--open",
    open && growUp && "zone--up",
  ].filter(Boolean).join(" ");

  return (
    <div className="zone-cell">
      <article ref={cardRef} className={classes} onPointerDown={open ? onActivity : undefined}>
        <button type="button" className="zone__summary" aria-expanded={open} onClick={onToggle}>
          <span className="zone__row">
            <span className="zone__name">{name}</span>
            <span className={`zone__state ${unavailable ? "warn" : ""}`}>
              {heating && <FlameIcon size={14} />}
              {eco && !heating && !off && <LeafIcon size={14} />}
              {state}
            </span>
          </span>
          <span className="zone__row zone__row--temps">
            <span className="zone__current display num">{Number.isFinite(current) ? degrees(current, 1) : "—"}</span>
            {!off && setpoint.value != null && (
              <span className={`zone__target num ${setpoint.pending ? "is-pending" : ""}`}>
                <span className="sr-only">Objetivo </span>→ {degrees(setpoint.value, 1)}
              </span>
            )}
          </span>
        </button>

        {open && (
          <div className="zone__controls">
            <div className="zone__setpoint">
              <button type="button" className="round-btn" aria-label={`Bajar objetivo de ${name}`} disabled={off || unavailable || !setpoint.canLower} onClick={setpoint.lower}>
                <MinusIcon />
              </button>
              <span className="zone__setpoint-value">
                <span className="zone__setpoint-label">{eco && Number.isFinite(setback) ? `Objetivo · eco −${setback}°` : "Objetivo"}</span>
                <span className={`display num ${setpoint.pending ? "is-pending" : ""}`}>{setpoint.value != null ? degrees(setpoint.value, 1) : "—"}</span>
              </span>
              <button type="button" className="round-btn" aria-label={`Subir objetivo de ${name}`} disabled={off || unavailable || !setpoint.canRaise} onClick={setpoint.raise}>
                <PlusIcon />
              </button>
            </div>
            <div className="zone__foot">
              {presets.includes("eco") && (
                <button
                  type="button"
                  className="chip"
                  aria-pressed={eco}
                  aria-label={eco ? `Pasar ${name} a confort` : `Pasar ${name} a eco`}
                  disabled={off || unavailable}
                  onClick={() => void callService("climate", "set_preset_mode", { preset_mode: eco ? "comfort" : "eco" }, { entity_id: zone.entityId })}
                >
                  <LeafIcon /> {PRESET_LABELS.eco}
                </button>
              )}
              {canTurnOff && (
                <button
                  type="button"
                  className="chip"
                  disabled={unavailable}
                  onClick={() => void callService("climate", "set_hvac_mode", { hvac_mode: off ? "heat" : "off" }, { entity_id: zone.entityId })}
                >
                  <PowerIcon /> {off ? "Encender" : "Apagar"}
                </button>
              )}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
