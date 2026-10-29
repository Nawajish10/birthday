"use client";

import React from "react";
import { RouteShell } from "@/components/shared/RouteShell";
import { GamesPanel } from "@/components/games/GamesPanel";

export function GamesClient({ unlocked }: { unlocked: boolean }) {
  return (
    <RouteShell unlocked={unlocked} headerNote="play together · کھیل اور تفریح">
      <GamesPanel />
    </RouteShell>
  );
}
