import type { Metadata } from "next";
import { readScope } from "@/lib/session";
import { ChatClient } from "./ChatClient";

export const metadata: Metadata = {
  title: "Private Chat · Meerah ✿ & BABA",
  description: "End-to-End Encrypted private conversation sanctuary for Meerah's birthday.",
};

export default async function ChatPage() {
  const isUnlocked = await readScope("birthday");
  return <ChatClient unlocked={isUnlocked} />;
}

