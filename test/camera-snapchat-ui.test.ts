import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CAMERA_FILTERS } from "../src/components/camera/camera-pipeline.ts";

test("Snapchat Camera UI: Filter collection has full coverage", () => {
  assert.ok(CAMERA_FILTERS.length >= 7, "Must define at least 7 camera filters");
  const filterIds = CAMERA_FILTERS.map((f) => f.id);
  assert.ok(filterIds.includes("natural"), "Must include natural filter");
  assert.ok(filterIds.includes("warm-sun"), "Must include warm-sun filter");
  assert.ok(filterIds.includes("soft-rose"), "Must include soft-rose filter");
  assert.ok(filterIds.includes("vintage-film"), "Must include vintage-film filter");
  assert.ok(filterIds.includes("cinematic-plum"), "Must include cinematic-plum filter");
  assert.ok(filterIds.includes("golden-hour"), "Must include golden-hour filter");
  assert.ok(filterIds.includes("bw"), "Must include bw (B&W) filter");

  // Verify CSS filter strings
  for (const filter of CAMERA_FILTERS) {
    assert.ok(typeof filter.name === "string" && filter.name.length > 0);
    assert.ok(typeof filter.icon === "string" && filter.icon.length > 0);
    assert.ok(typeof filter.cssFilter === "string");
  }
});

test("Snapchat Camera UI: MemoriesPanel defaults to camera active view and supports tab switching", () => {
  const panelPath = path.resolve(process.cwd(), "src/components/memories/MemoriesPanel.tsx");
  const content = fs.readFileSync(panelPath, "utf-8");

  assert.ok(
    content.includes('useState<MemoriesTab>("camera")'),
    "MemoriesPanel must initialize activeTab with 'camera' as default"
  );
  assert.ok(
    content.includes('activeTab === "camera"'),
    "MemoriesPanel must render camera section when activeTab === 'camera'"
  );
  assert.ok(
    content.includes("onOpenGallery"),
    "CameraPanel must support onOpenGallery shortcut callback"
  );

  // Verify tab navigation coverage: camera, photos, on-this-day, albums, stories
  assert.ok(content.includes('setActiveTab("camera")'), "Must support switching to camera tab");
  assert.ok(content.includes('setActiveTab("photos")'), "Must support switching to photos tab");
  assert.ok(content.includes('setActiveTab("on-this-day")'), "Must support switching to on-this-day tab");
  assert.ok(content.includes('setActiveTab("albums")'), "Must support switching to albums tab");
  assert.ok(content.includes('setActiveTab("stories")'), "Must support switching to stories tab");
});

test("Snapchat Camera UI: CameraPanel includes filter carousel, flash toggle, and notifications", () => {
  const cameraPath = path.resolve(process.cwd(), "src/components/camera/CameraPanel.tsx");
  const content = fs.readFileSync(cameraPath, "utf-8");

  assert.ok(content.includes("toggleFlash"), "Must implement toggleFlash");
  assert.ok(content.includes("selectedFilter"), "Must maintain selectedFilter state");
  assert.ok(content.includes("cameraFilterCarousel"), "Must render filter carousel in JSX");
  assert.ok(content.includes("cameraNotifDropdown"), "Must render notifications dropdown");
  assert.ok(content.includes("cameraGalleryShortcut"), "Must render gallery shortcut button");
  assert.ok(content.includes("toggleFacingMode"), "Must implement toggleFacingMode (flip front/rear)");
  assert.ok(content.includes("cameraTopFloatingBar"), "Must render top floating bar");
  assert.ok(content.includes("cameraPulseRing"), "Must render Love Theme pulse ring");
  assert.ok(content.includes("cameraShutterBtn"), "Must render prominent shutter button");
});

test("Snapchat Camera UI: Canvas snapshot bakes CSS filter styling into export", () => {
  const cameraPath = path.resolve(process.cwd(), "src/components/camera/CameraPanel.tsx");
  const content = fs.readFileSync(cameraPath, "utf-8");

  assert.ok(
    content.includes("ctx.filter = selectedFilter.cssFilter"),
    "Canvas 2D context must set ctx.filter to bake selected CSS filter into image export"
  );
  assert.ok(
    content.includes("canvas.toDataURL"),
    "Canvas snapshot must export dataURL for persistence"
  );
});

test("Snapchat Camera UI: CSS enforces 72px shutter button, pulse ring, and 80-90vh mobile viewfinder", () => {
  const cssPath = path.resolve(process.cwd(), "src/components/camera/camera.css");
  const css = fs.readFileSync(cssPath, "utf-8");

  // Viewfinder 80-90vh / immersive viewport
  assert.ok(
    css.includes("84vh") || css.includes("85vh") || css.includes("80vh"),
    "Viewfinder must enforce 80-90vh mobile-first container"
  );

  // 72px shutter button
  assert.ok(css.includes("width: 72px"), "Shutter button must be 72px wide");
  assert.ok(css.includes("height: 72px"), "Shutter button must be 72px high");

  // Love Theme pulse ring
  assert.ok(css.includes(".cameraPulseRing"), "Must style .cameraPulseRing");
  assert.ok(css.includes("cameraLovePulse"), "Must define cameraLovePulse keyframe animation");

  // Top floating bar and gallery thumbnail
  assert.ok(css.includes(".cameraTopFloatingBar"), "Must style .cameraTopFloatingBar");
  assert.ok(css.includes(".cameraGalleryThumbWrap"), "Must style .cameraGalleryThumbWrap");
});
