"use client";

import React, { useState, useEffect } from "react";

interface EternalusVaultProps {
  onSelectPhoto: (item: { url: string; caption: string }) => void;
}

export function EternalusVault({ onSelectPhoto }: EternalusVaultProps) {
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean;
    person?: string;
    displayName?: string;
    authType?: string;
  }>({ authenticated: false });
  const [authTab, setAuthTab] = useState<"account" | "recovery">("account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [errorNotice, setErrorNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [photos, setPhotos] = useState<Array<{ id: string; url: string; caption: string; alt_text: string }>>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/eternalus/auth");
      const d = await res.json();
      if (res.ok && d.authenticated) {
        setAuthStatus(d);
        loadPhotos();
      }
    } catch {}
  };

  const loadPhotos = async () => {
    setLoadingMedia(true);
    try {
      const res = await fetch("/api/eternalus");
      const d = await res.json();
      if (res.ok && Array.isArray(d.items)) {
        setPhotos(d.items);
      }
    } catch {}
    finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleAccountLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorNotice("");

    try {
      const res = await fetch("/api/eternalus/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        setAuthStatus({
          authenticated: true,
          person: d.person,
          displayName: d.displayName,
          authType: d.authType,
        });
        loadPhotos();
      } else {
        setErrorNotice(d.error || "Authentication failed.");
      }
    } catch {
      setErrorNotice("Could not connect to authentication service.");
    } finally {
      setBusy(false);
    }
  };

  const handleRecoveryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorNotice("");

    try {
      const res = await fetch("/api/eternalus/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: recoveryCode }),
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        setAuthStatus({
          authenticated: true,
          person: d.person,
          displayName: d.displayName,
          authType: d.authType,
        });
        loadPhotos();
      } else {
        setErrorNotice(d.error || "Invalid recovery code.");
      }
    } catch {
      setErrorNotice("Could not connect to authentication service.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/eternalus/auth", { method: "DELETE" }).catch(() => {});
    setAuthStatus({ authenticated: false });
    setPhotos([]);
  };

  if (authStatus.authenticated) {
    return (
      <div className="eternalusContentWrapper">
        <div className="sectionhead">
          <div>
            <span className="kicker">Verified Private Archive · ہمارا راز</span>
            <h2>Eternalus ♡</h2>
          </div>
          <span className="chip" style={{ background: "#e8ede6", color: "#376e58" }}>
            {authStatus.displayName || "Verified"} · {authStatus.authType === "individual_verified" ? "Account" : "Recovery"}
          </span>
        </div>

        <p style={{ color: "#68584d", fontSize: "14px", fontStyle: "italic", margin: "0 0 16px" }}>
          A sanctuary reserved only for us. Sensitive couple photos and private memories stream with zero-caching security.
        </p>

        {loadingMedia ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#85756c" }}>
            <span>Retrieving private memories… ♡</span>
          </div>
        ) : (
          <div className="gallery">
            {photos.map((x, i) => (
              <button
                key={x.id}
                type="button"
                className="photoTile"
                onClick={() => onSelectPhoto({ url: x.url, caption: x.caption || `Private memory ${i + 1}` })}
              >
                <img src={x.url} alt={x.alt_text || "Private couple memory"} />
              </button>
            ))}
            {!photos.length && (
              <p className="empty">
                No private photos have been uploaded yet. The creator can add photos in Creator Workspace → Eternalus Gallery.
              </p>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
          <span style={{ fontSize: "11px", color: "#85756c" }}>
            Session protected by HTTP-only secure signed cookie
          </span>
          <button type="button" className="button secondary" onClick={handleLogout}>
            Lock & Sign Out 🔒
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="eternalusGateWrapper" style={{ maxWidth: "460px", margin: "0 auto" }}>
      <div className="sectionhead" style={{ justifyContent: "center", textAlign: "center" }}>
        <div>
          <span className="kicker">Separate Private Album</span>
          <h2>Eternalus ♡</h2>
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: "13px", color: "#6e4b3b", margin: "0 0 16px" }}>
        Our couple memories live here, completely segregated from public birthday pages. Sign in with your verified account.
      </p>

      {/* Switch between Verified Account and Recovery Code */}
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "18px" }}>
        <button
          type="button"
          onClick={() => { setAuthTab("account"); setErrorNotice(""); }}
          className={`button ${authTab === "account" ? "rose" : "secondary"}`}
          style={{ padding: "8px 16px", fontSize: "11px" }}
        >
          Verified Account
        </button>
        <button
          type="button"
          onClick={() => { setAuthTab("recovery"); setErrorNotice(""); }}
          className={`button ${authTab === "recovery" ? "rose" : "secondary"}`}
          style={{ padding: "8px 16px", fontSize: "11px" }}
        >
          Recovery Code
        </button>
      </div>

      {errorNotice && <div className="error" style={{ marginBottom: "14px" }}>{errorNotice}</div>}

      {authTab === "account" ? (
        <form className="unlockform" onSubmit={handleAccountLogin} style={{ maxWidth: "100%" }}>
          <label htmlFor="memberEmail">Your Verified Email</label>
          <input
            id="memberEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="meerah@... or creator email"
            autoComplete="username"
            required
          />

          <label htmlFor="memberPassword">Password</label>
          <input
            id="memberPassword"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <button className="button rose" disabled={busy} style={{ marginTop: "6px" }}>
            {busy ? "Verifying…" : "Enter Private Archive →"}
          </button>
        </form>
      ) : (
        <form className="unlockform" onSubmit={handleRecoveryLogin} style={{ maxWidth: "100%" }}>
          <label htmlFor="privateRecoveryCode">Emergency Recovery Code</label>
          <input
            id="privateRecoveryCode"
            type="password"
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
            placeholder="Enter the 8+ char private code"
            required
          />

          <button className="button rose" disabled={busy} style={{ marginTop: "6px" }}>
            {busy ? "Verifying…" : "Unlock with Recovery Code →"}
          </button>
        </form>
      )}

      <p className="privacyline" style={{ marginTop: "18px", fontSize: "11px" }}>
        The general birthday passcode does not unlock this section. Access is enforced server-side.
      </p>
    </div>
  );
}
