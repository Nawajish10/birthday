"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from "three";
import { createPageTexture, PageContent } from "./pageTexture";

interface BookSceneProps {
  pages: PageContent[];
  currentPage: number;
  onTurnPage: (direction: "next" | "prev") => void;
  viewAngle: number;
  cameraResetTrigger: number;
}

export function BookScene({
  pages,
  currentPage,
  onTurnPage,
  viewAngle,
  cameraResetTrigger,
}: BookSceneProps) {
  const { camera } = useThree();
  const bookWidth = 1.45;
  const bookHeight = 2.05;
  const coverThickness = 0.035;
  const spineRadius = 0.08;

  // Camera lerp target based on angle and reset triggers
  const targetCamPos = useMemo(() => new THREE.Vector3(0, 0, 4.2), []);

  useEffect(() => {
    if (viewAngle === 0) targetCamPos.set(0, 0, 4.2);
    else if (viewAngle === 45) targetCamPos.set(1.8, 1.2, 3.4);
    else if (viewAngle === 90) targetCamPos.set(0, 3.8, 1.4);
  }, [viewAngle, targetCamPos]);

  useEffect(() => {
    targetCamPos.set(0, 0, 4.2);
  }, [cameraResetTrigger, targetCamPos]);

  useFrame(() => {
    camera.position.lerp(targetCamPos, 0.05);
    camera.lookAt(0, 0, 0);
  });

  // Page Textures
  const totalPages = pages.length > 0 ? pages.length : 1;
  const leftPageContent = useMemo(
    () => (pages.length > 0 ? pages[currentPage] || pages[0] : undefined),
    [pages, currentPage]
  );
  const rightPageContent = useMemo(
    () => (pages.length > 0 ? pages[(currentPage + 1) % totalPages] || pages[0] : undefined),
    [pages, currentPage, totalPages]
  );
  const nextPageContent = useMemo(
    () => (pages.length > 0 ? pages[(currentPage + 2) % totalPages] || pages[0] : undefined),
    [pages, currentPage, totalPages]
  );

  const leftTexture = useMemo(
    () => createPageTexture(leftPageContent, true),
    [leftPageContent]
  );
  const rightTexture = useMemo(
    () => createPageTexture(rightPageContent, false),
    [rightPageContent]
  );
  const nextTexture = useMemo(
    () => createPageTexture(nextPageContent, false),
    [nextPageContent]
  );

  // Drag and turning state
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0); // 0 = flat right, 1 = flipped left
  const [animatingTurn, setAnimatingTurn] = useState<"next" | "prev" | null>(null);
  const turnProgressRef = useRef(0);
  const pointerStartX = useRef(0);

  // Mesh reference for dynamic vertex bending
  const turningMeshRef = useRef<THREE.Mesh>(null);

  // Base geometry for segmented turning page (32 x 16 segments for smooth deformation)
  const turningGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(bookWidth, bookHeight, 32, 16);
    // Offset pivot to the spine (left edge x = 0)
    geo.translate(bookWidth / 2, 0, 0);
    return geo;
  }, [bookWidth, bookHeight]);

  // Store immutable original vertex positions
  const originalPositionsRef = useRef<Float32Array | null>(null);
  useEffect(() => {
    const pos = turningGeometry.attributes.position;
    originalPositionsRef.current = (pos.array as Float32Array).slice();
  }, [turningGeometry]);

  // Deformation and animation loop
  // eslint-disable-next-line react-hooks/immutability
