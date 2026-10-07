"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Row = { id: string; name?: string; title?: string; slug?: string; status?: string; reason?: string; resolution?: string; event_id?: string; organizer_id?: string; action?: string; actor_id?: string; created_at?: string };
type Section = "workspaces" | "events" | "reports" | "audit";
type Decision = { path: string; title: string; status?: string };

export default function Administration() {
  const [section, setSection] = useState<Section>("workspaces");
  const [rows, setRows] = useState<Row[]>([]);
  const [offset, setOffset] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/v1/admin/${section}?offset=${offset}`, { cache: "no-store", signal });
      if (signal?.aborted) return;
      setError("");
      if (response.status === 401 || response.status === 403) { setDenied(true); setRows([]); return; }
      if (!response.ok) throw new Error("Unable to load administration records.");
      const data = await response.json(); setRows(data.items); setNext(data.next_offset); setDenied(false);
    } catch (error) { if (!signal?.aborted) setError(error instanceof Error ? error.message : "Unable to load records."); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [section, offset]);
  useEffect(() => { const controller = new AbortController(); queueMicrotask(() => { if (!controller.signal.aborted) void load(controller.signal); }); return () => controller.abort(); }, [load]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!decision) return;
    const reason = String(new FormData(event.currentTarget).get("reason") || "").trim();
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/v1/admin/${decision.path}`, {
        method: decision.status ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "X-Gather-Request": "1" },
        body: JSON.stringify({ reason, ...(decision.status ? { status: decision.status } : {}) }),
      });
      if (!response.ok) { const data = await response.json(); throw new Error(typeof data.detail === "string" ? data.detail : "Unable to save the decision."); }
      setDecision(null); setNotice("Decision recorded."); await load();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save."); }
    finally { setBusy(false); }
  }
  return <section className="page-title dashboard-page"><span className="eyebrow">Platform operations</span><h1>Administration</h1><p className="intro">Review organisers, moderate events, and inspect platform history.</p>
    {denied ? <div className="panel"><h2>Administrator access required</h2><p>Sign in with a platform administrator account to continue.</p><Link className="primary" href="/login?next=/admin">Sign in</Link></div> : <>
      <nav className="workspace-tabs" aria-label="Administration sections">{(["workspaces", "events", "reports", "audit"] as Section[]).map(value => <button key={value} disabled={busy || loading || section === value} aria-pressed={section === value} className={section === value ? "selected" : ""} onClick={() => { setLoading(true); setSection(value); setOffset(0); setDecision(null); setNotice(""); }}>{value === "audit" ? "Audit history" : value.charAt(0).toUpperCase() + value.slice(1)}</button>)}</nav>
      {error && <div className="message error" role="alert">{error}<button className="text-button" disabled={busy} onClick={() => void load()}>Reload</button></div>}{notice && <p className="message success" role="status">{notice}</p>}
      {decision && <form className="panel auth-form" onSubmit={save}><h2>{decision.title}</h2>{!decision.status && <p>This cancels registrations, invalidates tickets, and queues applicable full sandbox refunds. Cancellation is permanent.</p>}<label>Reason<textarea name="reason" required maxLength={1000} rows={3} autoFocus disabled={busy} /></label><div className="form-footer"><button type="button" className="secondary" disabled={busy} onClick={() => setDecision(null)}>Back</button><button className="primary" disabled={busy}>{busy ? "Saving…" : "Confirm decision"}</button></div></form>}
      <div className="panel">{loading ? <p role="status">Loading records…</p> : rows.length === 0 ? <p>No records in this section.</p> : <ul className="team-list">{rows.map(row => <li key={row.id}><div className="member-name"><strong>{row.name || row.title || row.action || "Event report"}</strong><small>ID: {row.id}</small>{row.organizer_id && <small>Workspace: {row.organizer_id}</small>}{row.event_id && <small>Event: {row.event_id}</small>}{row.reason && <p>{row.reason}</p>}{row.resolution && <p>Review: {row.resolution}</p>}{row.created_at && <small>{new Date(row.created_at).toLocaleString()} · Actor: {row.actor_id}</small>}</div>{row.status && <span className="badge neutral">{row.status}</span>}
        {section === "workspaces" && <div><button className="secondary" disabled={busy || row.status === "approved"} onClick={() => setDecision({ path: `workspaces/${row.id}`, title: row.status === "suspended" ? `Reapprove ${row.name}?` : `Approve ${row.name}?`, status: "approved" })}>{row.status === "suspended" ? "Reapprove" : "Approve"}</button><button className="text-button danger-text" disabled={busy || row.status === "suspended"} onClick={() => setDecision({ path: `workspaces/${row.id}`, title: `Suspend ${row.name}?`, status: "suspended" })}>Suspend</button></div>}
        {section === "events" && <div>{row.slug && <Link className="text-button" href={`/events/${row.slug}`}>View public page</Link>}<button className="text-button danger-text" disabled={busy || row.status === "cancelled"} onClick={() => setDecision({ path: `events/${row.id}/cancel`, title: `Cancel ${row.title || "event"}?` })}>Cancel event</button></div>}
        {section === "reports" && row.status === "open" && <div><button className="secondary" disabled={busy} onClick={() => setDecision({ path: `reports/${row.id}`, title: "Resolve this report?", status: "resolved" })}>Resolve</button><button className="text-button" disabled={busy} onClick={() => setDecision({ path: `reports/${row.id}`, title: "Dismiss this report?", status: "dismissed" })}>Dismiss</button></div>}
      </li>)}</ul>}</div><div className="form-footer"><button className="secondary" disabled={loading || busy || offset === 0} onClick={() => { setLoading(true); setDecision(null); setOffset(Math.max(0, offset - 100)); }}>Previous</button><button className="secondary" disabled={loading || busy || next === null} onClick={() => { if (next !== null) { setLoading(true); setDecision(null); setOffset(next); } }}>Next</button></div>
    </>}
  </section>;
}
