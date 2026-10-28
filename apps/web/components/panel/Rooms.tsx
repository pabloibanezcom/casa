"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { domainOf, type HassEntities, type HassEntity } from "@casa/core";
import { useCallService, useEntities, useHA } from "@casa/core/react";
import { degrees } from "@/lib/format";
import { BlindPill } from "./Blind";
import { CameraDialog, Cameras, isSd, useCameras } from "./Cameras";
import { Climate, useClimateSystem } from "./Climate";
import { Music, useMusicAssistant } from "./Music";
import { BlindIcon, BulbIcon, CameraIcon, FanIcon, DownlightIcon, FlameIcon, PendantIcon, LedStripIcon, FloorIcon, GardenIcon, MusicIcon, PlugIcon, TempIcon, ThermostatIcon, TvIcon } from "./icons";

const ORDER = ["light", "switch", "cover", "fan", "climate", "media_player"];
/** Integrations whose switches are settings, not room controls. */
const EXCLUDED_PLATFORMS = new Set(["home_connect", "tapo_control", "eufy_security"]);
const TAB_KEY = "casa.panel.floor";
const CLIMATE_TAB = "__climate";
const MUSIC_TAB = "__music";
const CAMERAS_TAB = "__cameras";

const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
/** Rooms to list first, in this order, e.g. NEXT_PUBLIC_ROOM_ORDER="Salón,Pasillo bajo". The rest follow alphabetically. */
const ROOM_ORDER = (process.env.NEXT_PUBLIC_ROOM_ORDER ?? "").split(",").map(norm).filter(Boolean);
const roomRank = (name: string) => {
  const i = ROOM_ORDER.indexOf(norm(name));
  return i === -1 ? ROOM_ORDER.length : i;
};

interface RoomModel {
  id: string;
  name: string;
  entityIds: string[];
  /** Cameras assigned to this area in HA (the HD/SD split is applied when rendering). */
  cameraIds: string[];
}

