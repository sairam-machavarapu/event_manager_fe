"use client";
import { useEffect, useRef, useState } from "react";
import { bookingFetch } from "@/lib/checkout";

type Delivery = { id: string; booking_id: string | null; topic: string; status: "scheduled" | "retrying" | "delivered" | "skipped" | "failed"; attempts: number; available_at: string; last_error_code: string | null };
const topics: Record<string, string> = { registration: "Registration confirmation", cancellation: "Event cancellation", refund: "Refund confirmation", reminder_24h: "24-hour reminder", reminder_1h: "1-hour reminder" };
export function WorkspaceNotifications({ workspaceId, suspended }: { workspaceId: string; suspended: boolean }) {
  const [rows, setRows] = useState<Delivery[] | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState("");
  const operation = useRef(false);
  const version = useRef(0);
  const path = `/api/v1/workspaces/${workspaceId}/notifications`;
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      if (operation.current) return;
      const current = ++version.current;
      try { const data = await bookingFetch<Delivery[]>(path, undefined, controller.signal); if (active && current === version.current && !operation.current) { setRows(data); setError(""); } }
      catch (cause) { if (active && current === version.current && !operation.current) setError(cause instanceof Error ? cause.message : "Unable to load notifications."); }
    }
    void load(); const timer = setInterval(load, 15_000);
    window.addEventListener("focus", load);
    return () => { active = false; controller.abort(); clearInterval(timer); window.removeEventListener("focus", load); };
  }, [path, refresh]);
  async function retry(id: string) {
    if (operation.current) return;
    operation.current = true; version.current += 1; setBusy(id); setError("");
    try { const row = await bookingFetch<Delivery>(`${path}/${id}/retry`, {}); setRows(previous => previous?.map(item => item.id === id ? row : item) ?? null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Retry interrupted. Refresh delivery status before trying again."); }
    finally { operation.current = false; setBusy(""); }
  }
  return <section className="panel" aria-labelledby="notifications-heading"><h3 id="notifications-heading">Email delivery</h3><p>Registration, cancellation, refund and event reminder emails. Delivered means accepted by the mail server.</p>
    {error && <p className="message error" role="alert">{error} <button className="text-button" disabled={!!busy} onClick={() => setRefresh(value => value + 1)}>Refresh status</button></p>}
    {!rows && !error && <p role="status">Loading notifications…</p>}
    {rows?.length === 0 && <p>No event notifications have been scheduled yet.</p>}
    {rows && rows.length > 0 && <ul className="team-list">{rows.map(row => <li key={row.id}><div className="member-name"><strong>{topics[row.topic] ?? "Event email"}</strong><small>Reservation: {row.booking_id ?? "Unavailable"}</small>{["scheduled", "retrying"].includes(row.status) && <small>{row.status === "retrying" ? "Next attempt" : "Scheduled"}: {new Date(row.available_at).toLocaleString()}</small>}<small>{row.attempts} delivery attempt(s)</small>{row.status === "failed" && <p>Delivery failed. Check mail service configuration before retrying.</p>}</div><span className={`badge ${row.status === "delivered" ? "success" : row.status === "failed" ? "danger" : "neutral"}`}>{row.status}</span>{row.status === "failed" && <button className="secondary" disabled={!!busy || suspended} onClick={() => retry(row.id)}>{busy === row.id ? "Queueing…" : "Retry email"}</button>}</li>)}</ul>}
    {rows?.length === 100 && <p>The most recent 100 notifications are shown.</p>}
  </section>;
}
