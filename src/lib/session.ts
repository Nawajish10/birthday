import { cookies } from "next/headers";
import { issueSessionToken, hasScopeToken } from "@/lib/access-verifier";

const COOKIE = "meerah_access";

export function issueSession(scope: "birthday" | "eternalus") {
  return issueSessionToken(scope);
}

export function hasScope(token: string | undefined, scope: "birthday" | "eternalus") {
  return hasScopeToken(token, scope);
}

export async function readScope(scope: "birthday" | "eternalus") {
  const jar = await cookies();
  return hasScope(jar.get(COOKIE)?.value, scope);
}

export async function setScope(scope: "birthday" | "eternalus") {
  const jar = await cookies();
  jar.set(COOKIE, issueSession(scope), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearScope() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export { COOKIE };
