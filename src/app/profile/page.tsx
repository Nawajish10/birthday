import { Metadata } from "next";
import { readScope } from "@/lib/session";
import { ProfileClient } from "./ProfileClient";

export const metadata: Metadata = {
  title: "Profile · A Birthday World for Meerah",
  description: "Personal highlights, memories, and curated profile for Meerah.",
};

export default async function ProfilePage() {
  const unlocked = await readScope("birthday");
  return <ProfileClient unlocked={unlocked} />;
}
