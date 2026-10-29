import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { setScope, clearScope } from "@/lib/session";
import { validatePasscode, AUTHORITATIVE_BIRTHDAY_CODE, AUTHORITATIVE_ETERNALUS_CODE } from "@/lib/access-verifier";
import { randomUUID, createHash } from "node:crypto";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const validation = validatePasscode(body?.code, body?.scope);

  const scope = body?.scope;
  const code = validation.code || (typeof body?.code === "string" ? body.code.trim() : "");

  if (!code || (scope !== "birthday" && scope !== "eternalus")) {
    return NextResponse.json(
      { error: validation.error || "Please enter your special date." },
      { status: validation.status }
    );
  }

  const authoritativeMatch = validation.ok;
  let databaseVerified = false;
  let databaseRateLimited = false;

  try {
    const admin = getAdminClient();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { data, error } = await admin.rpc("verify_access_code", {
      p_scope: scope,
      p_code: code,
      p_ip: ip,
    });

    if (!error && data?.ok) {
      databaseVerified = true;
    } else if (data && data.ok === false) {
      const { data: attempt } = await admin
        .from("access_attempts")
        .select("locked_until")
        .eq("scope", scope)
        .maybeSingle();
      if (attempt?.locked_until && new Date(attempt.locked_until) > new Date()) {
        databaseRateLimited = true;
      }
    }
  } catch {
    // Database connection / PostgREST error - fail-safe to authoritative match
  }

  if (authoritativeMatch || databaseVerified) {
    if (authoritativeMatch && !databaseVerified) {
      try {
        const admin = getAdminClient();
        const expectedCode = scope === "birthday" ? AUTHORITATIVE_BIRTHDAY_CODE : AUTHORITATIVE_ETERNALUS_CODE;
        await admin.rpc("admin_set_access_code", { p_scope: scope, p_code: expectedCode });
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const key = createHash("sha256").update(`${ip}:birthday-experience-v1`).digest("hex");
        await admin.from("access_attempts").delete().eq("bucket_key", key);
      } catch {
        // Non-blocking sync
      }
    }

    await setScope(scope === "eternalus" ? "eternalus" : "birthday");
    const jar = await cookies();
    if (!jar.get("meerah_visitor")) {
      jar.set("meerah_visitor", randomUUID(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 90,
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (databaseRateLimited) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few moments before trying again." },
      { status: 429 }
    );
  }

  return NextResponse.json(
    { error: validation.error || "That date is not correct. Try entering your birthday (DDMMYYYY)." },
    { status: 401 }
  );
}

export async function DELETE() {
  await clearScope();
  return NextResponse.json({ ok: true });
}
