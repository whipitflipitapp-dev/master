import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const BATCH = 400;
const MAX_ROWS = 20000;

function csvCell(raw: string): string {
  if (/[\r\n",]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function formatMetadata(meta: Json): string {
  try {
    return JSON.stringify(meta ?? {});
  } catch {
    return "";
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sinceRaw = request.nextUrl.searchParams.get("since");
  let sinceIso: string;
  if (sinceRaw) {
    const d = new Date(sinceRaw);
    if (!Number.isFinite(d.getTime())) {
      return NextResponse.json({ error: "Invalid since" }, { status: 400 });
    }
    sinceIso = d.toISOString();
  } else {
    sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode("id,user_id,event_type,metadata,created_at\n"),
      );

      let offset = 0;
      let total = 0;

      try {
        while (total < MAX_ROWS) {
          const end = offset + BATCH - 1;
          const { data: rows, error } = await supabase
            .from("events")
            .select("id,user_id,event_type,metadata,created_at")
            .gte("created_at", sinceIso)
            .order("created_at", { ascending: false })
            .range(offset, end);

          if (error || !rows?.length) {
            break;
          }

          let chunk = "";
          for (const row of rows) {
            chunk += [
              csvCell(row.id),
              csvCell(row.user_id ?? ""),
              csvCell(row.event_type),
              csvCell(formatMetadata(row.metadata)),
              csvCell(row.created_at),
            ].join(",");
            chunk += "\n";
            total++;
            if (total >= MAX_ROWS) {
              break;
            }
          }
          controller.enqueue(encoder.encode(chunk));

          if (rows.length < BATCH || total >= MAX_ROWS) {
            break;
          }
          offset += BATCH;
        }
      } finally {
        controller.close();
      }
    },
  });

  const filenameSafe = sinceIso.slice(0, 10);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="events-${filenameSafe}.csv"`,
    },
  });
}
