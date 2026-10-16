import type { HassEntities, HassEntity } from "home-assistant-js-websocket";
import type { Registries } from "./registries";

/**
 * Home Connect appliances (washer, dryer, dishwasher…) found through the
 * registries rather than hard-coded entity ids: one entry per device, with
 * the entities that describe its current run.
 */
export interface ApplianceEntities {
  deviceId: string;
  name: string;
  operationState?: string;
  progress?: string;
  finishTime?: string;
  activeProgram?: string;
}

const ROLES: Array<[keyof Omit<ApplianceEntities, "deviceId" | "name">, string, RegExp, RegExp]> = [
  ["operationState", "sensor", /^operation_state$/, /_operation_state$/],
  ["progress", "sensor", /^program_progress$/, /_program_progress$/],
  ["finishTime", "sensor", /finish_time|remaining_program_time/, /_(finish_time|remaining_program_time)$/],
  ["activeProgram", "select", /^active_program$/, /_(active_program|programa_activo)$/],
];

export function findAppliances(reg: Registries): ApplianceEntities[] {
  const byDevice = new Map<string, ApplianceEntities>();
  const names = new Map(reg.devices.map((d) => [d.id, d.name_by_user ?? d.name ?? d.id]));

  for (const e of reg.entities) {
    if (e.platform !== "home_connect" || !e.device_id) continue;
    const domain = e.entity_id.split(".")[0];
    for (const [role, roleDomain, byKey, byId] of ROLES) {
      if (domain !== roleDomain) continue;
      if ((e.translation_key && byKey.test(e.translation_key)) || byId.test(e.entity_id)) {
        const entry = byDevice.get(e.device_id) ?? { deviceId: e.device_id, name: names.get(e.device_id) ?? "" };
        entry[role] ??= e.entity_id;
        byDevice.set(e.device_id, entry);
      }
    }
  }
  return [...byDevice.values()].filter((a) => a.operationState);
}

export type ApplianceStatus =
  | { kind: "running"; progress: number | null; finishesAt: Date | null; program: string | null; paused: boolean }
  | { kind: "finished"; at: Date }
  | { kind: "attention"; label: string }
  | { kind: "idle" };

const ACTIVE = /(run|delayedstart|pause)$/i;

export function applianceStatus(a: ApplianceEntities, states: HassEntities): ApplianceStatus {
  const op = a.operationState ? states[a.operationState] : undefined;
  const state = op?.state.toLowerCase() ?? "";
  if (!op || state === "unavailable") return { kind: "idle" };

  if (ACTIVE.test(state)) {
    const progress = num(a.progress ? states[a.progress] : undefined);
    const finishRaw = a.finishTime ? states[a.finishTime]?.state : undefined;
    const finishesAt = finishRaw && !Number.isNaN(Date.parse(finishRaw)) ? new Date(finishRaw) : null;
    const programKey = a.activeProgram ? states[a.activeProgram]?.state : undefined;
    return {
      kind: "running",
      progress,
      finishesAt,
      program: programKey && !/^(unknown|unavailable)$/.test(programKey) ? programLabel(programKey) : null,
      paused: /pause$/.test(state),
    };
  }
  if (/finished$/.test(state)) return { kind: "finished", at: new Date(op.last_changed) };
  if (/(actionrequired|error)$/.test(state)) return { kind: "attention", label: state.endsWith("error") ? "Error" : "Requiere atención" };
  return { kind: "idle" };
}

function num(e: HassEntity | undefined) {
  const n = e ? Number(e.state) : NaN;
  return Number.isFinite(n) ? n : null;
}

const PROGRAM_WORDS: Record<string, string> = {
  cotton: "Algodón", synthetic: "Sintéticos", mix: "Mixto", delicates: "Delicados", delicate: "Delicados",
  wool: "Lana", eco: "Eco", quick: "Rápido", intensiv: "Intensivo", auto: "Auto", night: "Noche",
  pre: "Pre", rinse: "Aclarado", super: "Súper", towels: "Toallas", shirts: "Camisas", outdoor: "Exterior",
  sensitive: "Sensible", hygiene: "Higiene", spin: "Centrifugado", dry: "Secado", machine: "Máquina", care: "Cuidado",
};

/** "laundry_care_dryer_program_delicates" → "Delicados"; "dishcare_dishwasher_program_eco_50" → "Eco 50°". */
export function programLabel(key: string): string {
  const tail = key.split("_program_").pop() ?? key;
  const words = tail
    .split(/[_.]/)
    .filter(Boolean)
    .map((w) => (/^\d+$/.test(w) ? `${w}°` : PROGRAM_WORDS[w.toLowerCase()] ?? w));
  const label = words.join(" ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}
