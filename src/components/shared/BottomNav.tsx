"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./bottom-nav.css";

export type TabId = "home" | "stories" | "profile" | "songs" | "study" | "games" | "chat";

export interface NavDestination {
  id: TabId;
  href: string;
  label: string;
  icon: string;
  ariaLabel: string;
}

export const DESTINATIONS: NavDestination[] = [
  { id: "home", href: "/", label: "Home", icon: "⌂", ariaLabel: "Go to Home" },
  { id: "stories", href: "/memories", label: "Memories", icon: "◎", ariaLabel: "Go to Memories" },
  { id: "profile", href: "/profile", label: "Profile", icon: "▦", ariaLabel: "Go to Profile" },
  { id: "songs", href: "/music", label: "Music", icon: "♫", ariaLabel: "Go to Music Room" },
  { id: "study", href: "/study", label: "Study", icon: "📖", ariaLabel: "Go to Read and Study" },
  { id: "games", href: "/games", label: "Games", icon: "🎮", ariaLabel: "Go to Games Hub" },
  { id: "chat", href: "/chat", label: "Chat", icon: "☏", ariaLabel: "Go to Private Chat" },
];

export interface BottomNavProps {
  currentTab?: TabId | string;
  onSelectTab?: (tab: TabId) => void;
}

export function BottomNav({ currentTab, onSelectTab = () => {} }: BottomNavProps = {}) {
  const pathname = usePathname();

  function isItemActive(dest: NavDestination): boolean {
    if (pathname && pathname !== "/") {
      return pathname === dest.href || pathname.startsWith(dest.href + "/");
    }

    if (pathname === "/") {
      if (currentTab && currentTab !== "home") {
        return currentTab === dest.id || currentTab === dest.href.replace("/", "");
      }
      return dest.href === "/";
    }

    if (currentTab) {
      return currentTab === dest.id || currentTab === dest.href.replace("/", "");
    }

    return dest.href === "/";
  }

  return (
    <nav className="bottom-nav-container" aria-label="Application Navigation" role="navigation">
      <ul className="bottom-nav-list" role="menubar">
        {DESTINATIONS.map((dest) => {
          const isActive = isItemActive(dest);
          return (
            <li key={dest.id} className="bottom-nav-item" role="none">
              <Link
                href={dest.href}
                role="menuitem"
                aria-label={dest.ariaLabel}
                aria-current={isActive ? "page" : undefined}
                className={`bottom-nav-btn ${isActive ? "active" : ""}`}
                onClick={() => onSelectTab(dest.id)}
              >
                <span className="bottom-nav-icon" aria-hidden="true">
                  {dest.icon}
                </span>
                <span className="bottom-nav-label">{dest.label}</span>
                {isActive && <span className="bottom-nav-active-pill" aria-hidden="true" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
