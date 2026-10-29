import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { readScope } from "@/lib/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

async function admin() {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data } = await sb.from("admin_users").select("role").eq("user_id", user.id).maybeSingle();
    return data ? user : null;
  } catch {
    return null;
  }
}

interface StoredMessage {
  id: string;
  client_id?: string;
  visitor_id: string;
  sender: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
  persisted?: boolean;
}

// In-memory fallback store to ensure chat continuity in preview/offline/unmigrated schema environments
const fallbackStore: StoredMessage[] =
  (globalThis as unknown as { __chatFallbackStore?: StoredMessage[] }).__chatFallbackStore ?? [];
(globalThis as unknown as { __chatFallbackStore?: StoredMessage[] }).__chatFallbackStore = fallbackStore;

function getFallbackMessages(filter: { visitorId?: string; isInbox?: boolean; since?: string | null; limit?: number }): StoredMessage[] {
  let list = [...fallbackStore];
  if (!filter.isInbox && filter.visitorId) {
    list = list.filter((m) => m.visitor_id === filter.visitorId);
  }
  if (filter.since) {
    list = list.filter((m) => m.created_at > (filter.since as string));
  }
  list.sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (filter.limit) {
    list = list.slice(0, filter.limit);
  }
  return list;
}

function saveFallbackMessage(msg: StoredMessage) {
  const existingIdx = msg.client_id ? fallbackStore.findIndex((m) => m.client_id === msg.client_id) : -1;
  if (existingIdx >= 0) {
    return fallbackStore[existingIdx];
  }
  fallbackStore.push(msg);
  return msg;
}

function getSafeAdminClient() {
  try {
    return getAdminClient();
  } catch {
    return null;
  }
}

interface MessageEnvelope {
  client_id?: string;
  is_encrypted?: boolean;
  iv?: string;
  ciphertext?: string;
  media?: {
    url?: string;
    type?: string;
    name?: string;
    size?: number;
  };
}

function formatMessageRow(row: StoredMessage, overridePersisted?: boolean) {
  if (!row) return row;
  let body = row.body ?? "";
  let is_encrypted = false;
  let iv: string | null = null;
  let media_url: string | null = null;
  let media_type: string | null = null;
  let media_name: string | null = null;
  let media_size: number | null = null;
  let client_id = row.client_id || null;

  if (typeof row.body === "string" && row.body.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(row.body) as MessageEnvelope;
      if (parsed && typeof parsed === "object") {
        if (
          parsed.is_encrypted !== undefined ||
          parsed.ciphertext !== undefined ||
          parsed.media !== undefined ||
          parsed.client_id !== undefined
        ) {
          is_encrypted = Boolean(parsed.is_encrypted);
          iv = parsed.iv || null;
          client_id = parsed.client_id || client_id;
          body = typeof parsed.ciphertext === "string" ? parsed.ciphertext : (row.body ?? "");
          if (parsed.media) {
            media_url = parsed.media.url || null;
            media_type = parsed.media.type || null;
            media_name = parsed.media.name || null;
            media_size = typeof parsed.media.size === "number" ? parsed.media.size : null;
          }
        }
      }
    } catch {
      // Plain text fallback
    }
  }

  const persisted = overridePersisted !== undefined ? overridePersisted : Boolean(row.persisted);

  return {
    id: row.id,
    client_id,
    visitor_id: row.visitor_id,
    sender: row.sender,
    body,
    created_at: row.created_at,
    read_at: row.read_at,
    is_encrypted,
    iv,
    media_url,
    media_type,
    media_name,
    media_size,
    persisted,
    storage_tier: persisted ? "database" : "volatile_fallback",
  };
}

const SELECT_COLUMNS = "id,visitor_id,sender,body,created_at,read_at";

