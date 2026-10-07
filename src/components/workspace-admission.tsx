"use client";
import { useEffect, useRef, useState } from "react";
type Event = { id: string; title: string; status: string };
type Attendee = { id: string; name: string; ticket_type: string; status: string; booking_status: string; admitted_at: string | null };
type Totals = { confirmed_bookings: number; valid_tickets: number; admitted: number; confirmed_revenue_minor: number; currency: string };
type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
export function WorkspaceAdmission({ workspaceId, owner, suspended }: { workspaceId: string; owner: boolean; suspended: boolean }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState("");
  const [rows, setRows] = useState<Attendee[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [offset, setOffset] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [eventRetry, setEventRetry] = useState(0);
  const [camera, setCamera] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const scanning = useRef(false);
  const cameraGeneration = useRef(0);
  const path = `/api/v1/workspaces/${workspaceId}/events/${selected}`;
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/v1/workspaces/${workspaceId}/operations`, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Unable to load entry events.");
      const items = await response.json(); setEvents(items); setSelected(items[0]?.id ?? ""); setLoaded(true);
    }).catch(error => { if (error.name !== "AbortError") setError(error.message); });
    return () => controller.abort();
  }, [workspaceId, eventRetry]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    let active = true;
    let version = 0;
    const load = async () => {
      const current = ++version;
      try {
        const response = await fetch(`${path}/attendees?offset=${offset}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load attendees.");
        const data = await response.json();
        let summary: Totals | null = null;
        if (owner) { const response = await fetch(`${path}/totals`, { cache: "no-store", signal: controller.signal }); if (!response.ok) throw new Error("Unable to load totals."); summary = await response.json(); }
        if (active && current === version) { setRows(data.items); setNext(data.next_offset); setTotals(summary); }
      } catch (error) { if (active && current === version && error instanceof Error && error.name !== "AbortError") setError(error.message); }
    };
    void load(); const timer = setInterval(() => void load(), 15000);
    return () => { active = false; controller.abort(); clearInterval(timer); };
  }, [path, selected, offset, owner, revision]);
  function stopCamera() { cameraGeneration.current++; scanning.current = false; stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; setCamera(false); }
  useEffect(() => () => { cameraGeneration.current++; scanning.current = false; stream.current?.getTracks().forEach(track => track.stop()); }, []);
  async function admit(body: { qr: string } | { ticket_id: string }) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${path}/check-in`, { method: "POST", headers: { "Content-Type": "application/json", "X-Gather-Request": "1" }, body: JSON.stringify(body) });
      const result = await response.json(); if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Check the ticket and try again.");
      setNotice(result.status === "admitted" ? "Admitted. Entry recorded." : "Already admitted. Do not admit again."); setRevision(value => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : "Admission failed."); }
    finally { setBusy(false); }
  }
  async function startCamera() {
    setError("");
    const Constructor = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => Detector }).BarcodeDetector;
    if (!Constructor || !navigator.mediaDevices) { setError("Camera QR scanning is unavailable in this browser. Use a USB scanner, paste a QR credential, or admit from the attendee table."); return; }
    try {
      const generation = ++cameraGeneration.current;
      setCamera(true);
      const acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (cameraGeneration.current !== generation) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream.current = acquired; scanning.current = true;
      const detector = new Constructor({ formats: ["qr_code"] });
      const scan = async () => {
        if (!scanning.current) return;
        try { if (video.current) { if (!video.current.srcObject) { video.current.srcObject = stream.current; await video.current.play(); } const found = await detector.detect(video.current); if (found.length) { stopCamera(); await admit({ qr: found[0].rawValue }); return; } } }
        catch { stopCamera(); setError("Camera scan failed. Use manual admission or a scanner."); return; }
        if (scanning.current) setTimeout(() => void scan(), 300);
      };
      void scan();
    } catch { stopCamera(); setError("Camera access failed. Check browser permission or use manual admission."); }
  }
  return <section className="panel admission-panel"><div className="panel-heading"><h3>Entry and attendees</h3><p>Scan each ticket once, or find the attendee and admit manually.</p></div>
    {error && <div className="message error" role="alert">{error}<button className="text-button" onClick={() => { setError(""); if (!loaded) setEventRetry(value => value + 1); setRevision(value => value + 1); }}>Refresh</button></div>}{notice && <div className="message success" role="status">{notice}</div>}
    {!loaded && !error && <p role="status">Loading events...</p>}{loaded && events.length === 0 && <p>No events yet.</p>}
    {events.length > 0 && <><label>Event<select value={selected} disabled={busy || camera} onChange={event => { stopCamera(); setSelected(event.target.value); setOffset(0); setRows([]); setTotals(null); setNotice(""); setError(""); }}>{events.map(event => <option key={event.id} value={event.id}>{event.title || "Untitled event"} · {event.status}</option>)}</select></label>
      {totals && owner && <p className="admission-totals">{totals.confirmed_bookings} confirmed registrations · {totals.valid_tickets} valid tickets · {totals.admitted} admitted · {new Intl.NumberFormat("en-IN", { style: "currency", currency: totals.currency }).format(totals.confirmed_revenue_minor / 100)} confirmed booking revenue</p>}
      <form className="auth-form" onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const qr = String(new FormData(form).get("qr") || "").trim(); stopCamera(); void admit({ qr }); form.reset(); }}><label>QR credential from scanner<input name="qr" required maxLength={120} placeholder="Scan or paste gather:…" disabled={busy || suspended || camera} autoComplete="off" /></label><div className="form-footer"><button className="primary" disabled={busy || suspended || camera}>Check ticket</button><button type="button" className="secondary" disabled={busy || suspended} onClick={() => camera ? stopCamera() : void startCamera()}>{camera ? "Stop camera" : "Scan with camera"}</button></div></form>
      {camera && <video ref={video} muted playsInline className="admission-camera" aria-label="QR scanner camera" />}
      <div className="form-footer"><button className="secondary" onClick={() => setRevision(value => value + 1)}>Refresh attendees</button>{owner && <a className="secondary" href={`${path}/attendees.csv`}>Download attendee CSV</a>}</div>
      <div className="admission-table-wrap"><table><caption>Attendee tickets</caption><thead><tr><th scope="col">Attendee</th><th scope="col">Ticket</th><th scope="col">Status</th><th scope="col">Entry</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.ticket_type}<small>{row.id}</small></td><td>{row.status === "cancelled" || row.booking_status !== "confirmed" ? "Unavailable" : row.admitted_at ? "Admitted" : "Not admitted"}</td><td>{row.admitted_at ? <time dateTime={row.admitted_at}>{new Date(row.admitted_at).toLocaleString()}</time> : <button className="secondary" disabled={busy || suspended || row.status !== "valid" || row.booking_status !== "confirmed"} onClick={() => void admit({ ticket_id: row.id })}>Admit {row.name}</button>}</td></tr>)}</tbody></table></div>{rows.length === 0 && <p>No tickets on this page.</p>}
      <div className="form-footer">{offset > 0 && <button className="secondary" onClick={() => setOffset(Math.max(0, offset - 100))}>Previous</button>}{next !== null && <button className="secondary" onClick={() => setOffset(next)}>Next attendees</button>}</div>
    </>}
  </section>;
}
