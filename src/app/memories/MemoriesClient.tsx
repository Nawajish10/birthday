"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import { RouteShell } from "@/components/shared/RouteShell";
import { MemoriesPanel } from "@/components/memories/MemoriesPanel";
import { GOOGLE_PHOTOS_DATA } from "@/lib/google-photos-data";

export function MemoriesClient({ unlocked }: { unlocked: boolean }) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  return (
    <RouteShell unlocked={unlocked} headerNote="treasured moments · یادیں">
      <MemoriesPanel
        photos={GOOGLE_PHOTOS_DATA}
        externalAudioRef={audioRef}
        onNavigateToProfile={() => router.push("/profile")}
      />
      <audio ref={audioRef} className="audioElement" />
    </RouteShell>
  );
}
