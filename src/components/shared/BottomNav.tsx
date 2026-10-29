"use client";

import React from "react";
import "./bottom-nav.css";

export type TabId = "home" | "stories" | "profile" | "songs" | "study" | "games" | "chat";

interface NavDestination {
  id: TabId;
  label: string;
  icon: string;
  ariaLabel: string;
}

const DESTINATIONS: NavDestination[] = [
  { id: "home", label: "Home", icon: "⌂", ariaLabel: "Go to Home" },
  { id: "stories", label: "Memories", icon: "◎", ariaLabel: "Go to Memories" },
  { id: "profile", label: "Profile", icon: "▦", ariaLabel: "Go to Profile" },
  { id: "songs", label: "Music", icon: "♫", ariaLabel: "Go to Music Room" },
  { id: "study", label: "Study", icon: "📖", ariaLabel: "Go to Read and Study" },
  { id: "games", label: "Games", icon: "🎮", ariaLabel: "Go to Games Hub" },
  { id: "chat", label: "Chat", icon: "☏", ariaLabel: "Go to Private Chat" },
];

interface BottomNavProps {
  currentTab: TabId | string;
  onSelectTab: (tab: TabId) => void;
}

export function BottomNav({ currentTab, onSelectTab }: BottomNavProps) {
  return (
    <nav className="bottom-nav-container" aria-label="Application Navigation" role="navigation">
      <ul className="bottom-nav-list" role="menubar">
        {DESTINATIONS.map((dest) => {
          const isActive = currentTab === dest.id;
          return (
            <li key={dest.id} className="bottom-nav-item" role="none">
              <button
                type="button"
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
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

