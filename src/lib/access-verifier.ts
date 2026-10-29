import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const AUTHORITATIVE_BIRTHDAY_CODE = process.env.BIRTHDAY_ACCESS_CODE || "30102001";
export const AUTHORITATIVE_ETERNALUS_CODE = process.env.ETERNALUS_RECOVERY_CODE || "30102001";

export function cleanPasscode(code: unknown): string {
  if (typeof code !== "string") return "";
  return code.trim();
}

export function verifyTimingSafe(input: string, authoritative: string): boolean {
  if (!input || !authoritative) return false;
  const hashA = createHash("sha256").update(input).digest();
  const hashB = createHash("sha256").update(authoritative).digest();
  return timingSafeEqual(hashA, hashB);
}

export interface ValidationResult {
  ok: boolean;
  status: 200 | 400 | 401 | 429;
  error?: string;
  code?: string;
}

export function validatePasscode(code: unknown, scope: unknown): ValidationResult {
  const clean = cleanPasscode(code);
  if (!clean) {
    return {
      ok: false,
      status: 400,
      error: "Please enter your special date.",
    };
  }

  if (scope !== "birthday" && scope !== "eternalus") {
    return {
      ok: false,
      status: 400,
      error: "Invalid verification scope.",
    };
  }

  const expectedCode = scope === "birthday" ? AUTHORITATIVE_BIRTHDAY_CODE : AUTHORITATIVE_ETERNALUS_CODE;
  const matches = verifyTimingSafe(clean, expectedCode);

  if (matches) {
    return {
      ok: true,
      status: 200,
      code: clean,
    };
  }

  return {
    ok: false,
    status: 401,
    error: "That date is not correct. Try entering your birthday (DDMMYYYY).",
  };
}

function getSessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  const fallbackSource = process.env.SUPABASE_SERVICE_ROLE_KEY || "meerah-birthday-session-authoritative-salt-2026";
  return createHmac("sha256", "session-key-derivation").update(fallbackSource).digest("hex");
}

function signSession(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function issueSessionToken(scope: "birthday" | "eternalus"): string {
  const data = `${scope}.${Date.now() + 12 * 60 * 60 * 1000}`;
  return `${data}.${signSession(data)}`;
}

export function hasScopeToken(token: string | undefined, scope: "birthday" | "eternalus"): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [kind, expiry, sig] = parts;
  const data = `${kind}.${expiry}`;
  const expected = Buffer.from(signSession(data));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  if (Number(expiry) < Date.now()) return false;
  return scope === "birthday" ? kind === "birthday" || kind === "eternalus" : kind === "eternalus";
}
