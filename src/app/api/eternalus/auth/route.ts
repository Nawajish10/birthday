import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { setScope, clearScope, readScope } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const isPasscodeActive = await readScope("eternalus");
  const sb = await getSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (user) {
    const admin = getAdminClient();
    const { data: member } = await admin
      .from("eternalus_members")
      .select("person, display_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (member) {
      await setScope("eternalus");
      return NextResponse.json({
        authenticated: true,
        person: member.person,
        displayName: member.display_name,
        authType: "individual_verified",
      });
    }

    const { data: isAdmin } = await admin
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (isAdmin) {
      await setScope("eternalus");
      return NextResponse.json({
        authenticated: true,
        person: "creator",
        displayName: "Creator (Owner)",
        authType: "individual_verified",
      });
    }
  }

  if (isPasscodeActive) {
    return NextResponse.json({
      authenticated: true,
      person: "guest",
      displayName: "Authorized Partner",
      authType: "recovery_code",
    });
  }

  return NextResponse.json({ authenticated: false });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, password, code } = body;

  // Flow A: Individual Verified Account Sign-in
  if (typeof email === "string" && typeof password === "string") {
    const sb = await getSupabaseServer();
    const { data: authData, error: authError } = await sb.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid credentials. Please verify your email and password." },
        { status: 401 }
      );
    }

    const admin = getAdminClient();
    const [memberRes, adminRes] = await Promise.all([
      admin
        .from("eternalus_members")
        .select("person, display_name")
        .eq("user_id", authData.user.id)
        .maybeSingle(),
      admin.from("admin_users").select("role").eq("user_id", authData.user.id).maybeSingle(),
    ]);

    const isMember = memberRes.data;
    const isOwner = adminRes.data;

    if (!isMember && !isOwner) {
      return NextResponse.json(
        { error: "This verified account is not authorized for the Eternal Us private archive." },
        { status: 403 }
      );
    }

    await setScope("eternalus");
    return NextResponse.json({
      ok: true,
      person: isMember ? isMember.person : "creator",
      displayName: isMember ? isMember.display_name : "Creator",
      authType: "individual_verified",
    });
  }

  // Flow B: Non-destructive Recovery Code Fallback
  if (typeof code === "string") {
    const admin = getAdminClient();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const { data, error } = await admin.rpc("verify_access_code", {
      p_scope: "eternalus",
      p_code: code,
      p_ip: ip,
    });

    if (error || !data?.ok) {
      return NextResponse.json(
        { error: "That recovery code could not be verified." },
        { status: 401 }
      );
    }

    await setScope("eternalus");
    return NextResponse.json({
      ok: true,
      person: "recovery",
      displayName: "Authorized Partner",
      authType: "recovery_code",
    });
  }

  return NextResponse.json(
    { error: "Please provide either your account credentials or the private recovery code." },
    { status: 400 }
  );
}

export async function DELETE() {
  const sb = await getSupabaseServer();
  await sb.auth.signOut().catch(() => {});
  await clearScope();
  return NextResponse.json({ ok: true });
}
