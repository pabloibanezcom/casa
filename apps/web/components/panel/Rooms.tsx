"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { domainOf, type HassEntities, type HassEntity } from "@casa/core";
import { useCallService, useEntities, useHA } from "@casa/core/react";
import { degrees } from "@/lib/format";
import { Climate, useClimateSystem } from "./Climate";
import { BlindIcon, BulbIcon, FanIcon, FlameIcon, FloorIcon, GardenIcon, PlugIcon, TempIcon, TvIcon } from "./icons";

const ORDER = ["light", "switch", "cover", "fan", "climate", "media_player"];
/** Integrations whose switches are settings, not room controls. */
const EXCLUDED_PLATFORMS = new Set(["home_connect", "tapo_control", "eufy_security"]);
const TAB_KEY = "casa.panel.floor";
const CLIMATE_TAB = "__climate";

interface RoomModel {
  id: string;
  name: string;
  entityIds: string[];
}

export function Rooms() {
  const { session } = useHA();
  const entities = useEntities();
  const callService = useCallService();

  const floors = useMemo(() => {
    if (!session) return [];
    const { registries, entityAreas } = session;
    const platform = new Map(registries.entities.map((e) => [e.entity_id, e.platform]));

    const byArea = new Map<string, string[]>();
    for (const [entityId, areaId] of entityAreas) {
      if (!ORDER.includes(domainOf(entityId))) continue;
      if (EXCLUDED_PLATFORMS.has(platform.get(entityId) ?? "")) continue;
      byArea.set(areaId, [...(byArea.get(areaId) ?? []), entityId]);
    }

    const floorList = [...registries.floors].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    return [...floorList.map((f) => ({ id: f.floor_id, name: f.name })), { id: "", name: "Otras" }]
      .map((f) => ({
        ...f,
        rooms: registries.areas
          .filter((a) => (a.floor_id ?? "") === f.id && byArea.has(a.area_id))
          .sort((a, b) => a.name.localeCompare(b.name, "es"))
          .map<RoomModel>((a) => ({
            id: a.area_id,
            name: a.name,
            entityIds: byArea.get(a.area_id)!.sort((x, y) => ORDER.indexOf(domainOf(x)) - ORDER.indexOf(domainOf(y)) || x.localeCompare(y)),
          })),
      }))
      .filter((f) => f.rooms.length > 0);
  }, [session]);

  const [selected, setSelected] = useState<string | null>(() => {
    try { return localStorage.getItem(TAB_KEY); } catch { return null; }
  });
  const climate = useClimateSystem();
  const hasClimate = (climate?.zones.length ?? 0) > 0;
  const showClimate = hasClimate && selected === CLIMATE_TAB;
  const floor = floors.find((f) => f.id === selected) ?? floors[0];
  const activeKey = showClimate ? CLIMATE_TAB : floor?.id;
  const tablistRef = useRef<HTMLDivElement>(null);

  // Keep the selected segment in view when the bar scrolls sideways (phones).
  // Scrolls only the bar itself, never the page.
  useEffect(() => {
    const list = tablistRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !active || list.scrollWidth <= list.clientWidth) return;
    const left = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
    list.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [activeKey, floors.length]);

  const select = (id: string) => {
    setSelected(id);
    try { localStorage.setItem(TAB_KEY, id); } catch {}
  };

  const toggle = (e: HassEntity) => {
    const domain = domainOf(e.entity_id);
    const target = { entity_id: e.entity_id };
    if (domain === "cover") return callService("cover", "toggle", {}, target);
    if (domain === "media_player") return callService("media_player", "toggle", {}, target);
    return callService("homeassistant", "toggle", {}, target);
  };

  if (!floor && !hasClimate) return <p className="empty">No hay estancias con dispositivos. Revisa las áreas en Home Assistant.</p>;

  return (
    <>
      <div className="tabs-wrap">
        <div role="tablist" aria-label="Plantas" className="tabs" ref={tablistRef}>
          {floors.map((f, i) => (
            <button key={f.id} role="tab" type="button" className="tab" aria-selected={!showClimate && f.id === floor?.id} onClick={() => select(f.id)}>
              {f.id ? <FloorIcon storey={i} /> : <GardenIcon />}
              <span>{f.name}</span>
            </button>
          ))}
          {hasClimate && (
            <>
              <span className="tabs__divider" aria-hidden="true" />
              <button role="tab" type="button" className="tab" aria-selected={showClimate} onClick={() => select(CLIMATE_TAB)}>
                <FlameIcon size={18} />
                <span>Climatización</span>
              </button>
            </>
          )}
        </div>
      </div>

      {showClimate || !floor ? (
        <Climate />
      ) : (
        <section role="tabpanel" aria-label={`Estancias · ${floor.name}`} className="rooms">
          {floor.rooms.map((room) => (
            <Room key={room.id} room={room} entities={entities} onToggle={(e) => void toggle(e)} />
          ))}
        </section>
      )}
    </>
  );
}

function Room({ room, entities, onToggle }: { room: RoomModel; entities: HassEntities; onToggle: (e: HassEntity) => void }) {
  const list = room.entityIds
    .map((id) => entities[id])
    .filter((e): e is HassEntity => !!e && (domainOf(e.entity_id) !== "media_player" || e.attributes.device_class === "tv"));
  const summary = summarize(list);
  // The thermostat is shown next to the room name instead of as a control.
  const climate = list.find((e) => domainOf(e.entity_id) === "climate");
  const controls = list.filter((e) => domainOf(e.entity_id) !== "climate");

  return (
    <article className="card room">
      <div className="room__head">
        <div className="room__title">
          <h2 className="room__name">{room.name}</h2>
          {climate && <RoomTemp entity={climate} />}
        </div>
        <span className={`room__summary ${summary.tone ? `room__summary--${summary.tone}` : ""}`}>{summary.text}</span>
      </div>
      {controls.length > 0 && (
        <div className="controls">
          {controls.map((e) => (
            <Control key={e.entity_id} entity={e} label={shortName(e, room.name)} onToggle={() => onToggle(e)} />
          ))}
        </div>
      )}
    </article>
  );
}

