import type { Metadata } from "next";
import Link from "next/link";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { readScope } from "@/lib/session";

export const metadata: Metadata = {
  title: "Private Chat · Meerah ✿ & BABA",
  description: "End-to-End Encrypted private conversation sanctuary for Meerah's birthday.",
};

export default async function ChatPage() {
  const isUnlocked = await readScope("birthday");

  return (
    <main className="dedicatedChatPageWrapper" style={{
      minHeight: "100vh",
      background: "radial-gradient(circle at 50% 30%, #201124 0%, #0F0712 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem",
      boxSizing: "border-box",
      color: "#F8F1E9",
      fontFamily: "'Inter', system-ui, sans-serif"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "1100px",
        marginBottom: "0.75rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 0.5rem"
      }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "#FFC6D4",
            textDecoration: "none",
            fontSize: "0.88rem",
            fontWeight: 600,
            padding: "0.4rem 0.8rem",
            borderRadius: "999px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 214, 230, 0.15)",
            transition: "background 0.2s"
          }}
        >
          <span>← Back to Birthday Sanctuary</span>
        </Link>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.78rem",
          color: "#C5B3C9"
        }}>
          <span>🔒 Web Crypto AES-GCM-256 E2EE</span>
        </div>
      </div>

      <ChatPanel />
    </main>
  );
}
