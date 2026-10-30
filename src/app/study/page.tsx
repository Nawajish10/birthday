import { Metadata } from "next";
import { readScope } from "@/lib/session";
import { StudyClient } from "./StudyClient";

export const metadata: Metadata = {
  title: "Study & Reading · A Birthday World for Meerah",
  description: "Curated books, romantic journal, and reading sanctuary for Meerah.",
};

export default async function StudyPage() {
  let unlocked = false;
  try {
    unlocked = await readScope("birthday");
  } catch (err) {
    console.error("Failed to read session scope on study page:", err);
    unlocked = false;
  }
  return <StudyClient unlocked={unlocked} />;
}