useFrame((_, delta) => {
    // 1. Handle Turn Animation Commit / Snap-Back
    if (animatingTurn) {
      const speed = delta * 2.8;
      if (animatingTurn === "next") {
        turnProgressRef.current = Math.min(1, turnProgressRef.current + speed);
        setDragProgress(turnProgressRef.current);
        if (turnProgressRef.current >= 1) {
          setAnimatingTurn(null);
          turnProgressRef.current = 0;
          setDragProgress(0);
          onTurnPage("next");
        }
      } else if (animatingTurn === "prev") {
        turnProgressRef.current = Math.max(0, turnProgressRef.current - speed);
        setDragProgress(turnProgressRef.current);
        if (turnProgressRef.current <= 0) {
          setAnimatingTurn(null);
          turnProgressRef.current = 0;
          setDragProgress(0);
        }
      }
    }

    // 2. Apply Page Curl / Bending Deformations
    if (turningMeshRef.current && (isDragging || animatingTurn)) {
      const angle = -dragProgress * Math.PI;
      turningMeshRef.current.rotation.y = angle;

      const pos = turningGeometry.attributes.position;
      const original = originalPositionsRef.current ?? (pos.array as Float32Array);
      // Original positions stored in ref; no mutation of geometry.userData

      // Max curvature at 50% turn
      const curlIntensity = Math.sin(dragProgress * Math.PI) * 0.32;

      for (let i = 0; i < pos.count; i++) {
        const ox = original[i * 3];
        const oy = original[i * 3 + 1];
        const u = ox / bookWidth; // 0 at spine, 1 at outer page edge

        // Progressive sinusoidal wave bend
        const zBend = Math.sin(u * Math.PI) * curlIntensity;
        // Subtle corner upward lift during turn
        const yLift = Math.pow(u, 2) * Math.sin(dragProgress * Math.PI) * 0.08;

        pos.setXYZ(i, ox, oy + yLift, zBend);
      }
// eslint-disable-next-line react-hooks/immutability
      pos.needsUpdate = true;

      turningGeometry.computeVertexNormals();
    }
  });

  // Pointer drag event handlers on the interactive corner
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (animatingTurn) return;
    setIsDragging(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pointerStartX.current = e.clientX || ((e as any).touches?.[0]?.clientX) || 0;
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    e.stopPropagation();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentX = e.clientX || ((e as any).touches?.[0]?.clientX) || 0;
    const deltaX = pointerStartX.current - currentX;
    // Map 280px drag distance to 0..1 progress
    const progress = Math.max(0, Math.min(1, deltaX / 280));
    setDragProgress(progress);
    turnProgressRef.current = progress;
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);
    // If pulled more than 35%, complete the turn; otherwise snap back
    if (dragProgress > 0.35) {
      setAnimatingTurn("next");
    } else {
      setAnimatingTurn("prev");
    }
  };

  return (
    <group position={[0, 0, 0]}>
      {/* Warm Ambient & Directional Key Lighting */}
      <ambientLight color="#fff8ef" intensity={1.1} />
      <directionalLight
        position={[3, 5, 4]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        color="#ffffff"
      />
      <directionalLight position={[-3, -2, 2]} intensity={0.5} color="#ffd1dc" />

      {/* --- Hardcover Spine & Covers --- */}
      {/* Front Cover (Right side) */}
      <mesh position={[bookWidth / 2 + 0.02, 0, -0.06]} receiveShadow>
        <boxGeometry args={[bookWidth + 0.06, bookHeight + 0.08, coverThickness]} />
        <meshStandardMaterial color="#4a3124" roughness={0.65} metalness={0.15} />
      </mesh>

      {/* Back Cover (Left side) */}
      <mesh position={[-bookWidth / 2 - 0.02, 0, -0.06]} receiveShadow>
        <boxGeometry args={[bookWidth + 0.06, bookHeight + 0.08, coverThickness]} />
        <meshStandardMaterial color="#4a3124" roughness={0.65} metalness={0.15} />
      </mesh>

      {/* Rounded Spine */}
      <mesh position={[0, 0, -0.06]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[spineRadius, spineRadius, bookHeight + 0.08, 16, 1, false, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#3e271c" roughness={0.6} />
      </mesh>

      {/* --- Paper Block (Stacked Pages Thickness) --- */}
      {/* Left Page Block */}
      <mesh position={[-bookWidth / 2, 0, -0.02]}>
        <boxGeometry args={[bookWidth - 0.02, bookHeight - 0.02, 0.04]} />
        <meshStandardMaterial color="#f5ece0" roughness={0.9} />
      </mesh>

      {/* Right Page Block */}
      <mesh position={[bookWidth / 2, 0, -0.02]}>
        <boxGeometry args={[bookWidth - 0.02, bookHeight - 0.02, 0.04]} />
        <meshStandardMaterial color="#f5ece0" roughness={0.9} />
      </mesh>

      {/* --- Static Open Pages Spread --- */}
      {/* Left Static Page (Showing current left content) */}
      <mesh position={[-bookWidth / 2, 0, 0.002]} receiveShadow>
        <planeGeometry args={[bookWidth, bookHeight]} />
        <meshBasicMaterial map={leftTexture} />
      </mesh>

      {/* Right Static Page (Underneath the turning page) */}
      <mesh position={[bookWidth / 2, 0, 0.001]} receiveShadow>
        <planeGeometry args={[bookWidth, bookHeight]} />
        <meshBasicMaterial map={isDragging || animatingTurn ? nextTexture : rightTexture} />
      </mesh>

      {/* --- Interactive Turning Page (Segmented Mesh) --- */}
      {(isDragging || animatingTurn) && (
        <mesh ref={turningMeshRef} geometry={turningGeometry} position={[0, 0, 0.005]} castShadow>
          <meshStandardMaterial
            map={rightTexture}
            side={THREE.DoubleSide}
            roughness={0.7}
            metalness={0.05}
          />
        </mesh>
      )}

      {/* --- Draggable Page Corner / Edge Hit Area --- */}
      <mesh
        position={[bookWidth - 0.15, 0, 0.02]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <planeGeometry args={[0.3, bookHeight]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
