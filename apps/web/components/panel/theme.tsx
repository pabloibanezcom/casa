"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useEntity } from "@casa/core/react";
import { AutoThemeIcon, MoonIcon, SunIcon } from "./icons";

export type ThemePreference = "auto" | "light" | "dark";
type Theme = "light" | "dark";

const KEY = "casa.panel.theme";
const NEXT: Record<ThemePreference, ThemePreference> = { auto: "light", light: "dark", dark: "auto" };
const LABEL: Record<ThemePreference, string> = { auto: "Tema automático", light: "Tema claro", dark: "Tema oscuro" };

const ThemeContext = createContext<{ theme: Theme; preference: ThemePreference; cycle(): void } | null>(null);

/** Auto follows sun.sun (light while the sun is up); a manual choice is kept per device. */
export function ThemeProvider({ children }: { children: (theme: Theme) => ReactNode }) {
  const sun = useEntity("sun.sun");
  const [preference, setPreference] = useState<ThemePreference>("auto");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark") setPreference(saved);
    } catch {}
  }, []);

  const theme: Theme = preference === "auto" ? (sun?.state === "above_horizon" ? "light" : "dark") : preference;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const cycle = () => {
    const next = NEXT[preference];
    setPreference(next);
    try {
      if (next === "auto") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {}
  };

  return <ThemeContext.Provider value={{ theme, preference, cycle }}>{children(theme)}</ThemeContext.Provider>;
}

export function ThemeButton() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return null;
  const Icon = ctx.preference === "auto" ? AutoThemeIcon : ctx.preference === "light" ? SunIcon : MoonIcon;
  return (
    <button type="button" className="theme-btn" onClick={ctx.cycle} aria-label={`${LABEL[ctx.preference]} (cambiar)`} title={LABEL[ctx.preference]}>
      <Icon />
    </button>
  );
}
