"use client";

import React from "react";
import { RouteShell } from "@/components/shared/RouteShell";
import { ChatPanel } from "@/components/chat/ChatPanel";

export function ChatClient({ unlocked }: { unlocked: boolean }) {
  return (
    <RouteShell unlocked={unlocked} headerNote="private sanctuary · راز و نیاز">
      <ChatPanel />
    </RouteShell>
  );
}
