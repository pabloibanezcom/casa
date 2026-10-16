const LOCALE = "es-ES";

const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long" });
const weekdayFmt = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric" });

export const time = (d: Date) => timeFmt.format(d);
export const longDate = (d: Date) => capitalize(dateFmt.format(d));
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** 21.43 → "21,4°" */
export const degrees = (n: number, decimals = 0) =>
  `${n.toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}°`;

export function duration(ms: number) {
  const mins = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** "Hoy", "Mañana", or "Domingo 18". */
export function dayLabel(d: Date, now = new Date()) {
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  return capitalize(weekdayFmt.format(d));
}
