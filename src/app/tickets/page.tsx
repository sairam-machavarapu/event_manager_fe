"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
type Ticket = { id: string; booking_id: string; event_title: string; event_slug: string; starts_at: string; timezone: string; venue: string | null; city: string | null; ticket_type: string; sequence: number; status: string; event_status: string; admitted_at: string | null };
export default function Tickets() {
  const router = useRouter();
  const [items, setItems] = useState<Ticket[]>([]);
  const [offset, setOffset] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [qr, setQr] = useState<{ id: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/v1/tickets?offset=${offset}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (response.status === 401) { router.replace("/login?next=/tickets"); return; }
      if (!response.ok) throw new Error("Unable to load tickets.");
      const data = await response.json(); setItems(data.items); setNext(data.next_offset); setLoaded(true); setError("");
    }).catch(error => { if (error.name !== "AbortError") setError(error.message); });
    return () => controller.abort();
  }, [router, offset, revision]);
  useEffect(() => () => { if (qr) URL.revokeObjectURL(qr.url); }, [qr]);
  async function showQr(id: string) {
    setBusy(true); setError(""); setQr(null);
    try {
      const response = await fetch(`/api/v1/tickets/${id}/qr`, { cache: "no-store" });
      if (!response.ok) { const data = await response.json(); throw new Error(data.detail || "Unable to load QR."); }
      setQr({ id, url: URL.createObjectURL(await response.blob()) });
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to load QR."); }
    finally { setBusy(false); }
  }
  return <section className="page-title dashboard-page"><span className="eyebrow">Your plans</span><h1>Your tickets.</h1><p className="intro">Show your QR at entry. Each ticket admits one person once.</p>
    {error && <div className="message error" role="alert">{error}<button className="text-button" onClick={() => setRevision(value => value + 1)}>Refresh</button></div>}
    {!loaded && !error && <p role="status">Loading tickets...</p>}
    {loaded && items.length === 0 && <div className="panel"><h2>A calendar with possibilities.</h2><Link href="/" className="primary">Explore events</Link></div>}
    <div className="admission-ticket-list">{items.map(ticket => <article className="panel" key={ticket.id}><h2><Link href={`/events/${ticket.event_slug}`}>{ticket.event_title}</Link></h2><p>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: ticket.timezone }).format(new Date(ticket.starts_at))} · {ticket.timezone}</p><p>{[ticket.venue, ticket.city].filter(Boolean).join(", ")}</p><p>{ticket.ticket_type} · Ticket {ticket.sequence}</p><span className="badge neutral">{ticket.status === "cancelled" || ticket.event_status === "cancelled" ? "Cancelled" : ticket.admitted_at ? "Admitted" : new Date(ticket.starts_at) < new Date() ? "Started / past" : "Upcoming"}</span><div className="form-footer"><Link href={`/orders/${ticket.booking_id}/confirmation`}>Registration receipt</Link>{ticket.status === "valid" && ticket.event_status === "published" && <a className="secondary" href={`/api/v1/bookings/${ticket.booking_id}/calendar`}>Add to calendar</a>}{ticket.status === "valid" && ticket.event_status === "published" && !ticket.admitted_at && <button className="primary" disabled={busy} onClick={() => void showQr(ticket.id)}>Show entry QR</button>}</div>{qr?.id === ticket.id && <div className="entry-qr"><Image unoptimized src={qr.url} width={260} height={260} alt={`Entry QR for ${ticket.event_title}, ticket ${ticket.sequence}`} /><p>Keep this QR private. Share only with the person using this ticket.</p><button className="secondary" onClick={() => setQr(null)}>Hide QR</button></div>}</article>)}</div>
    <div className="form-footer">{offset > 0 && <button className="secondary" onClick={() => { setQr(null); setOffset(Math.max(0, offset - 50)); }}>Previous</button>}{next !== null && <button className="secondary" onClick={() => { setQr(null); setOffset(next); }}>Next tickets</button>}</div>
  </section>;
}

