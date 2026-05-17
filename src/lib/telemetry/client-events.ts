import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/telemetry";

/**
 * Narrow allow-list of events that may be queued from trusted client UX.
 * All other strings are rejected server-side.
 */
export const CLIENT_TELEMETRY_EVENT_NAMES = ["upgrade_page_view"] as const;
export type ClientTelemetryEventName =
  (typeof CLIENT_TELEMETRY_EVENT_NAMES)[number];

export function isClientTelemetryEventName(
  value: unknown,
): value is ClientTelemetryEventName {
  return (
    typeof value === "string" &&
    (CLIENT_TELEMETRY_EVENT_NAMES as readonly string[]).includes(value)
  );
}

/** Record an allow-listed client telemetry event for the signed-in user. */
export async function recordClientTelemetryEvent(rawName: string): Promise<void> {
  if (!isClientTelemetryEventName(rawName)) {
    return;
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  await logEvent(supabase, {
    type: rawName,
    metadata: {},
  });
}
