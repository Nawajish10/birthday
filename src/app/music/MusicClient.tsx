"use client";

import React, { useRef } from "react";
import { RouteShell } from "@/components/shared/RouteShell";
import { MusicRoom } from "@/components/music/MusicRoom";

export function MusicClient({ unlocked }: { unlocked: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  return (
    <RouteShell unlocked={unlocked} headerNote="our soundtrack · موسیقی">
      <MusicRoom externalAudioRef={audioRef} />
      <audio ref={audioRef} className="audioElement" />
    </RouteShell>
  );
}
