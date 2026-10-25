import { NextResponse } from "next/server";
import { getReleaseState } from "@/lib/release";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getReleaseState();
  return NextResponse.json(state, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
