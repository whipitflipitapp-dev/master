"use client";

import { useEffect, useRef } from "react";

import { trackClientEvent } from "@/app/actions/telemetry";

/** Fires a single allow-listed client → server telemetry event for signed-in viewers. */
export function UpgradeSignedInTelemetry() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void trackClientEvent("upgrade_page_view");
  }, []);
  return null;
}
