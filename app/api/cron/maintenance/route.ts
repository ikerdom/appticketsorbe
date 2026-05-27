import { NextRequest, NextResponse } from "next/server";
import { autoArchiveResolvedTickets } from "@/lib/auto-close";

// Vercel cron: runs daily at 08:00 UTC
// Configured in vercel.json

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const archived = await autoArchiveResolvedTickets();
    return NextResponse.json({ ok: true, archived });
  } catch (err) {
    console.error("Maintenance cron error:", err);
    return NextResponse.json({ error: "Maintenance failed" }, { status: 500 });
  }
}