function RoomTemp({ entity }: { entity: HassEntity }) {
  const current = Number(entity.attributes.current_temperature);
  const target = Number(entity.attributes.temperature);
  const unavailable = entity.state === "unavailable";
  const off = entity.state === "off";
  const heating = !off && entity.attributes.hvac_action === "heating";

  if (unavailable || !Number.isFinite(current)) {
    return (
      <span className="room__temp" aria-label="Temperatura no disponible">
        <TempIcon size={16} /> —
      </span>
    );
  }

  return (
    <span
      className={`room__temp num ${heating ? "room__temp--heating" : ""}`}
      aria-label={`Temperatura ${degrees(current, 1)}${!off && Number.isFinite(target) ? `, objetivo ${degrees(target, 1)}` : ""}${heating ? ", calentando" : ""}`}
    >
      {heating ? <FlameIcon size={14} /> : <TempIcon size={16} />}
      <span className="room__temp-current">{degrees(current, 1)}</span>
      {!off && Number.isFinite(target) && <span className="room__temp-target">→ {degrees(target, 1)}</span>}
      {off && <span className="room__temp-target">apagado</span>}
    </span>
  );
}

function Control({ entity, label, onToggle }: { entity: HassEntity; label: string; onToggle: () => void }) {
  const domain = domainOf(entity.entity_id);
  const unavailable = entity.state === "unavailable";

  if (domain === "climate") {
    const t = Number(entity.attributes.current_temperature);
    return (
      <button type="button" className="control" disabled aria-label={label}>
        <TempIcon />
        <span className="num">{unavailable || !Number.isFinite(t) ? "— °C" : degrees(t, 1)}</span>
      </button>
    );
  }

  const on = ["on", "open", "opening", "playing", "idle"].includes(entity.state);
  const Icon =
    domain === "cover" ? BlindIcon
    : domain === "fan" ? FanIcon
    : domain === "media_player" ? TvIcon
    : entity.attributes.device_class === "outlet" ? PlugIcon
    : BulbIcon;
  const state = stateText(entity, domain, on);
  return (
    <button
      type="button"
      className="control"
      aria-pressed={on}
      disabled={unavailable}
      onClick={onToggle}
      title={entity.attributes.friendly_name}
      aria-label={`${label}: ${state}`}
    >
      <Icon />
      <span className="control__text">
        <span className="control__label">{label}</span>
        {/* Only shown on phones, where controls become tiles. */}
        <span className="control__state" aria-hidden="true">{state}</span>
      </span>
    </button>
  );
}

const pct = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);

/** Short, readable state for the phone tiles: "Encendido · 60 %", "Abierta", "Sin conexión"… */
function stateText(e: HassEntity, domain: string, on: boolean): string {
  if (e.state === "unavailable") return "Sin conexión";

  if (domain === "cover") {
    if (e.state === "opening") return "Abriendo";
    if (e.state === "closing") return "Cerrando";
    const pos = pct(e.attributes.current_position);
    if (pos !== null && pos > 0 && pos < 100) return `Abierta · ${pos} %`;
    return e.state === "open" ? "Abierta" : "Cerrada";
  }

  if (domain === "media_player") return on ? "Encendida" : "Apagada";

  if (!on) return "Apagado";
  if (domain === "light") {
    const b = pct(e.attributes.brightness);
    return b !== null ? `Encendido · ${Math.round((b / 255) * 100)} %` : "Encendido";
  }
  if (domain === "fan") {
    const p = pct(e.attributes.percentage);
    return p !== null ? `Encendido · ${p} %` : "Encendido";
  }
  return "Encendido";
}

function summarize(list: HassEntity[]): { text: string; tone?: "on" | "warn" } {
  const parts: string[] = [];
  let tone: "on" | "warn" | undefined;

  const lightsOn = list.filter((e) => ["light", "switch"].includes(domainOf(e.entity_id)) && e.state === "on").length;
  if (lightsOn) {
    parts.push(`${lightsOn} ${lightsOn === 1 ? "luz encendida" : "luces encendidas"}`);
    tone = "on";
  }

  const covers = list.filter((e) => domainOf(e.entity_id) === "cover" && e.state !== "unavailable");
  if (covers.length === 1) {
    const pos = covers[0]!.attributes.current_position;
    if (typeof pos === "number" && pos > 0) parts.push(`persiana al ${pos} %`);
  } else if (covers.length > 1) {
    const open = covers.filter((c) => c.state === "open").length;
    if (open) parts.push(`${open} persianas abiertas`);
  }

  const offline = list.filter((e) => e.state === "unavailable");
  if (offline.some((e) => domainOf(e.entity_id) === "climate")) {
    parts.push("Termostato sin conexión");
    tone = "warn";
  } else if (offline.length && offline.length === list.length) {
    parts.push("Sin conexión");
    tone = "warn";
  }

  return parts.length ? { text: capitalize(parts.join(" · ")), tone } : { text: "Todo apagado" };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Luz pasillo cocina" in "Cocina" → "Luz pasillo"; never empty. */
function shortName(e: HassEntity, areaName: string) {
  const full = String(e.attributes.friendly_name ?? e.entity_id);
  const words = areaName.toLowerCase().split(/\s+/);
  const kept = full.split(/\s+/).filter((w) => !words.includes(w.toLowerCase()));
  const short = kept.join(" ").trim();
  return short ? capitalize(short) : full;
}
