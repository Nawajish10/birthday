"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getBrowserClient } from "@/lib/supabase/browser";
import { AdminMusicUpload } from "./admin/music/AdminMusicUpload";

const kinds = [
  { id: "birthday_cards", label: "Birthday cards", fields: ["title", "body_en", "body_ur", "sort_order", "is_published"] },
  { id: "profile_posts", label: "Main Gallery posts", fields: ["media_path", "media_kind", "caption", "alt_text", "gallery_category", "sort_order", "is_published"] },
  {id:"music_management",label:"Music Management",fields:[]},
  { id: "music_tracks", label: "Songs", fields: ["title", "artist", "media_path", "duration_seconds", "sort_order", "is_published"] },
  { id: "story_items", label: "Stories", fields: ["media_path", "media_kind", "caption", "alt_text", "sort_order", "is_published"] },
  { id: "eternalus_assets", label: "Private Gallery (Eternalus)", fields: ["media_path", "caption", "alt_text", "gallery_category", "sort_order", "is_published"] },
  { id: "birthday_gifts", label: "25 Gifts", fields: ["slot_number", "title", "hint", "reward_type", "reward_content", "is_published"] },
  { id: "games", label: "Gift games", fields: ["title", "instructions", "reward_text", "sort_order", "is_published"] },
  { id: "noah_knowledge", label: "Noah knowledge", fields: ["topic", "approved_text", "is_enabled"] },
  { id: "messages", label: "Creator inbox", fields: [] },
  { id: "access", label: "Access & codes", fields: [] },
];

type Row = {
  id?: string;
  scope?: string;
  sender?: string;
  created_at?: string;
  body?: string;
  visitor_id?: string;
  title?: string;
  topic?: string;
  caption?: string;
  media_path?: string;
  artist?: string;
  body_en?: string;
  approved_text?: string;
  instructions?: string;
  alt_text?: string;
  is_published?: boolean;
  is_enabled?: boolean;
  gallery_category?: "main" | "private" | string;
  galleryCategory?: "main" | "private";
  [key: string]: string | number | boolean | null | undefined;
};

