import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  validatePasscode,
  verifyTimingSafe,
  cleanPasscode,
  issueSessionToken,
  hasScopeToken,
  AUTHORITATIVE_BIRTHDAY_CODE,
} from "../src/lib/access-verifier.ts";

describe("Passcode Verification Engine & Logic Tests", () => {
  it("authoritative birthday code is configured as 30102001", () => {
    assert.equal(AUTHORITATIVE_BIRTHDAY_CODE, "30102001");
  });

  it("authenticates the correct passcode 30102001 successfully", () => {
    const result = validatePasscode("30102001", "birthday");
    assert.equal(result.ok, true);
    assert.equal(result.status, 200);
    assert.equal(result.code, "30102001");
  });

  it("handles and trims whitespace around passcode (e.g. '  30102001  ')", () => {
    const result = validatePasscode("  30102001  ", "birthday");
    assert.equal(result.ok, true);
    assert.equal(result.status, 200);
    assert.equal(result.code, "30102001");
  });

  it("rejects an incorrect passcode with HTTP 401 and friendly message", () => {
    const result = validatePasscode("01012000", "birthday");
    assert.equal(result.ok, false);
    assert.equal(result.status, 401);
    assert.match(result.error ?? "", /not correct/i);
  });

  it("rejects empty passcode with HTTP 400", () => {
    const result = validatePasscode("", "birthday");
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
    assert.match(result.error ?? "", /enter your special date/i);
  });

  it("rejects non-string passcode with HTTP 400", () => {
    const result = validatePasscode(null, "birthday");
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
  });

  it("rejects an invalid scope with HTTP 400", () => {
    const result = validatePasscode("30102001", "unknown_scope");
    assert.equal(result.ok, false);
    assert.equal(result.status, 400);
    assert.match(result.error ?? "", /Invalid verification scope/i);
  });

  it("performs constant-time timing-safe string comparison", () => {
    assert.equal(verifyTimingSafe("30102001", "30102001"), true);
    assert.equal(verifyTimingSafe("30102001", "30102002"), false);
    assert.equal(verifyTimingSafe("", "30102001"), false);
    assert.equal(verifyTimingSafe("30102001", ""), false);
  });

  it("cleans and sanitizes passcode input", () => {
    assert.equal(cleanPasscode("  30102001\n"), "30102001");
    assert.equal(cleanPasscode(12345), "");
    assert.equal(cleanPasscode(undefined), "");
  });

  it("verifies session token generation and verification logic", () => {
    const token = issueSessionToken("birthday");
    assert.ok(token);
    assert.equal(hasScopeToken(token, "birthday"), true);
    assert.equal(hasScopeToken(token, "eternalus"), false);

    const eternalusToken = issueSessionToken("eternalus");
    assert.equal(hasScopeToken(eternalusToken, "birthday"), true);
    assert.equal(hasScopeToken(eternalusToken, "eternalus"), true);
  });

  it("rejects tampered session tokens", () => {
    const token = issueSessionToken("birthday");
    const tampered = token.slice(0, -4) + "XXXX";
    assert.equal(hasScopeToken(tampered, "birthday"), false);
  });

  it("verifies route.ts implements dual-tier verification and security guardrails", () => {
    const routeSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/api/access/route.ts"),
      "utf-8"
    );
    assert.ok(routeSrc.includes("validatePasscode"), "Route must call validatePasscode");
    assert.ok(routeSrc.includes("verify_access_code"), "Route must support database RPC verify_access_code");
    assert.ok(routeSrc.includes("setScope"), "Route must issue session via setScope");
    assert.ok(!routeSrc.includes("console.log(code)"), "Route must never log raw code");
  });
});