export async function GET(req: NextRequest) {
  const isAdmin = await admin();
  const visitor = (await cookies()).get("meerah_visitor")?.value;
  const db = getSafeAdminClient();

  const since = req.nextUrl.searchParams.get("since");
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam || "100", 10) || 100, 1), 300);

  if (isAdmin && req.nextUrl.searchParams.get("inbox") === "1") {
    if (db) {
      try {
        let query = db
          .from("creator_messages")
          .select(SELECT_COLUMNS)
          .order("created_at", { ascending: true })
          .limit(limit);
        if (since) {
          query = query.gt("created_at", since);
        }
        const { data, error } = await query;
        if (!error && data) {
          const messages = data.map((m: StoredMessage) => formatMessageRow(m, true));
          return NextResponse.json({ messages });
        }
        console.warn("[creator-messages] Supabase error in admin inbox GET, using fallback:", error?.message);
      } catch (err: unknown) {
        console.warn("[creator-messages] Supabase exception in admin inbox GET, using fallback:", err);
      }
    }
    const fallback = getFallbackMessages({ isInbox: true, since, limit });
    return NextResponse.json({ messages: fallback.map((m) => formatMessageRow(m, false)) });
  }

  if (!await readScope("birthday")) {
    return NextResponse.json({ error: "Birthday access required." }, { status: 401 });
  }

  // If the visitor has no cookie yet, they have zero messages.
  if (!visitor) {
    return NextResponse.json({ messages: [] });
  }

  if (db) {
    try {
      let query = db
        .from("creator_messages")
        .select(SELECT_COLUMNS)
        .eq("visitor_id", visitor)
        .order("created_at", { ascending: true })
        .limit(limit);

      if (since) {
        query = query.gt("created_at", since);
      }

      const { data, error } = await query;
      if (!error && data) {
        const messages = data.map((m: StoredMessage) => formatMessageRow(m, true));
        return NextResponse.json({ messages });
      }
      console.warn("[creator-messages] Supabase error in visitor GET, using fallback:", error?.message);
    } catch (err: unknown) {
      console.warn("[creator-messages] Supabase exception in visitor GET, using fallback:", err);
    }
  }

  const fallback = getFallbackMessages({ visitorId: visitor, since, limit });
  return NextResponse.json({ messages: fallback.map((m) => formatMessageRow(m, false)) });
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const db = getSafeAdminClient();
  const isAdmin = await admin();

  const clientId = typeof b.client_id === "string" ? b.client_id : (typeof b.id === "string" ? b.id : undefined);

  // Check deduplication in fallbackStore
  if (clientId) {
    const existing = fallbackStore.find((m) => m.client_id === clientId);
    if (existing) {
      return NextResponse.json({ message: formatMessageRow(existing, false), deduplicated: true }, { status: 200 });
    }
  }

  // Extract common media and encryption fields
  const mediaObj = b.media || {};
  const mediaUrl = b.media_url || mediaObj.url || null;
  const mediaType = b.media_type || mediaObj.type || null;
  const mediaName = b.media_name || mediaObj.name || null;
  const mediaSize = b.media_size ?? mediaObj.size ?? null;
  const iv = typeof b.iv === "string" ? b.iv : null;
  const isEncrypted = Boolean(b.is_encrypted);

  const rawBody = typeof b.body === "string" ? b.body : "";
  const hasMedia = Boolean(mediaUrl);

  // Validation: Either body or media attachment must be provided
  if (!hasMedia && rawBody.trim().length === 0) {
    return NextResponse.json({ error: "Message body or media attachment is required." }, { status: 400 });
  }

  if (rawBody.length > 20000) {
    return NextResponse.json({ error: "Message exceeds 20,000 character limit." }, { status: 400 });
  }

  // Build storage body (JSON envelope if encrypted, media present, or client_id provided)
  let storedBody = rawBody;
  if (isEncrypted || mediaUrl || iv || clientId) {
    const envelope: MessageEnvelope = {
      client_id: clientId,
      is_encrypted: isEncrypted,
      iv: iv || undefined,
      ciphertext: rawBody,
      media: mediaUrl
        ? {
            url: mediaUrl,
            type: mediaType || undefined,
            name: mediaName || undefined,
            size: typeof mediaSize === "number" ? mediaSize : undefined,
          }
        : undefined,
    };
    storedBody = JSON.stringify(envelope);
  }

  // Admin reply flow
  if (isAdmin && b.sender === "creator" && typeof b.visitor_id === "string") {
    const insertPayload = {
      visitor_id: b.visitor_id,
      sender: "creator",
      body: storedBody,
    };

    if (db) {
      try {
        const { data, error } = await db
          .from("creator_messages")
          .insert(insertPayload)
          .select(SELECT_COLUMNS)
          .single();
        if (!error && data) {
          return NextResponse.json({ message: formatMessageRow({ ...data, client_id: clientId }, true) }, { status: 200 });
        }
        console.warn("[creator-messages] Supabase error in admin reply POST, using fallback:", error?.message);
      } catch (err: unknown) {
        console.warn("[creator-messages] Supabase exception in admin reply POST, using fallback:", err);
      }
    }

    const fallbackRecord: StoredMessage = {
      id: randomUUID(),
      client_id: clientId,
      visitor_id: b.visitor_id,
      sender: "creator",
      body: storedBody,
      created_at: new Date().toISOString(),
      read_at: null,
      persisted: false,
    };
    saveFallbackMessage(fallbackRecord);
    return NextResponse.json({ message: formatMessageRow(fallbackRecord, false) }, { status: 202 });
  }

  // Recipient flow
  if (!await readScope("birthday")) {
    return NextResponse.json({ error: "Birthday access required." }, { status: 401 });
  }

  const jar = await cookies();
  let visitor = jar.get("meerah_visitor")?.value;
  if (!visitor) {
    visitor = randomUUID();
    jar.set("meerah_visitor", visitor, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
  }

  const insertPayload = {
    visitor_id: visitor,
    sender: "recipient",
    body: storedBody,
  };

  if (db) {
    try {
      const { data, error } = await db
        .from("creator_messages")
        .insert(insertPayload)
        .select(SELECT_COLUMNS)
        .single();
      if (!error && data) {
        return NextResponse.json({ message: formatMessageRow({ ...data, client_id: clientId }, true) }, { status: 200 });
      }
      console.warn("[creator-messages] Supabase error in recipient POST, using fallback:", error?.message);
    } catch (err: unknown) {
      console.warn("[creator-messages] Supabase exception in recipient POST, using fallback:", err);
    }
  }

  const fallbackRecord: StoredMessage = {
    id: randomUUID(),
    client_id: clientId,
    visitor_id: visitor,
    sender: "recipient",
    body: storedBody,
    created_at: new Date().toISOString(),
    read_at: null,
    persisted: false,
  };
  saveFallbackMessage(fallbackRecord);
  return NextResponse.json({ message: formatMessageRow(fallbackRecord, false) }, { status: 202 });
}
