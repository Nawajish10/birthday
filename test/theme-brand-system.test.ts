import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("Theme Brand System: layout and Experience shell contain data-theme='love'", () => {
  const layoutPath = path.resolve(process.cwd(), "src/app/layout.tsx");
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");
  assert.ok(layoutContent.includes('data-theme="love"'), "layout.tsx must set data-theme='love'");

  const expPath = path.resolve(process.cwd(), "src/components/Experience.tsx");
  const expContent = fs.readFileSync(expPath, "utf-8");
  assert.ok(expContent.includes('data-theme="love"'), "Experience.tsx shell must include data-theme='love'");
});

test("Theme Brand System: styles.css defines canonical Love Theme tokens from design.md", () => {
  const cssPath = path.resolve(process.cwd(), "src/app/styles.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  // Palette tokens
  assert.ok(css.includes("#1A0F1F"), "Deep plum background token present");
  assert.ok(css.includes("#26132B"), "Dark purple surface token present");
  assert.ok(css.includes("#3A1F3B"), "Elevated plum token present");
  assert.ok(css.includes("#F7A8B8"), "Soft pink primary token present");
  assert.ok(css.includes("#F27A98"), "Strong pink primary-strong token present");
  assert.ok(css.includes("#D4A47C"), "Warm gold accent token present");
  assert.ok(css.includes("#F8F1E9"), "Ivory readable text token present");
  assert.ok(css.includes("#C5B3C9"), "Muted text token present");

  // Semantic styles
  assert.ok(css.includes('[data-theme="love"] .content'), "Themed content panel styled");
  assert.ok(css.includes('[data-theme="love"] .tabs'), "Themed tabs navigation styled");
  assert.ok(css.includes('[data-theme="love"] .button'), "Themed primary button styled");
});
