"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { BookScene } from "./BookScene";
import { PageContent } from "./pageTexture";

interface BookCanvasProps {
  pages: PageContent[];
  currentPage: number;
  onPageChange: (newPage: number) => void;
  cssFallback: React.ReactNode;
}

export function BookCanvas({
  pages,
  currentPage,
  onPageChange,
  cssFallback,
}: BookCanvasProps) {
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);
  const [viewAngle, setViewAngle] = useState<number>(0);
  const [resetCount, setResetCount] = useState<number>(0);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);

  // Check WebGL support and reduced motion
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
// eslint-disable-next-line react-hooks/set-state-in-effect
      setHasWebGL(Boolean(gl));
    } catch {
      setHasWebGL(false);
    }

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const turnPage = (direction: "next" | "prev") => {
    if (direction === "next") {
      onPageChange((currentPage + 1) % pages.length);
    } else {
      onPageChange((currentPage - 1 + pages.length) % pages.length);
    }
  };

  // If WebGL fails or reduced motion is preferred, render the CSS fallback gracefully
  if (hasWebGL === false || isReducedMotion) {
    return <>{cssFallback}</>;
  }

  return (
    <div className="book3dContainer" style={{ position: "relative", width: "100%", minHeight: "440px" }}>
      {/* 3D WebGL Canvas */}
      <div
        className="book3dCanvasWrapper"
        style={{
          width: "100%",
          height: "440px",
          borderRadius: "20px",
          background: "radial-gradient(ellipse at 50% 50%, #f7ecd9 0%, #ecd8bf 100%)",
          boxShadow: "0 18px 45px rgba(60, 40, 20, 0.18)",
          overflow: "hidden",
        }}
      >
        <Suspense
          fallback={
            <div style={{ display: "grid", placeContent: "center", height: "100%", color: "#6e4b3b", fontStyle: "italic" }}>
              <span>Opening Meerah’s 3D book… ✿</span>
            </div>
          }
        >
          <Canvas
            shadows
            camera={{ position: [0, 0, 4.2], fov: 42 }}
            gl={{ antialias: true, alpha: true }}
            style={{ touchAction: "pan-y" }}
          >
            <OrbitControls
              enablePan={false}
              minDistance={2.8}
              maxDistance={6.2}
              minPolarAngle={Math.PI / 4.5}
              maxPolarAngle={Math.PI / 1.8}
              minAzimuthAngle={-Math.PI / 3}
              maxAzimuthAngle={Math.PI / 3}
              enableDamping
              dampingFactor={0.06}
            />
            <BookScene
              pages={pages}
              currentPage={currentPage}
              onTurnPage={turnPage}
              viewAngle={viewAngle}
              cameraResetTrigger={resetCount}
            />
          </Canvas>
        </Suspense>
      </div>

      {/* Floating 3D Interaction Hint */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 14px",
          marginTop: "10px",
          fontSize: "11px",
          color: "#7a6352",
        }}
      >
        <span>✧ Drag page edge to turn · Orbit with mouse/touch</span>
        <button
          type="button"
          onClick={() => setResetCount((c) => c + 1)}
          style={{
            background: "#fff9ee",
            border: "1px solid #d8c4a9",
            borderRadius: "12px",
            padding: "4px 10px",
            color: "#6e4b3b",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ↺ Reset View
        </button>
      </div>

      {/* Page Navigation Controls */}
      <div className="bookControls" style={{ marginTop: "6px" }}>
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => turnPage("prev")}
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Next page"
          onClick={() => turnPage("next")}
        >
          →
        </button>
      </div>

      {/* Angle Presets */}
      <div className="bookViewControls" role="group" aria-label="Change book viewing angle" style={{ marginTop: "10px" }}>
        <span>VIEW</span>
        <button
          type="button"
          aria-pressed={viewAngle === 0}
          className={viewAngle === 0 ? "active" : ""}
          onClick={() => setViewAngle(0)}
        >
          Front
        </button>
        <button
          type="button"
          aria-pressed={viewAngle === 45}
          className={viewAngle === 45 ? "active" : ""}
          onClick={() => setViewAngle(45)}
        >
          45°
        </button>
        <button
          type="button"
          aria-pressed={viewAngle === 90}
          className={viewAngle === 90 ? "active" : ""}
          onClick={() => setViewAngle(90)}
        >
          Top
        </button>
      </div>

      {/* Progress Dots */}
      <div className="pageDots" role="group" aria-label="Go to a birthday book page" style={{ marginTop: "12px" }}>
        {pages.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to page ${i + 1}`}
            aria-current={i === currentPage ? "page" : undefined}
            className={i === currentPage ? "active" : ""}
            onClick={() => onPageChange(i)}
          />
        ))}
      </div>
    </div>
  );
}