/** The floor icon is set in HA; outdoor-looking ones (tree, flower, garden…) get the garden glyph. */
const isOutdoorIcon = (icon?: string | null) => /^mdi:(tree|pine-tree|palm-tree|flower|flower-tulip|sprout|leaf|grass|fence|garden|home-group|terrain)/.test(icon ?? "");

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

    const camerasByArea = new Map<string, string[]>();
    for (const [entityId, areaId] of entityAreas) {
      if (domainOf(entityId) !== "camera") continue;
      camerasByArea.set(areaId, [...(camerasByArea.get(areaId) ?? []), entityId]);
    }

    const floorList = [...registries.floors].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    return [...floorList.map((f) => ({ id: f.floor_id, name: f.name, icon: f.icon ?? null })), { id: "", name: "Otras", icon: "mdi:fence" }]
      .map((f) => ({
        ...f,
        rooms: registries.areas
          .filter((a) => (a.floor_id ?? "") === f.id && byArea.has(a.area_id))
          .sort((a, b) => roomRank(a.name) - roomRank(b.name) || a.name.localeCompare(b.name, "es"))
          .map<RoomModel>((a) => ({
            id: a.area_id,
            name: a.name,
            entityIds: byArea.get(a.area_id)!.sort((x, y) => ORDER.indexOf(domainOf(x)) - ORDER.indexOf(domainOf(y)) || x.localeCompare(y)),
            cameraIds: camerasByArea.get(a.area_id) ?? [],
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
  const music = useMusicAssistant();
  const hasMusic = !!music;
  const showMusic = hasMusic && selected === MUSIC_TAB;
  const hasCameras = useCameras().length > 0;
  const showCameras = hasCameras && selected === CAMERAS_TAB;
  const floor = floors.find((f) => f.id === selected) ?? floors[0];
  const activeKey = showCameras ? CAMERAS_TAB : showMusic ? MUSIC_TAB : showClimate ? CLIMATE_TAB : floor?.id;
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

  // Sliding indicator under the active segment. Measured from the DOM so it
  // follows segment widths, wrapping and resizes; no transition on first paint.
  const [indicator, setIndicator] = useState<{ left: number; width: number; ready: boolean } | null>(null);
  useLayoutEffect(() => {
    const list = tablistRef.current;
    if (!list) return;
    const measure = () => {
      const active = list.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (!active) return setIndicator(null);
      setIndicator((prev) => ({ left: active.offsetLeft, width: active.offsetWidth, ready: prev !== null }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [activeKey, floors.length]);

  // The wide layout starts the tab content right under the tabs, whatever the
  // height of the modes box beside them, so publish the tabs' height.
  const wrapRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const panel = wrap?.closest<HTMLElement>(".panel");
    if (!wrap || !panel) return;
    const publish = () => panel.style.setProperty("--tabs-h", `${wrap.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(wrap);
    return () => ro.disconnect();
  });

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

  if (!floor && !hasClimate && !hasMusic && !hasCameras) return <p className="empty">No hay estancias con dispositivos. Revisa las áreas en Home Assistant.</p>;

  return (
    <>
      <div className="tabs-wrap" ref={wrapRef}>
        <div role="tablist" aria-label="Plantas" className="tabs" ref={tablistRef}>
          {indicator && (
            <span
              className={`tabs__indicator ${indicator.ready ? "tabs__indicator--animate" : ""}`}
              style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
              aria-hidden="true"
            />
          )}
          {floors.map((f, i) => (
            <button key={f.id} role="tab" type="button" className="tab" aria-selected={!showClimate && !showMusic && !showCameras && f.id === floor?.id} onClick={() => select(f.id)}>
              {isOutdoorIcon(f.icon) ? <GardenIcon /> : <FloorIcon storey={i} />}
              <span>{f.name}</span>
            </button>
          ))}
          {hasClimate && (
            <>
              <span className="tabs__divider" aria-hidden="true" />
              <button role="tab" type="button" className="tab tab--icon" aria-label="Climatización" title="Climatización" aria-selected={showClimate} onClick={() => select(CLIMATE_TAB)}>
                <ThermostatIcon size={22} />
                <span className="tab__label">Climatización</span>
              </button>
            </>
          )}
          {hasMusic && (
            <>
              {!hasClimate && <span className="tabs__divider" aria-hidden="true" />}
              <button role="tab" type="button" className="tab tab--icon" aria-label="Música" title="Música" aria-selected={showMusic} onClick={() => select(MUSIC_TAB)}>
                <MusicIcon />
                <span className="tab__label">Música</span>
              </button>
            </>
          )}
          {hasCameras && (
            <>
              {!hasClimate && !hasMusic && <span className="tabs__divider" aria-hidden="true" />}
              <button role="tab" type="button" className="tab tab--icon" aria-label="Cámaras" title="Cámaras" aria-selected={showCameras} onClick={() => select(CAMERAS_TAB)}>
                <CameraIcon size={20} />
                <span className="tab__label">Cámaras</span>
              </button>
            </>
          )}
        </div>
      </div>

      {showCameras ? (
        <Cameras key="cameras" />
      ) : showMusic ? (
        <Music key="music" />
      ) : showClimate || !floor ? (
        <Climate key="climate" />
      ) : (
        <section key={floor.id} role="tabpanel" aria-label={`Estancias · ${floor.name}`} className="rooms">
          <div className="rooms__cols">
            {floor.rooms.map((room) => (
              <Room key={room.id} room={room} entities={entities} onToggle={(e) => void toggle(e)} />
            ))}
          </div>
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
  const controls = list.filter((e) => !["climate", "cover"].includes(domainOf(e.entity_id)));
  const blinds = list.filter((e) => domainOf(e.entity_id) === "cover");
  const camera = room.cameraIds.map((id) => entities[id]).find((e): e is HassEntity => !!e && !isSd(e) && e.state !== "unavailable");
  const [viewing, setViewing] = useState(false);

  return (
    <article className="card room">
      <div className="room__head">
        <div className="room__title">
          <h2 className="room__name">{room.name}</h2>
          {camera && (
            <button type="button" className="room__cam" aria-label={`Ver cámara de ${room.name}`} onClick={() => setViewing(true)}>
              <CameraIcon size={18} />
            </button>
          )}
          {climate && <RoomTemp entity={climate} />}
        </div>
        {camera && viewing && <CameraDialog camera={camera} onClose={() => setViewing(false)} />}
        {/* Only problems get a line; on/off is already visible on the buttons. */}
        {summary.tone === "warn" && <span className="room__summary room__summary--warn">{summary.text}</span>}
      </div>
      {controls.length > 0 && (
        <div className="controls">
          {controls.map((e) => (
            <Control key={e.entity_id} entity={e} label={shortName(e, room.name)} onToggle={() => onToggle(e)} />
          ))}
        </div>
      )}
      {blinds.length > 0 && (
        <div className="controls controls--blinds">
          {blinds.map((e) => (
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
    : /^mdi:led/.test(String(entity.attributes.icon ?? "")) ? LedStripIcon // set per entity in HA
    : /^mdi:(light-recessed|ceiling-light(?!-multiple)|lightbulb-spot)/.test(String(entity.attributes.icon ?? "")) ? DownlightIcon
    : /^mdi:(chandelier|lamp|ceiling-light-multiple|vanity-light)/.test(String(entity.attributes.icon ?? "")) ? PendantIcon
    : BulbIcon;
  const state = stateText(entity, domain, on);
  if (domain === "cover") return <BlindPill entity={entity} label={label} />;
  return (
    <LevelPill
      entity={entity}
      domain={domain}
      on={on}
      label={label}
      state={state}
      icon={<Icon />}
      disabled={unavailable}
      onToggle={onToggle}
    />
  );
}

/** Brightness 0–100 for a light that can dim, or null for on/off-only lights. */
function brightnessPct(e: HassEntity): number | null {
  const modes = e.attributes.supported_color_modes as string[] | undefined;
  if (!modes || modes.every((m) => m === "onoff")) return null;
  const b = pct(e.attributes.brightness);
  return e.state === "on" && b !== null ? Math.max(1, Math.round((b / 255) * 100)) : 0;
}

const DRAG_THRESHOLD = 6;

/**
 * A pill whose green fill shows how "on" something is. Tap toggles; on dimmable lights,
 * dragging sideways sets the brightness (release near the left edge to switch off).
 */
function LevelPill({ entity, domain, on, label, state, icon, disabled, onToggle }: {
  entity: HassEntity; domain: string; on: boolean; label: string; state: string;
  icon: ReactNode; disabled: boolean; onToggle: () => void;
}) {
  const callService = useCallService();
  const dimmable = domain === "light" ? brightnessPct(entity) : null;
  const [drag, setDrag] = useState<number | null>(null);
  const [pending, setPending] = useState<number | null>(null);
  const start = useRef<{ x: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);

  // Drop the optimistic value as soon as HA reports the new state.
  useEffect(() => setPending(null), [entity.state, entity.attributes.brightness]);

  const level =
    drag ?? pending ?? (dimmable !== null ? dimmable
      : domain === "cover" && on ? pct(entity.attributes.current_position) ?? 100
      : on ? 100 : 0);
  const lit = level > 0;

  const fromPointer = (el: HTMLElement, x: number) => {
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(100, Math.round(((x - r.left) / r.width) * 100)));
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled || dimmable === null) return;
    start.current = { x: e.clientX, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    if (!s) return;
    if (!s.moved && Math.abs(e.clientX - s.x) < DRAG_THRESHOLD) return;
    if (!s.moved) {
      s.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDrag(fromPointer(e.currentTarget, e.clientX));
  };
  const onPointerEnd = () => {
    const s = start.current;
    start.current = null;
    if (!s?.moved || drag === null) return;
    justDragged.current = true;
    const value = drag < 3 ? 0 : drag;
    setDrag(null);
    setPending(value);
    const target = { entity_id: entity.entity_id };
    void (value === 0
      ? callService("light", "turn_off", {}, target)
      : callService("light", "turn_on", { brightness_pct: value }, target));
  };
  const onClick = () => {
    // A drag ends with a click event too; only plain taps toggle.
    if (justDragged.current) {
      justDragged.current = false;
      return;
    }
    onToggle();
  };

  return (
    <button
      type="button"
      className={`control${drag !== null ? " control--dragging" : ""}`}
      aria-pressed={lit}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={() => { start.current = null; setDrag(null); }}
      title={entity.attributes.friendly_name}
      aria-label={`${label}: ${state}`}
      data-dimmable={dimmable !== null || undefined}
    >
      <span className="control__fill" style={{ width: `${level}%` }} aria-hidden="true" />
      {icon}
      <span className="control__text">
        <span className="control__label">{label}</span>
        {/* Only shown on phones, where controls become tiles. */}
        <span className="control__state" aria-hidden="true">{drag !== null ? `${drag} %` : state}</span>
      </span>
      {dimmable !== null && lit && <span className="control__value num" aria-hidden="true">{level}%</span>}
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

  return parts.length ? { text: capitalize(parts.join(" · ")), tone } : { text: "Todo apagado" };
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Luz pasillo cocina" in "Cocina" → "Luz pasillo"; never empty. */
function shortName(e: HassEntity, areaName: string) {
  const full = String(e.attributes.friendly_name ?? e.entity_id);
  const words = areaName.toLowerCase().split(/\s+/);
  const kept = full.split(/\s+/).filter((w) => !words.includes(w.toLowerCase()));
  // The icon already says it's a light or a switch, so "Luz escalera B" reads as "Escalera B".
  if (kept.length > 1 && /^(luz|luces|interruptor)$/i.test(kept[0]!)) kept.shift();
  const short = kept.join(" ").trim();
  // A room's only light is just "Luz" once the room name is gone: call it the main one.
  if (/^luz(es)?$/i.test(short)) return "Principal";
  return short ? capitalize(short) : full;
}
