"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PasscodeGate } from "@/components/PasscodeGate";
import { BottomNav } from "@/components/shared/BottomNav";

export interface RouteShellProps {
  unlocked: boolean;
  children: React.ReactNode;
  headerNote?: string;
}

export function RouteShell({
  unlocked,
  children,
  headerNote = "a little world for you",
}: RouteShellProps) {
  const [open, setOpen] = useState(unlocked);

  if (!open) {
    return (
      <PasscodeGate
        onUnlocked={() => {
          setOpen(true);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <main className="shell" data-theme="love">
      <header className="appheader">
        <Link href="/" className="wordmark">
          Meerah <span>✿</span>
        </Link>
        <div className="headernote">{headerNote}</div>
      </header>

      <section className="content shell-content-with-bottom-nav">
        {children}
      </section>

      <footer>
        Made with love · Built for Meerah ·{" "}
        <Link href="/admin">Creator workspace</Link>
      </footer>
      <BottomNav />
    </main>
  );
}
