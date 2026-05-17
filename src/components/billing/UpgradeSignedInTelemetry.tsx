"use client";

import { useEffect, useRef } from "react";

/** Fires a single allow-listed client telemetry event for signed-in viewers. */
export function UpgradeSignedInTelemetry() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void fetch("/api/telemetry/client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "upgrade_page_view" }),
      keepalive: true,
    }).catch(() => {
      // Telemetry must never block upgrade UX.
    });
  }, []);
  return null;
}
