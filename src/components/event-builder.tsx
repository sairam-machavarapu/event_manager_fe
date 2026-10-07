"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Autosave, type SaveStatus } from "@/lib/autosave";
import { changedFields, draftPayload, formValues, responseError, type Draft, type DraftPayload, type Media, type TicketType } from "@/lib/event-draft";
import { TicketTypes } from "./ticket-types";
import { EventMedia } from "./event-media";
import { EventPreview } from "./event-preview";

type Readiness = { ready: boolean; event_revision: number; issues: { field: string; message: string }[] };
const steps = ["The idea", "When & where", "Tickets", "Poster & gallery", "Review & publish"];
const headers = { "Content-Type": "application/json", "X-Gather-Request": "1" };

export function EventBuilder({ initial, path, workspaceName, workspaceStatus, canPublish, onSaved, onClose, onReload, onLockChange }: {
  initial: Draft; path: string; workspaceName: string; workspaceStatus: string; canPublish: boolean;
  onSaved: (draft: Draft) => void; onClose: () => void; onReload: (draft: Draft) => void; onLockChange: (locked: boolean) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [form, setForm] = useState(() => formValues(initial));
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [ticketBusy, setTicketBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [readinessError, setReadinessError] = useState("");
  const [inspection, setInspection] = useState(0);
  const persisted = useRef(draftPayload(formValues(initial)));
  const version = useRef(initial.revision);
  const queue = useRef<Autosave<DraftPayload> | null>(null);
  const mounted = useRef(false);
  const readonly = workspaceStatus === "suspended" || draft.status !== "draft";
  let validation = "";
  try { draftPayload(form); } catch (error) { validation = error instanceof Error ? error.message : "Check the event details."; }
  const dirty = Boolean(validation) || status !== "saved";
  const locked = dirty || busy || ticketBusy || mediaBusy;

  useEffect(() => {
    mounted.current = true;
    queue.current = new Autosave<DraftPayload>(async (snapshot, signal) => {
      const changes = changedFields(snapshot, persisted.current);
      if (!Object.keys(changes).length) return;
      const response = await fetch(path, { method: "PATCH", signal, headers: { ...headers, "If-Match": `"${version.current}"` }, body: JSON.stringify(changes) });
      if (!response.ok) {
        if (response.status === 412 && mounted.current) setConflict(true);
        throw new Error(await responseError(response, "Unable to save your changes."));
      }
      const result: Draft = await response.json();
      persisted.current = draftPayload(formValues(result)); version.current = result.revision;
      if (mounted.current) { setDraft(result); onSaved(result); }
    }, (next, error) => {
      if (!mounted.current) return;
      setStatus(next); setError(error?.message ?? "");
    });
    return () => { mounted.current = false; queue.current?.dispose(); queue.current = null; };
  }, [path, onSaved]);

  useEffect(() => {
    if (readonly || conflict) return;
    try {
      const next = draftPayload(form);
      queue.current?.schedule(next);
    } catch { /* Incomplete dates/URLs remain in the form until valid. */ }
  }, [form, readonly, conflict]);

  useEffect(() => {
    onLockChange(locked);
    return () => onLockChange(false);
  }, [locked, onLockChange]);

  useEffect(() => {
    if (!dirty) return;
    function unload(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    function navigate(event: MouseEvent) {
      const link = (event.target as Element)?.closest?.("a[href]");
      if (!link || link.getAttribute("href")?.startsWith("#") || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); event.stopPropagation(); setError("Save your latest changes or close the editor before leaving.");
    }
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty]);

  const ticketsChanged = useCallback((rows: TicketType[]) => { setTickets(rows); setReadiness(null); }, []);
  const mediaChanged = useCallback((rows: Media[]) => { setMedia(rows); setReadiness(null); }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${path}/publication`, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(await responseError(response, "Unable to check publication readiness."));
      const result = await response.json();
      setReadiness(result); setReadinessError("");
    }).catch(error => { if (!controller.signal.aborted) setReadinessError(error.message); });
    return () => controller.abort();
  }, [path, draft.revision, tickets, media, inspection]);

  async function saveNow() {
    if (validation || conflict) return;
    try { await queue.current?.retry(); } catch { /* Queue displays its save error. */ }
  }
  async function close(discard = false) {
    if (discard) { await queue.current?.discard(); onClose(); return; }
    if (validation || conflict) { setError("Save or discard the latest edits before closing."); return; }
    try { await queue.current?.retry(); onClose(); } catch {}
  }
  async function reload() {
    setBusy(true);
    try {
      await queue.current?.discard();
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) throw new Error(await responseError(response, "Unable to reload draft."));
      onReload(await response.json());
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to reload draft."); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function publish() {
    if (validation || conflict || readonly || ticketBusy || mediaBusy) return;
    setBusy(true); setError("");
    try {
      await queue.current?.flush();
      const response = await fetch(`${path}/publish`, { method: "POST", headers: { ...headers, "If-Match": `"${version.current}"` } });
      if (!response.ok) { if (response.status === 412) setConflict(true); throw new Error(await responseError(response, "Unable to publish this event.")); }
      const result: Draft = await response.json();
      version.current = result.revision; setDraft(result); onSaved(result);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to publish this event."); setInspection(value => value + 1); }
    finally { if (mounted.current) setBusy(false); }
  }
  function field(name: keyof typeof form, value: string) { setStatus("waiting"); setForm(previous => ({ ...previous, [name]: value })); }
  const canSubmit = readiness?.ready && readiness.event_revision === draft.revision && canPublish && !locked && !readonly && !conflict;
  const issueStep = (field: string) => ["starts_at", "ends_at", "city", "venue", "online_url"].includes(field) ? 1 : field === "tickets" ? 2 : field === "cover image" ? 3 : 0;
  return <div className="event-builder"><div className="builder-header"><div><span className={`badge ${draft.status === "published" ? "success" : "neutral"}`}>{draft.status}</span><h3>{draft.title || "Untitled event"}</h3></div><div className="builder-save"><span role="status" aria-live="polite">{validation ? "Changes not saved" : status === "saving" ? "Saving…" : status === "waiting" ? "Waiting to save…" : status === "error" ? "Changes not saved" : "Draft saved"}</span><button type="button" className="secondary" disabled={busy || ticketBusy || mediaBusy} onClick={() => close()}>Close editor</button></div></div>
    {(validation || error) && <div className="message error" role="alert">{validation || error}{status === "error" && !conflict && !validation && <button type="button" className="text-button" onClick={saveNow}>Retry save</button>}{conflict && <button type="button" className="text-button" disabled={busy} onClick={reload}>Reload latest draft (discard edits)</button>}</div>}
    <div className="builder-layout"><div className="builder-controls"><nav className="builder-steps" aria-label="Event creation steps">{steps.map((label, index) => <button type="button" key={label} aria-current={step === index ? "step" : undefined} className={step === index ? "selected" : ""} onClick={() => setStep(index)}><span>{index + 1}</span>{label}</button>)}</nav>
      <div className="builder-step" hidden={step !== 0}><h4>Start with the idea</h4><p className="muted">Help people imagine being there. You can leave details unfinished while drafting.</p><fieldset className="auth-form" disabled={readonly || busy || conflict}>
        <label>Event title<input name="title" value={form.title} maxLength={200} onChange={event => field("title", event.target.value)} placeholder="Give your gathering a name" /></label>
        <label>Category<select name="category" value={form.category} onChange={event => field("category", event.target.value)}><option value="">Choose a category</option>{["Music", "Workshops", "Community", "Talks", "Food & drink", "Outdoors", "Other"].map(category => <option key={category}>{category}</option>)}</select></label>
        <label>About the event<textarea name="description" rows={7} maxLength={20000} value={form.description} onChange={event => field("description", event.target.value)} placeholder="What will people experience? Who is it for?" /></label>
      </fieldset></div>
      <div className="builder-step" hidden={step !== 1}><h4>When and where</h4><fieldset className="auth-form" disabled={readonly || busy || conflict}>
        <label>Event format<select name="format" value={form.format} onChange={event => field("format", event.target.value)}><option value="in_person">In person</option><option value="online">Online</option></select></label>
        <label>Event timezone<input name="timezone" value={form.timezone} maxLength={64} onChange={event => field("timezone", event.target.value)} /></label>
        <p className="field-help">Use a named timezone such as Asia/Kolkata. Include the UTC offset in dates, for example 2026-12-01T18:00:00+05:30.</p>
        <label>Starts<input name="starts_at" aria-describedby="event-date-help" value={form.starts_at} onChange={event => field("starts_at", event.target.value)} placeholder="2026-12-01T18:00:00+05:30" /></label>
        <label>Ends<input name="ends_at" aria-describedby="event-date-help" value={form.ends_at} onChange={event => field("ends_at", event.target.value)} placeholder="2026-12-01T20:00:00+05:30" /></label>
        <p id="event-date-help" className="field-help">Include the UTC offset for the event date. For India, use +05:30: 2026-12-01T18:00:00+05:30. For UTC, use Z. The end must follow the start.</p>
        {form.format === "in_person" ? <><label>Venue<input name="venue" value={form.venue} maxLength={300} onChange={event => field("venue", event.target.value)} /></label><label>City<input name="city" value={form.city} maxLength={120} onChange={event => field("city", event.target.value)} /></label></> : <label>Online event link<input name="online_url" type="url" value={form.online_url} onChange={event => field("online_url", event.target.value)} /></label>}
      </fieldset></div>
      <div className="builder-step" hidden={step !== 2}><TicketTypes path={`${path}/ticket-types`} suspended={readonly || busy || conflict} onChange={ticketsChanged} onBusyChange={setTicketBusy} /></div>
      <div className="builder-step" hidden={step !== 3}><EventMedia path={`${path}/media`} disabled={readonly || busy || conflict} onChange={mediaChanged} onBusyChange={setMediaBusy} /><fieldset className="auth-form" disabled={readonly || busy || conflict}><label>Or use a hosted cover image<input name="cover_url" type="url" value={form.cover_url} onChange={event => field("cover_url", event.target.value)} placeholder="https://…" /></label><p className="field-help">Use an HTTPS image URL you have permission to display. A ready uploaded poster also satisfies this step.</p></fieldset></div>
      <div className="builder-step" hidden={step !== 4}><h4>Review and publish</h4>{draft.status === "published" ? <div className="message success" role="status">Your event is published. Its details are now locked.</div> : draft.status === "cancelled" ? <p>This event is cancelled. {draft.cancellation_reason}</p> : <>
        <p>Check the preview and complete the remaining items below.</p>{workspaceStatus === "pending" && <p className="info-note">Your workspace is pending approval. You can finish the draft; publication becomes available after approval.</p>}{!canPublish && <p className="info-note">An owner of this workspace must publish the event.</p>}
        {readinessError ? <p className="message error" role="alert">{readinessError}<button type="button" className="text-button" onClick={() => setInspection(value => value + 1)}>Check again</button></p> : !readiness || readiness.event_revision !== draft.revision ? <p role="status">Checking publication readiness…</p> : readiness.issues.length ? <ul className="publication-checklist">{readiness.issues.map(issue => <li key={issue.field}>{["role", "workspace", "status"].includes(issue.field) ? issue.message : <button type="button" className="text-button" onClick={() => setStep(issueStep(issue.field))}>{issue.message} →</button>}</li>)}</ul> : <p className="message success">All publication requirements are complete.</p>}
        <button type="button" className="primary" disabled={!canSubmit} onClick={publish}>{busy ? "Publishing…" : "Publish event"}</button><p className="field-help">Publishing makes this draft final. Review your dates, location, ticket capacity and images first.</p>
      </>}</div>
      <div className="builder-footer"><button type="button" className="secondary" disabled={step === 0} onClick={() => setStep(value => value - 1)}>Back</button><button type="button" className="secondary" disabled={readonly || busy || conflict || Boolean(validation)} onClick={saveNow}>Save now</button>{step < 4 && <button type="button" className="primary" onClick={() => setStep(value => value + 1)}>Continue</button>}</div>
      {dirty && <button type="button" className="text-button" disabled={busy || status === "saving" || ticketBusy || mediaBusy} onClick={() => close(true)}>Close without saving latest edits</button>}
    </div><EventPreview form={form} media={media} tickets={tickets} workspaceName={workspaceName} /></div>
  </div>;
}
