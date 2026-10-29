import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

describe("Secret Leak Scanning", () => {
  it("verifies no secret JWT tokens or private keys are committed in source files", () => {
    const rootDir = process.cwd();
    const filesToScan: string[] = [];

    function walk(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.name === ".git" ||
          entry.name === "node_modules" ||
          entry.name === ".next" ||
          entry.name === ".env.local"
        ) {
          continue;
        }
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (
          entry.isFile() &&
          /\.(ts|tsx|js|mjs|json|sql|md|css|html)$/.test(entry.name) &&
          !entry.name.includes("package-lock.json")
        ) {
          filesToScan.push(fullPath);
        }
      }
    }

    walk(rootDir);

    // Regex checking for raw Supabase service role JWTs (eyJhbGci...) or private keys
    const secretJwtPattern = /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_\-]{30,}\.[a-zA-Z0-9_\-]{30,}/;
    const rawPrivateKeyPattern = /-----BEGIN (RSA|EC|PRIVATE) KEY-----/;

    for (const filePath of filesToScan) {
      const content = fs.readFileSync(filePath, "utf-8");
      assert.ok(
        !secretJwtPattern.test(content),
        `Found leaked secret JWT in ${path.relative(rootDir, filePath)}`
      );
      assert.ok(
        !rawPrivateKeyPattern.test(content),
        `Found leaked private key in ${path.relative(rootDir, filePath)}`
      );
    }
  });
});
