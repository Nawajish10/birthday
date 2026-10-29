"use client";

import React, { useState } from "react";
import "./passcode-gate.css";

interface PasscodeGateProps {
  onUnlocked: () => void;
}

export function PasscodeGate({ onUnlocked }: PasscodeGateProps) {
  const [code, setCode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    const trimmed = code.trim();
    if (!trimmed) {
      setError("Please enter your special date.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, scope: "birthday" }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.ok) {
        onUnlocked();
      } else {
        const errorMsg =
          data?.error ||
          (response.status === 429
            ? "Too many attempts. Please wait a moment."
            : "That date is not correct. Try entering your birthday (DDMMYYYY).");
        setError(errorMsg);
      }
    } catch {
      setError("Could not reach the birthday server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="passcode-gate-viewport" role="main">
      {/* Decorative ambient particles */}
      <div className="passcode-ambient-particles" aria-hidden="true">
        <span className="ambient-particle particle-1">✿</span>
        <span className="ambient-particle particle-2">✧</span>
        <span className="ambient-particle particle-3">♡</span>
        <span className="ambient-particle particle-4">✦</span>
      </div>

      <div className="passcode-card" role="region" aria-label="Birthday Passcode Invitation">
        {/* Emblem */}
        <div className="passcode-emblem-wrap" aria-hidden="true">
          <div className="passcode-emblem-glow" />
          <div className="passcode-emblem-icon">✿</div>
        </div>

        {/* Headings */}
        <span className="passcode-kicker">A little birthday world · سالگرہ کا تحفہ</span>
        <h1 className="passcode-title">
          A note for <i>Meerah</i>
        </h1>
        <p className="passcode-subtitle">
          Something made just for you is waiting on the other side. Enter your special date to open your world.
        </p>

        {/* Verification Form */}
        <form className="passcode-form" onSubmit={handleUnlock} noValidate>
          <div className="passcode-label-group">
            <label htmlFor="passcode-input" className="passcode-label">
              Enter your special date
            </label>
            <span className="passcode-hint" aria-hidden="true">
              DDMMYYYY
            </span>
          </div>

          <div className="passcode-input-wrapper">
            <input
              id="passcode-input"
              name="passcode"
              type={showPasscode ? "text" : "password"}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={16}
              placeholder="e.g. 30102001"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) setError(null);
              }}
              disabled={loading}
              className="passcode-input"
              aria-required="true"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "passcode-error-msg" : undefined}
              required
            />
            <button
              type="button"
              className="passcode-toggle-btn"
              onClick={() => setShowPasscode(!showPasscode)}
              aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
              tabIndex={0}
            >
              {showPasscode ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {error && (
            <div id="passcode-error-msg" className="passcode-error-box" role="alert" aria-live="assertive">
              <span className="passcode-error-icon" aria-hidden="true">
                ✿
              </span>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="passcode-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="passcode-spinner" aria-hidden="true" />
                <span>Opening your world...</span>
              </>
            ) : (
              <>
                <span>Open your birthday world</span>
                <span aria-hidden="true">✿</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="passcode-footer">
          <span>Made with love</span>
          <span className="passcode-footer-heart" aria-hidden="true">♡</span>
          <span dir="rtl" lang="ur">بنایا محبت سے</span>
        </div>
      </div>
    </main>
  );
}
