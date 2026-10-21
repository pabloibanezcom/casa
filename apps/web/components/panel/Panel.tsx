"use client";

import { useHA } from "@casa/core/react";
import { Agenda } from "./Agenda";
import { Clock } from "./Clock";
import { HouseMode } from "./HouseMode";
import { NightScreen } from "./NightScreen";
import { Rooms } from "./Rooms";
import { StatusStrip } from "./StatusStrip";
import { ThemeProvider } from "./theme";
import { WeatherCard } from "./WeatherCard";

export function Panel() {
  const { status, error } = useHA();

  return (
    <ThemeProvider>
      {(theme) => (
        <div className="panel" data-theme={theme}>
          <aside className="panel__aside">
            <Clock />
            <HouseMode />
            <WeatherCard />
            <Agenda />
          </aside>
          <main className="panel__main">
            {status === "error" && <p className="warn" style={{ margin: 0 }}>{error ?? "Sin conexión con Home Assistant"}</p>}
            <StatusStrip />
            <Rooms />
          </main>
          <NightScreen />
        </div>
      )}
    </ThemeProvider>
  );
}
