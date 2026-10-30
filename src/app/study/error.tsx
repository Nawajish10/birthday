"use client";

import React, { useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function StudyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    console.error("Study Page Error:", error);
  }, [error]);

  const handleRetry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div
      className="study-error-container"
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
        color: "#523742",
        background: "#FFFBF7",
      }}
    >
      <div style={{ fontSize: "42px", marginBottom: "12px" }} aria-hidden="true">
        🌸
      </div>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "24px",
          fontWeight: 700,
          color: "#4A1525",
          marginBottom: "8px",
        }}
      >
        Study Room &middot; مطالعہ
      </h2>
      <p
        style={{
          maxWidth: "400px",
          fontSize: "14px",
          lineHeight: 1.6,
          color: "#7E5868",
          marginBottom: "24px",
        }}
      >
        There was a gentle pause loading the study sanctuary. Please try again or return home.
      </p>
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          onClick={handleRetry}
          disabled={isPending}
          className="study-retry-btn"
          aria-label="Try Again"
          style={{
            background: "linear-gradient(135deg, #B6536F, #8F3A53)",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "24px",
            padding: "10px 24px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: isPending ? "wait" : "pointer",
            boxShadow: "0 4px 12px rgba(182, 83, 111, 0.25)",
            opacity: isPending ? 0.75 : 1,
            transition: "all 0.2s ease",
          }}
        >
          {isPending ? "Retrying..." : "Try Again ✿"}
        </button>
        <Link
          href="/"
          className="study-home-btn"
          aria-label="Return Home"
          style={{
            background: "#F5EBE6",
            color: "#523742",
            border: "1px solid rgba(82, 55, 66, 0.15)",
            borderRadius: "24px",
            padding: "10px 24px",
            fontSize: "14px",
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          Return Home &rarr;
        </Link>
      </div>
    </div>
  );
}
