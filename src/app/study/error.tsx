"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function StudyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Study Page Error:", error);
  }, [error]);

  return (
    <div
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
          onClick={() => reset()}
          style={{
            background: "linear-gradient(135deg, #B6536F, #8F3A53)",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "24px",
            padding: "10px 24px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(182, 83, 111, 0.25)",
          }}
        >
          Try Again ✿
        </button>
        <Link
          href="/"
          style={{
            background: "#F5EBE6",
            color: "#523742",
            border: "1px solid rgba(82, 55, 66, 0.15)",
            borderRadius: "24px",
            padding: "10px 24px",
            fontSize: "14px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Back to Home &rarr;
        </Link>
      </div>
    </div>
  );
}
