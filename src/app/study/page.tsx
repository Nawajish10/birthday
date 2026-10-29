import { Metadata } from "next";
import { readScope } from "@/lib/session";
import { StudyClient } from "./StudyClient";

export const metadata: Metadata = {
  title: "Study & Reading · A Birthday World for Meerah",
  description: "Curated books, romantic journal, and reading sanctuary for Meerah.",
};

export default async function StudyPage() {
  const unlocked = await readScope("birthday");
  return <StudyClient unlocked={unlocked} />;
}
