import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

test("1. All 7 core App Router page files exist", () => {
  const routes = [
    "src/app/page.tsx",
    "src/app/memories/page.tsx",
    "src/app/profile/page.tsx",
    "src/app/music/page.tsx",
    "src/app/study/page.tsx",
    "src/app/games/page.tsx",
    "src/app/chat/page.tsx",
  ];

  for (const route of routes) {
    const fullPath = path.join(ROOT, route);
    assert.ok(fs.existsSync(fullPath), `Route file must exist: ${route}`);
  }
});

test("2. All client wrapper components exist for the new routes", () => {
  const clientFiles = [
    "src/app/memories/MemoriesClient.tsx",
    "src/app/profile/ProfileClient.tsx",
    "src/app/music/MusicClient.tsx",
    "src/app/study/StudyClient.tsx",
    "src/app/games/GamesClient.tsx",
    "src/app/chat/ChatClient.tsx",
    "src/components/shared/RouteShell.tsx",
  ];

  for (const file of clientFiles) {
    const fullPath = path.join(ROOT, file);
    assert.ok(fs.existsSync(fullPath), `Client component file must exist: ${file}`);
  }
});

test("3. BottomNav destinations define correct paths and labels", () => {
  const bottomNavSrc = fs.readFileSync(path.join(ROOT, "src/components/shared/BottomNav.tsx"), "utf8");

  const expectedDestinations = [
    { id: "home", href: "/", label: "Home" },
    { id: "stories", href: "/memories", label: "Memories" },
    { id: "profile", href: "/profile", label: "Profile" },
    { id: "songs", href: "/music", label: "Music" },
    { id: "study", href: "/study", label: "Study" },
    { id: "games", href: "/games", label: "Games" },
    { id: "chat", href: "/chat", label: "Chat" },
  ];

  for (const expected of expectedDestinations) {
    assert.ok(bottomNavSrc.includes(`id: "${expected.id}"`), `Destination id "${expected.id}" must exist in BottomNav.tsx`);
    assert.ok(bottomNavSrc.includes(`href: "${expected.href}"`), `Destination href "${expected.href}" must exist in BottomNav.tsx`);
    assert.ok(bottomNavSrc.includes(`label: "${expected.label}"`), `Destination label "${expected.label}" must exist in BottomNav.tsx`);
  }
});

test("4. BottomNav component uses Next.js Link and usePathname", () => {
  const bottomNavSrc = fs.readFileSync(path.join(ROOT, "src/components/shared/BottomNav.tsx"), "utf8");

  assert.ok(bottomNavSrc.includes('import Link from "next/link";'), "Must import Link from next/link");
  assert.ok(bottomNavSrc.includes('import { usePathname } from "next/navigation";'), "Must import usePathname from next/navigation");
  assert.ok(bottomNavSrc.includes("usePathname()"), "Must call usePathname()");
  assert.ok(bottomNavSrc.includes("<Link"), "Must render <Link> elements");
});

test("5. Dedicated route page files verify birthday access scope", () => {
  const serverPages = [
    "src/app/page.tsx",
    "src/app/memories/page.tsx",
    "src/app/profile/page.tsx",
    "src/app/music/page.tsx",
    "src/app/study/page.tsx",
    "src/app/games/page.tsx",
    "src/app/chat/page.tsx",
  ];

  for (const page of serverPages) {
    const content = fs.readFileSync(path.join(ROOT, page), "utf8");
    assert.ok(
      content.includes('readScope("birthday")'),
      `${page} must verify birthday access scope via readScope("birthday")`
    );
  }
});

test("6. RouteShell handles PasscodeGate and Love Theme Shell", () => {
  const shellSrc = fs.readFileSync(path.join(ROOT, "src/components/shared/RouteShell.tsx"), "utf8");

  assert.ok(shellSrc.includes("PasscodeGate"), "RouteShell must import and render PasscodeGate");
  assert.ok(shellSrc.includes('data-theme="love"'), "RouteShell must enforce data-theme='love'");
  assert.ok(shellSrc.includes("BottomNav"), "RouteShell must render BottomNav");
  assert.ok(shellSrc.includes("shell-content-with-bottom-nav"), "RouteShell must have clearance padding class");
});
