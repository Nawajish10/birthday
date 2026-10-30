"use client";

import React from "react";
import { RouteShell } from "@/components/shared/RouteShell";
import { StudyPanel } from "@/components/study/StudyPanel";

export function StudyClient({ unlocked }: { unlocked: boolean }) {
  return (
    <RouteShell unlocked={unlocked} headerNote="study & reading · کتب خانہ">
      <StudyPanel />
    </RouteShell>
  );
}
