"use client";
import { useEffect, useState } from "react";
import { bookingFetch, money } from "@/lib/checkout";

type Refund = { id: string; booking_id: string; reference: string; amount_minor: number; status: "queued" | "pending" | "succeeded" | "failed"; reason: string };
export function WorkspaceRefunds({ workspaceId }: { workspaceId: string }) {
  const [rows, setRows] = useState<Refund[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let version = 0;
    async function refresh() {
      const current = ++version;
      try {
        const data = await bookingFetch<Refund[]>(`/api/v1/workspaces/${workspaceId}/refunds`, undefined, controller.signal);
        if (active && current === version) { setRows(data); setError(""); }
      } catch (cause) { if (active && current === version) setError(cause instanceof Error ? cause.message : "Unable to load refunds."); }
    }
    void refresh();
    const timer = setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    return () => { active = false; controller.abort(); clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [workspaceId, retry]);
  return <section className="panel" aria-labelledby="refund-heading"><h3 id="refund-heading">Recent sandbox refunds</h3><p>Cancellation and unavailable-reservation refunds. Completion is confirmed by Cashfree.</p>
    {error && <p className="message error" role="alert">{error}<button className="text-button" onClick={() => setRetry(value => value + 1)}>Refresh refunds</button></p>}
    {!rows && !error && <p role="status">Loading refunds…</p>}
    {rows?.length === 0 && <p>No refunds have been queued.</p>}
    {rows && rows.length > 0 && <ul className="team-list">{rows.map(row => <li key={row.id}><div className="member-name"><strong>{money(row.amount_minor)}</strong><small>{row.reason === "event_cancelled" ? "Event cancelled" : "Reservation unavailable"}</small><small>Reservation: {row.booking_id}</small><small>Refund: {row.reference}</small>{row.status === "failed" && <p role="status">Needs support review. No replacement refund has been sent.</p>}</div><span className={`badge ${row.status === "succeeded" ? "success" : row.status === "failed" ? "danger" : "pending"}`}>{row.status === "succeeded" ? "Confirmed" : row.status === "failed" ? "Needs attention" : row.status === "queued" ? "Queued" : "Processing"}</span></li>)}</ul>}
    {rows?.length === 100 && <p>The most recent 100 refunds are shown.</p>}
  </section>;
}
