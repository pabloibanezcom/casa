"use client";

import { useMemo, useState } from "react";
import { domainOf, type HassEntities, type HassEntity } from "@casa/core";
import { useCallService, useEntities, useHA } from "@casa/core/react";
import { degrees } from "@/lib/format";
import { Climate, useClimateSystem } from "./Climate";
import { BlindIcon, BulbIcon, FanIcon, FlameIcon, PlugIcon, TempIcon, TvIcon } from "./icons";

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
      <div role="tablist" aria-label="Plantas" className="tabs">
        {floors.map((f) => (
          <button key={f.id} role="tab" type="button" className="tab" aria-selected={!showClimate && f.id === floor?.id} onClick={() => select(f.id)}>
            {f.name}
          </button>
        ))}
        {hasClimate && (
          <button role="tab" type="button" className="tab tab--climate" aria-selected={showClimate} onClick={() => select(CLIMATE_TAB)}>
            <FlameIcon size={18} /> Climatización
          </button>
        )}
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

  return (
    <article className="card room">
      <div className="room__head">
        <h2 className="room__name">{room.name}</h2>
        <span className={`room__summary ${summary.tone ? `room__summary--${summary.tone}` : ""}`}>{summary.text}</span>
      </div>
      <div className="controls">
        {list.map((e) => (
          <Control key={e.entity_id} entity={e} label={shortName(e, room.name)} onToggle={() => onToggle(e)} />
        ))}
      </div>
    </article>
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
  return (
    <button type="button" className="control" aria-pressed={on} disabled={unavailable} onClick={onToggle} title={entity.attributes.friendly_name}>
      <Icon />
      <span>{label}</span>
    </button>
  );
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
