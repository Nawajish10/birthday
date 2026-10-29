import { Metadata } from "next";
import { readScope } from "@/lib/session";
import { GamesClient } from "./GamesClient";

export const metadata: Metadata = {
  title: "Games Hub · A Birthday World for Meerah",
  description: "Interactive games, birthday quizzes, and memory puzzles for Meerah.",
};

export default async function GamesPage() {
  const unlocked = await readScope("birthday");
  return <GamesClient unlocked={unlocked} />;
}
