import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "meerah_access";
function secret() { const s = process.env.SESSION_SECRET; if (!s || s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters."); return s; }
function sign(payload: string) { return createHmac("sha256", secret()).update(payload).digest("base64url"); }
export function issueSession(scope: "birthday" | "eternalus") { const data = `${scope}.${Date.now() + 12 * 60 * 60 * 1000}`; return `${data}.${sign(data)}`; }
export function hasScope(token: string | undefined, scope: "birthday" | "eternalus") {
  if (!token) return false;
  const parts = token.split("."); if (parts.length !== 3) return false;
  const [kind, expiry, sig] = parts; const data = `${kind}.${expiry}`;
  const expected = Buffer.from(sign(data)); const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  if (Number(expiry) < Date.now()) return false;
  return scope === "birthday" ? kind === "birthday" || kind === "eternalus" : kind === "eternalus";
}
export async function readScope(scope: "birthday" | "eternalus") { const jar = await cookies(); return hasScope(jar.get(COOKIE)?.value, scope); }
export async function setScope(scope: "birthday" | "eternalus") { const jar = await cookies(); jar.set(COOKIE, issueSession(scope), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 }); }
export async function clearScope() { const jar = await cookies(); jar.delete(COOKIE); }
export { COOKIE };
