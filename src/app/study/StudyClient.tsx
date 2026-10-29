"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { RouteShell } from "@/components/shared/RouteShell";
import { StudyPanel } from "@/components/study/StudyPanel";

export function StudyClient({ unlocked }: { unlocked: boolean }) {
  const router = useRouter();

  return (
    <RouteShell unlocked={unlocked} headerNote="study & reading · کتب خانہ">
      <StudyPanel onOpenBook={() => router.push("/")} />
    </RouteShell>
  );
}
