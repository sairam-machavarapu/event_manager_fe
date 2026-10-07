"use client";

import { useEffect, useState } from "react";
import { responseError, type TicketType } from "@/lib/event-draft";

export function TicketTypes({ path, suspended, onChange, onBusyChange }: { path: string; suspended: boolean; onChange?: (rows: TicketType[]) => void; onBusyChange?: (busy: boolean) => void }) {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [editing, setEditing] = useState<TicketType | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(path, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Unable to load ticket types.");
      const rows = await response.json(); setTickets(rows); setLoaded(true); onChange?.(rows);
    }).catch(error => { if (error.name !== "AbortError") setError(error.message); });
    return () => controller.abort();
  }, [path, revision, onChange]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const price = String(data.get("price"));
    if (!/^\d+(\.\d{1,2})?$/.test(price)) { setError("Enter an INR price with up to two decimal places."); return; }
    const [rupees, paise = ""] = price.split(".");
    const body = { name: data.get("name"), price_minor: Number(rupees) * 100 + Number(paise.padEnd(2, "0")), currency: "INR", capacity: Number(data.get("capacity")), sales_start: data.get("sales_start") || null, sales_end: data.get("sales_end") || null, per_order_limit: Number(data.get("per_order_limit")) };
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(editing ? `${path}/${editing.id}` : path, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", "X-Gather-Request": "1" }, body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error(await responseError(response, "Unable to save ticket type. Please try again."));
      }
      setEditing(null); form.reset(); setRevision(value => value + 1); setNotice("Ticket type saved.");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save ticket type."); }
    finally { setBusy(false); }
  }
  return <div className="panel">
    <h3>Ticket types</h3>
    <p className="field-help">Set a price of 0 for free admission. Capacity is the number of tickets available for this type.</p>
    {error && <p role="alert" className="message error">{error}<button type="button" className="text-button" onClick={() => { setError(""); setRevision(value => value + 1); }}>Try again</button></p>}
    {notice && <p role="status" className="message success">{notice}</p>}
    {!loaded && !error && <p role="status">Loading ticket types...</p>}
    {loaded && tickets.length === 0 && <p>No ticket types yet.</p>}
    <ul className="team-list">{tickets.map(ticket => <li key={ticket.id}>
      <div className="member-name"><strong>{ticket.name}</strong><small>{ticket.price_minor === 0 ? "Free" : `INR ${(ticket.price_minor / 100).toFixed(2)}`} · {ticket.capacity} tickets</small></div>
      <button type="button" className="secondary" disabled={busy || suspended} onClick={() => { setEditing(ticket); setError(""); setNotice(""); }}>Edit ticket type</button>
    </li>)}</ul>
    <form className="auth-form" onSubmit={save} key={editing?.id ?? "new"}>
      <h4>{editing ? "Edit ticket type" : "Add ticket type"}</h4>
      <fieldset disabled={busy || suspended}>
        <label>Ticket name<input name="name" required maxLength={120} defaultValue={editing?.name ?? ""} /></label>
        <label>Price (INR)<input name="price" type="number" required min="0" max="1000000" step="0.01" defaultValue={editing ? (editing.price_minor / 100).toFixed(2) : "0"} /></label>
        <label>Capacity<input name="capacity" type="number" required min="0" max="2147483647" step="1" defaultValue={editing?.capacity ?? 0} /></label>
        <label>Maximum tickets per order<input name="per_order_limit" type="number" required min="1" max="1000" step="1" defaultValue={editing?.per_order_limit ?? 10} /></label>
        <label>Sales start<input name="sales_start" defaultValue={editing?.sales_start ?? ""} placeholder="2026-12-01T09:00:00+05:30" /></label>
        <label>Sales end<input name="sales_end" defaultValue={editing?.sales_end ?? ""} placeholder="2026-12-01T17:00:00+05:30" /></label>
        <p className="field-help">Dates are optional. Include a UTC offset when setting them; sales end must follow sales start.</p>
      </fieldset>
      <div className="form-footer">{editing && <button type="button" className="secondary" disabled={busy} onClick={() => setEditing(null)}>Cancel edit</button>}<button className="primary" disabled={busy || suspended}>{busy ? "Saving..." : "Save ticket type"}</button></div>
    </form>
  </div>;
}
