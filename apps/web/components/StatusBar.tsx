"use client";

import { useHA, type HAStatus } from "@casa/core/react";

const LABELS: Record<HAStatus, string> = {
  connecting: "Conectando…",
  connected: "Conectado",
  reconnecting: "Reconectando…",
  error: "Sin conexión",
};

export function StatusBar() {
  const { status, signOut } = useHA();
  return (
    <header className="status-bar">
      <h1>Casa</h1>
      <span className={`status status--${status}`}>{LABELS[status]}</span>
      {status === "connected" && (
        <button className="link" onClick={() => void signOut()}>
          Salir
        </button>
      )}
    </header>
  );
}
