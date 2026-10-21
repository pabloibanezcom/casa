/**
 * House modes live in Home Assistant so automations, voice assistants and
 * schedules can use them too. The app only reads and sets them.
 */
export const HOUSE_MODE_ENTITY = "input_select.modo_casa";
export const GUESTS_ENTITY = "input_boolean.invitados";

export type HouseModeKey = "home" | "evening" | "night" | "away" | "vacation" | "other";

/** Map HA option labels (Spanish, user-editable) to a stable key for icons/behaviour. */
export function houseModeKey(option: string): HouseModeKey {
  const o = option.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (o.includes("casa") || o === "home") return "home";
  if (o.includes("tarde") || o.includes("evening")) return "evening";
  if (o.includes("noche") || o.includes("night")) return "night";
  if (o.includes("vacacion") || o.includes("vacation")) return "vacation";
  if (o.includes("fuera") || o.includes("away")) return "away";
  return "other";
}
