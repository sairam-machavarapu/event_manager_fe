"use client";

import { useCallback, useEffect, useState } from "react";
import { responseError, type Draft } from "@/lib/event-draft";
import { EventBuilder } from "./event-builder";

const headers = { "Content-Type": "application/json", "X-Gather-Request": "1" };

export function EventDrafts({ workspaceId, workspaceName, workspaceStatus, canPublish, onLockChange }: {
  workspaceId: string; workspaceName: string; workspaceStatus: string; canPublish: boolean; onLockChange: (locked: boolean) => void;
}) {
  const [events, setEvents] = useState<Draft[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [session, setSession] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [cancelling, setCancelling] = useState<Draft | null>(null);
  const path = `/api/v1/workspaces/${workspaceId}/events`;
  const suspended = workspaceStatus === "suspended";
  useEffect(() => {
    const controller = new AbortController();
    fetch(path, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(await responseError(response, "Unable to load your events."));
      setEvents(await response.json()); setLoaded(true);
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [path, revision]);
  const saved = useCallback((draft: Draft) => {
    setEvents(previous => previous.map(item => item.id === draft.id ? draft : item));
  }, []);
  function close() { setEditing(null); setRevision(value => value + 1); onLockChange(false); }
  function reload(draft: Draft) { saved(draft); setEditing(draft); setSession(value => value + 1); }
  async function open(id?: string) {
    setBusy(true); setError(""); setNotice(""); onLockChange(true);
    try {
      const response = await fetch(id ? `${path}/${id}` : path, id ? { cache: "no-store" } : { method: "POST", headers, body: "{}" });
      if (!response.ok) throw new Error(await responseError(response, "Unable to open the event editor."));
      const draft: Draft = await response.json();
      if (!id) setEvents(previous => [draft, ...previous]);
      setEditing(draft); setSession(value => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to open the event editor."); }
    finally { setBusy(false); onLockChange(false); }
  }
  async function cancel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = new FormData(event.currentTarget).get("reason");
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${path}/${cancelling?.id}/cancel`, { method: "POST", headers, body: JSON.stringify({ reason }) });
      if (!response.ok) throw new Error(await responseError(response, "Unable to cancel this event."));
      setCancelling(null); setNotice("Event cancelled."); setRevision(value => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to cancel this event."); }
    finally { setBusy(false); }
  }
  return <div className="panel event-workspace"><div className="panel-heading"><h3>Your events</h3><p>Build an idea into a gathering, one step at a time.</p></div>
    {error && <div className="message error" role="alert">{error}<button type="button" className="text-button" disabled={busy} onClick={() => { setError(""); setRevision(value => value + 1); }}>Try again</button></div>}{notice && <p role="status" className="message success">{notice}</p>}
    {editing ? <EventBuilder key={`${editing.id}:${session}`} initial={editing} path={`${path}/${editing.id}`} workspaceName={workspaceName} workspaceStatus={workspaceStatus} canPublish={canPublish} onSaved={saved} onClose={close} onReload={reload} onLockChange={onLockChange} /> : <>
      {!loaded && !error && <p role="status">Loading events…</p>}
      {loaded && events.length === 0 && <p>No events yet. Start with an idea and fill in the details as you go.</p>}
      <ul className="team-list">{events.map(event => <li key={event.id}><div className="member-name"><strong>{event.title || "Untitled event"}</strong><small>{event.city || event.timezone}{event.cancellation_reason && ` · ${event.cancellation_reason}`}</small></div><span className={`badge ${event.status === "published" ? "success" : "neutral"}`}>{event.status}</span><button type="button" className="secondary" disabled={busy} onClick={() => open(event.id)}>{event.status === "draft" ? "Continue draft" : "View event"}</button>{canPublish && event.status !== "cancelled" && <button type="button" className="text-button danger-text" disabled={busy || suspended} onClick={() => setCancelling(event)}>Cancel event</button>}</li>)}</ul>
      <button type="button" className="primary" disabled={busy || suspended} onClick={() => open()}>{busy ? "Opening editor…" : "Create an event"}</button>
      {cancelling && <form className="auth-form cancellation-form" onSubmit={cancel}><h3>Cancel {cancelling.title || "this event"}?</h3><p>This ends registration and invalidates issued tickets. Full refunds for confirmed sandbox payments will be queued. Refund completion is confirmed separately. Cancellation cannot be undone.</p><label>Cancellation reason<textarea name="reason" required maxLength={1000} disabled={busy} /></label><div className="form-footer"><button type="button" className="secondary" disabled={busy} onClick={() => setCancelling(null)}>Keep event</button><button className="danger-button" disabled={busy || suspended}>Confirm cancellation</button></div></form>}
    </>}
  </div>;
}
