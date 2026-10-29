import { Metadata } from "next";
import { readScope } from "@/lib/session";
import { MemoriesClient } from "./MemoriesClient";

export const metadata: Metadata = {
  title: "Memories · A Birthday World for Meerah",
  description: "Cherished moments, stories, and photo collections for Meerah.",
};

export default async function MemoriesPage() {
  const unlocked = await readScope("birthday");
  return <MemoriesClient unlocked={unlocked} />;
}