export function Admin({ authenticated, email }: { authenticated: boolean; email: string }) {
  const [signed] = useState(authenticated);
  const [section, setSection] = useState(kinds[0].id);
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Row>({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [replyVisitor, setReplyVisitor] = useState("");
  const [replyText, setReplyText] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [codeValues, setCodeValues] = useState({ birthday: "", eternalus: "" });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const current = kinds.find((k) => k.id === section) || kinds[0];
  const isMediaSection = section === "profile_posts" || section === "eternalus_assets";

  const load = useCallback(async () => {
    if (section === "music_management") return;
    const r =
      section === "messages"
        ? await fetch("/api/creator-messages?inbox=1")
        : section === "access"
        ? await fetch("/api/admin/access")
        : await fetch(`/api/admin?table=${section}`);
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      setErr("");
      if (section === "access") setCodes((d.configured ?? []).map((x: Row) => String(x.scope)));
      else setRows(d.data ?? d.messages ?? []);
    } else {
      setErr(d.error || "Unable to load content.");
    }
  }, [section]);

  useEffect(() => {
    if (!signed) return;
    if (section === "music_management") return;
    setSelectedIds([]);
    let ignore = false;
    const runLoad = async () => {
      const r =
        section === "messages"
          ? await fetch("/api/creator-messages?inbox=1")
          : section === "access"
          ? await fetch("/api/admin/access")
          : await fetch(`/api/admin?table=${section}`);
      const d = await r.json().catch(() => ({}));
      if (ignore) return;
      if (r.ok) {
        setErr("");
        if (section === "access") setCodes((d.configured ?? []).map((x: Row) => String(x.scope)));
        else setRows(d.data ?? d.messages ?? []);
      } else {
        setErr(d.error || "Unable to load content.");
      }
    };
    void runLoad();
    return () => {
      ignore = true;
    };
  }, [signed, section]);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const fd = new FormData(e.currentTarget);
    const { error } = await getBrowserClient().auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    if (error) {
      setErr(error.message);
      return;
    }
    location.reload();
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const recordToSave = {
      ...form,
      gallery_category: form.gallery_category || (section === "eternalus_assets" ? "private" : "main"),
    };
    const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: section, record: recordToSave }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(d.error || "Save failed.");
      return;
    }
    setForm({});
    setNotice("Saved.");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this content item?")) return;
    const r = await fetch("/api/admin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: section, id }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setErr(d.error);
    else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      load();
    }
  }

  async function classifySingle(id: string, category: "main" | "private") {
    setBusy(true);
    setErr("");
    const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: section,
        record: { id, gallery_category: category },
      }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(d.error || "Classification failed.");
      return;
    }
    setNotice(`Item set to ${category === "main" ? "Main Gallery (Public)" : "Private Gallery (Eternalus)"}.`);
    load();
  }

  async function bulkClassify(category: "main" | "private") {
    if (selectedIds.length === 0) return;
    setBusy(true);
    setErr("");
    const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: section,
        action: "bulk_classify",
        ids: selectedIds,
        category,
      }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(d.error || "Bulk classification failed.");
      return;
    }
    setNotice(`Updated ${selectedIds.length} item(s) to ${category === "main" ? "Main Gallery" : "Private Gallery"}.`);
    setSelectedIds([]);
    load();
  }

  async function bulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected item(s)?`)) return;
    setBusy(true);
    setErr("");
    const r = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: section,
        action: "bulk_delete",
        ids: selectedIds,
      }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(d.error || "Bulk delete failed.");
      return;
    }
    setNotice(`Deleted ${selectedIds.length} item(s).`);
    setSelectedIds([]);
    load();
  }

  const toggleSelectAll = () => {
    const validIds = rows.map((r) => r.id).filter((id): id is string => Boolean(id));
    if (selectedIds.length === validIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(validIds);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await fetch("/api/creator-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender: "creator", visitor_id: replyVisitor, body: replyText }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(d.error || "Unable to reply.");
      return;
    }
    setReplyText("");
    setNotice("Reply sent.");
    load();
  }

  async function rotateCode(e: React.FormEvent, scope: "birthday" | "eternalus") {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setNotice("");
    const code = codeValues[scope];
    const r = await fetch("/api/admin/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, code }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(d.error || "Could not update code.");
      return;
    }
    setCodeValues((v) => ({ ...v, [scope]: "" }));
    setNotice(`${scope === "birthday" ? "Birthday" : "Eternalus"} code updated.`);
    load();
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr("");
    if (file.size > 50 * 1024 * 1024) {
      setErr("Choose a file smaller than 50 MB.");
      e.target.value = "";
      return;
    }
    const isPrivate = section === "eternalus_assets" || form.gallery_category === "private";
    const isMusic = section === "music_tracks";
    const allowed = isPrivate
      ? ["image/jpeg", "image/png", "image/webp", "image/avif"]
      : isMusic
      ? ["audio/mpeg", "audio/mp4", "audio/wav", "audio/aac", "audio/ogg", "audio/webm"]
      : ["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4"];
    if (!allowed.includes(file.type)) {
      setErr(
        isMusic
          ? "Choose an MP3, M4A, WAV, AAC, OGG, or WebM audio file."
          : "Choose a supported image or MP4 video."
      );
      e.target.value = "";
      return;
    }
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `${section}/${crypto.randomUUID()}.${ext}`;
    const bucket = isPrivate ? "eternalus-private" : "birthday-public";
    const { error } = await getBrowserClient()
      .storage.from(bucket)
      .upload(path, file, { contentType: file.type, upsert: false });
    setBusy(false);
    e.target.value = "";
    if (error) {
      setErr(error.message);
      return;
    }
    setForm((v) => ({
      ...v,
      media_path: path,
      media_kind: file.type.startsWith("video/") ? "video" : "image",
      title: v.title || file.name.replace(/\.[^.]+$/, ""),
      gallery_category: isPrivate ? "private" : "main",
    }));
    setNotice(`Uploaded to ${bucket}. Save this item to publish it.`);
  }

  async function signout() {
    await getBrowserClient().auth.signOut();
    location.reload();
  }

  if (!signed) {
    return (
      <main className="gate">
        <form className="gatecard" onSubmit={login}>
          <div className="flower">⌑</div>
          <span className="kicker">Private creator workspace</span>
          <h1>Sign in</h1>
          <p>Only an approved creator account can edit birthday content.</p>
          <label>Email</label>
          <input name="email" type="email" required />
          <label>Password</label>
          <input name="password" type="password" required />
          <button className="button rose">Sign in</button>
          {err && <div className="error">{err}</div>}
          <Link href="/">← Birthday experience</Link>
          <small style={{ marginTop: "1rem", color: "var(--color-text-subtle)", fontSize: "0.75rem", textAlign: "center" }}>
            Admin authentication is secured via Supabase Auth and the <code>admin_users</code> table. Contact the project owner if you need access.
          </small>
        </form>
      </main>
    );
  }

  return (
    <main className="adminShell">
      <header className="appheader">
        <Link className="wordmark" href="/">
          Meerah <span>✿</span>
        </Link>
        <span className="headernote">Creator workspace · {email}</span>
        <button className="button secondary" onClick={signout}>
          Sign out
        </button>
      </header>

      <div className="adminIntro">
        <span className="kicker">Admin console</span>
        <h1>Birthday content studio</h1>
        <p>
          Manage birthday content, classify Main Gallery & Private Gallery media, review recipient messages, and rotate access credentials safely.
        </p>
      </div>

      <nav className="adminTabs">
        {kinds.map((k) => (
          <button
            className={section === k.id ? "selected" : ""}
            key={k.id}
            onClick={() => {
              setSection(k.id);
              setForm({});
              setNotice("");
              setErr("");
              setSelectedIds([]);
            }}
          >
            {k.label}
          </button>
        ))}
      </nav>

      {section === "access" ? (
        <div className="adminGrid">
          <section className="adminPanel">
            <div className="panelHead">
              <h2>Access status & Security</h2>
              <button className="button secondary" onClick={load}>
                Refresh
              </button>
            </div>
            {err && <div className="error">{err}</div>}
            {(["birthday", "eternalus"] as const).map((scope) => (
              <article className="adminRow" key={scope}>
                <div>
                  <b>{scope === "birthday" ? "Birthday passcode" : "Eternalus recovery code"}</b>
                  <small>
                    {codes.includes(scope)
                      ? "Configured (hashed; plaintext can’t be read back)."
                      : "Not configured yet."}
                  </small>
                </div>
              </article>
            ))}
            <div style={{ padding: "1rem", marginTop: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
              <h3 style={{ fontSize: "0.9rem", color: "var(--color-primary)", margin: "0 0 0.5rem" }}>Admin Credential Bootstrap & Recovery</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
                Admin access is governed strictly by Supabase Auth and the <code>public.admin_users</code> role table. To bootstrap an owner or recover access:
                create the user in Supabase Auth, then run <code>insert into public.admin_users(user_id, role) select id, &apos;owner&apos; from auth.users where email=&apos;your_email&apos;;</code>. Passwords can be safely reset via Supabase Auth password recovery. No default passwords or secret keys are committed.
              </p>
            </div>
          </section>
          <section className="adminPanel">
            <div className="panelHead">
              <h2>Rotate access codes</h2>
            </div>
            <p className="formHint">
              Use a separate strong code for each area. Codes are hashed before storage and are shown only while you type them.
            </p>
            {(["birthday", "eternalus"] as const).map((scope) => (
              <form className="adminForm codeForm" key={scope} onSubmit={(e) => rotateCode(e, scope)}>
                <label>
                  {scope === "birthday" ? "New birthday passcode" : "New Eternalus recovery code"}
                  <input
                    type="password"
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    value={codeValues[scope]}
                    onChange={(e) => setCodeValues((v) => ({ ...v, [scope]: e.target.value }))}
                    required
                  />
                </label>
                <button className="button rose" disabled={busy}>
                  {busy ? "Saving…" : "Set code"}
                </button>
              </form>
            ))}
            {notice && <div className="success">{notice}</div>}
          </section>
        </div>
      ) : section === "messages" ? (
        <div className="adminGrid">
          <section className="adminPanel">
            <div className="panelHead">
              <h2>Messages</h2>
              <button className="button secondary" onClick={load}>
                Refresh
              </button>
            </div>
            {err && <div className="error">{err}</div>}
            {rows.map((m) => (
              <article className="adminRow" key={m.id}>
                <div>
                  <b>
                    {m.sender === "recipient" ? "Meerah" : "Creator"} ·{" "}
                    {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                  </b>
                  <small>{m.body}</small>
                  <small>Conversation id: {m.visitor_id}</small>
                </div>
                <div className="rowActions">
                  <button onClick={() => setReplyVisitor(m.visitor_id || "")}>Reply</button>
                </div>
              </article>
            ))}
            {!rows.length && <p className="empty">No messages yet.</p>}
          </section>
          <section className="adminPanel">
            <div className="panelHead">
              <h2>Reply</h2>
            </div>
            <form className="adminForm" onSubmit={sendReply}>
              <label>
                Recipient conversation id
                <input value={replyVisitor} onChange={(e) => setReplyVisitor(e.target.value)} required />
              </label>
              <label>
                Message
                <textarea
                  rows={5}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  maxLength={2000}
                  required
                />
              </label>
              <button className="button rose" disabled={busy || !replyVisitor}>
                {busy ? "Sending…" : "Send reply"}
              </button>
              {notice && <div className="success">{notice}</div>}
            </form>
          </section>
        </div>
      ) : section === "music_management" ? (
        <section className="adminPanel" style={{ maxWidth: 1000, margin: "0 auto" }}>
          <AdminMusicUpload
            onTrackUploaded={() => {
              setNotice("Audio track uploaded successfully to music library.");
              load();
            }}
          />
        </section>
      ) : (
        <div className="adminGrid">
          <section className="adminPanel">
            <div className="panelHead">
              <h2>{current.label}</h2>
              <button className="button secondary" onClick={load}>
                Refresh
              </button>
            </div>

            {/* Media Bulk Classification & Selection Controls */}
            {isMediaSection && rows.length > 0 && (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    id="select-all-media"
                    checked={rows.length > 0 && selectedIds.length === rows.length}
                    onChange={toggleSelectAll}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <label htmlFor="select-all-media" style={{ fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>
                    Select All ({rows.length})
                  </label>
                  {selectedIds.length > 0 && (
                    <span
                      style={{
                        background: "var(--color-primary)",
                        color: "#1A0F1F",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 700,
                      }}
                    >
                      {selectedIds.length} selected
                    </span>
                  )}
                </div>

                {selectedIds.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="button secondary"
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                      disabled={busy}
                      onClick={() => bulkClassify("main")}
                    >
                      ✿ Set as Main Gallery
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                      disabled={busy}
                      onClick={() => bulkClassify("private")}
                    >
                      🔒 Set as Private Gallery
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      style={{ padding: "4px 10px", fontSize: "11px", color: "var(--color-danger)" }}
                      disabled={busy}
                      onClick={bulkDelete}
                    >
                      Delete ({selectedIds.length})
                    </button>
                    <button
                      type="button"
                      className="button secondary"
                      style={{ padding: "4px 10px", fontSize: "11px" }}
                      onClick={() => setSelectedIds([])}
                    >
                      Deselect
                    </button>
                  </div>
                )}
              </div>
            )}

            {err && <div className="error">{err}</div>}
            {notice && <div className="success">{notice}</div>}

            {rows.map((row) => {
              const rowId = row.id || "";
              const isSelected = selectedIds.includes(rowId);
              const isPrivate =
                row.gallery_category === "private" ||
                section === "eternalus_assets" ||
                row.galleryCategory === "private";

              return (
                <article
                  className="adminRow"
                  key={row.id}
                  style={isSelected ? { background: "rgba(247, 168, 184, 0.08)", borderLeft: "3px solid var(--color-primary)" } : undefined}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", width: "100%" }}>
                    {isMediaSection && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(rowId)}
                        style={{ marginTop: "4px", width: "16px", height: "16px", cursor: "pointer" }}
                        aria-label={`Select ${row.caption || row.title || "item"}`}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                        <b>{row.title || row.topic || row.caption || row.media_path || "Untitled"}</b>
                        {isMediaSection && (
                          <span
                            style={{
                              fontSize: "10px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontWeight: 600,
                              background: isPrivate ? "rgba(242, 138, 154, 0.2)" : "rgba(157, 198, 173, 0.2)",
                              color: isPrivate ? "var(--color-danger)" : "var(--color-success)",
                              border: `1px solid ${isPrivate ? "var(--color-danger)" : "var(--color-success)"}`,
                            }}
                          >
                            {isPrivate ? "🔒 Private Gallery" : "✿ Main Gallery"}
                          </span>
                        )}
                      </div>
                      <small>{row.artist || row.body_en || row.approved_text || row.instructions || row.alt_text || ""}</small>
                      <small>{row.is_published || row.is_enabled ? "Published / enabled" : "Draft / disabled"}</small>
                    </div>

                    <div className="rowActions" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      {isMediaSection && row.id && (
                        <button
                          type="button"
                          style={{ fontSize: "11px", padding: "3px 8px" }}
                          disabled={busy}
                          onClick={() => classifySingle(rowId, isPrivate ? "main" : "private")}
                          title={`Switch to ${isPrivate ? "Main Gallery" : "Private Gallery"}`}
                        >
                          {isPrivate ? "Make Main ✿" : "Make Private 🔒"}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setForm(row);
                          window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (row.id) remove(row.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            {!rows.length && <p className="empty">No items yet. Add the first one with the form.</p>}
          </section>

          <section className="adminPanel">
            <div className="panelHead">
              <h2>
                {form.id ? "Edit" : "Add"} {current.label.slice(0, -1)}
              </h2>
            </div>
            <form className="adminForm" onSubmit={save}>
              {current.fields.map((f) => (
                <label key={f}>
                  {f.replaceAll("_", " ")}{" "}
                  {f === "gallery_category" ? (
                    <select
                      value={String(form[f] ?? (section === "eternalus_assets" ? "private" : "main"))}
                      onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                    >
                      <option value="main">Main Gallery (Public birthday view)</option>
                      <option value="private">Private Gallery (Eternalus vault only)</option>
                    </select>
                  ) : f.includes("published") || f.includes("enabled") ? (
                    <select
                      value={String(form[f] ?? true)}
                      onChange={(e) => setForm({ ...form, [f]: e.target.value === "true" })}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : f === "media_kind" ? (
                    <select
                      value={String(form[f] ?? "image")}
                      onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                    >
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  ) : f.includes("body") || f.includes("instructions") || f.includes("reward") || f.includes("approved") ? (
                    <textarea
                      rows={4}
                      value={typeof form[f] === "string" ? form[f] : ""}
                      onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                      required
                    />
                  ) : (
                    <input
                      type={f === "sort_order" || f === "duration_seconds" ? "number" : "text"}
                      value={
                        typeof form[f] === "number" || typeof form[f] === "string"
                          ? form[f]
                          : f === "sort_order" || f === "duration_seconds"
                          ? 0
                          : ""
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [f]:
                            f === "sort_order" || f === "duration_seconds"
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                      required={!f.includes("alt_text") && !f.includes("artist")}
                    />
                  )}
                </label>
              ))}
              {["profile_posts", "story_items", "eternalus_assets", "music_tracks"].includes(section) && (
                <label>
                  {section === "music_tracks" ? "Upload song audio" : "Upload media"}
                  <input
                    type="file"
                    accept={
                      section === "eternalus_assets"
                        ? "image/jpeg,image/png,image/webp,image/avif"
                        : section === "music_tracks"
                        ? "audio/mpeg,audio/mp4,audio/wav,audio/aac,audio/ogg,audio/webm"
                        : "image/*,video/mp4"
                    }
                    onChange={uploadFile}
                  />
                </label>
              )}
              <button className="button rose" disabled={busy}>
                {busy ? "Saving…" : "Save content"}
              </button>
              {form.id && (
                <button type="button" className="button secondary" onClick={() => setForm({})}>
                  Cancel edit
                </button>
              )}
            </form>
            <p className="formHint">
              Uploads go to a secure storage bucket. Entering an uploaded media path here does not publish it until you save the content item.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
