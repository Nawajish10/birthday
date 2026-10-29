import React from "react";
import type { Metadata } from "next";
import { readScope } from "@/lib/session";
import { MusicClient } from "./MusicClient";

export const metadata: Metadata = {
  title: "Music Room · Meerah ✿ ہماری موسیقی",
  description: "A Spotify-inspired romantic music sanctuary for Meerah's birthday.",
};

export default async function MusicPage() {
  const unlocked = await readScope("birthday");
  return <MusicClient unlocked={unlocked} />;
}
