"use client";

import { useHA } from "@casa/core/react";
import { StatusBar } from "@/components/StatusBar";
import { Rooms } from "@/components/Rooms";
import { PendingDevices } from "@/components/PendingDevices";

export default function Home() {
  const { status, error } = useHA();

  return (
    <main className="page">
      <StatusBar />
      {status === "error" && <p className="error">{error ?? "No se pudo conectar con Home Assistant"}</p>}
      {status !== "connecting" && (
        <>
          <Rooms />
          <PendingDevices />
        </>
      )}
    </main>
  );
}
