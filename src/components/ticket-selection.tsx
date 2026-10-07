"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { bookingFetch, CheckoutError, money, selectionKey, type Availability, type Booking, type Selection } from "@/lib/checkout";

type TicketOption = { id: string; name: string; price_minor: number; per_order_limit: number };
export function TicketSelection({ eventId, slug, tickets, unavailable }: { eventId: string; slug: string; tickets: TicketOption[]; unavailable: boolean }) {
  const router = useRouter();
  const [payments, setPayments] = useState(false);
  useEffect(() => { let active = true; void bookingFetch<{ enabled: boolean }>("/api/v1/payments/config").then(data => { if (active) setPayments(data.enabled); }).catch(() => {}); return () => { active = false; }; }, []);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [retry, setRetry] = useState(0);
  const [locked, setLocked] = useState(false);
  const submitting = useRef(false);
  const attempt = useRef<{ selection: string; key: string } | null>(null);
  const storageKey = `gather-reservation:${eventId}`;
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
        if (active && saved && typeof saved.key === "string" && typeof saved.selection === "string") {
          const previous: Selection = JSON.parse(saved.selection);
          if (Array.isArray(previous) && previous.every(item => tickets.some(ticket => ticket.id === item.ticket_type_id) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 100)) {
            attempt.current = saved; setLocked(true); setQuantities(Object.fromEntries(previous.map(item => [item.ticket_type_id, item.quantity])));
            setNotice("An earlier reservation request may have completed. Retry this selection to recover its result.");
          }
        }
      } catch { /* Storage is optional. */ }
    });
    return () => { active = false; };
  }, [storageKey, tickets]);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function refresh() {
      try { const result = await bookingFetch<Availability>(`/api/v1/events/${encodeURIComponent(slug)}/availability`, undefined, controller.signal); if (active) { setAvailability(result); setStale(false); } }
      catch { if (active) setStale(true); }
    }
    void refresh(); const timer = setInterval(refresh, 10_000);
    window.addEventListener("focus", refresh);
    return () => { active = false; controller.abort(); clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [slug, retry]);
  const items: Selection = tickets.filter(ticket => (quantities[ticket.id] ?? 0) > 0).map(ticket => ({ ticket_type_id: ticket.id, quantity: quantities[ticket.id] }));
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = tickets.reduce((sum, ticket) => sum + ticket.price_minor * (quantities[ticket.id] ?? 0), 0);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current || !items.length || count > 100) return;
    submitting.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const account = await bookingFetch<{ verified: boolean }>("/api/v1/auth/me");
      if (!account.verified) { setNotice("Verify your email from your account, then return here to reserve tickets."); return; }
      const signature = selectionKey(items);
      if (!attempt.current) {
        try { const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null"); if (saved?.selection === signature && typeof saved.key === "string") attempt.current = saved; } catch { /* Storage can be unavailable. */ }
      }
      if (attempt.current && attempt.current.selection !== signature) throw new Error("Retry your previous selection first, or reload to start another selection.");
      attempt.current ??= { selection: signature, key: crypto.randomUUID() };
      setLocked(true);
      try { sessionStorage.setItem(storageKey, JSON.stringify(attempt.current)); } catch { /* In-memory retries retain the same key. */ }
      const booking = await bookingFetch<Booking>("/api/v1/bookings", { event_id: eventId, idempotency_key: attempt.current.key, items });
      try { sessionStorage.removeItem(storageKey); } catch { /* Navigation still works. */ }
      router.push(`/checkout/${booking.id}`);
    } catch (cause) {
      if (cause instanceof CheckoutError && cause.status === 401) router.push(`/login?next=${encodeURIComponent(`/events/${slug}`)}`);
      else {
        if (cause instanceof CheckoutError && [403, 404, 409, 422].includes(cause.status)) {
          attempt.current = null; setLocked(false);
          try { sessionStorage.removeItem(storageKey); } catch { /* Storage is optional. */ }
        }
        setError(cause instanceof Error ? cause.message : "Connection interrupted. Retry the same selection."); setRetry(value => value + 1);
      }
    } finally { submitting.current = false; setBusy(false); }
  }
  return <aside className="event-ticket-panel" aria-labelledby="ticket-heading"><h2 id="ticket-heading">Choose your tickets</h2><p>Tickets are held for up to ten minutes while you complete registration.</p>
    {unavailable && <p role="status">This event is not accepting registrations.</p>}
    {stale && <p className="message error" role="alert">Availability is unavailable. <button className="text-button" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
    {!availability && !stale && <p role="status">Checking availability…</p>}
    <form onSubmit={submit} aria-busy={busy}><fieldset disabled={busy || unavailable || stale || !availability || locked}>
      {tickets.map(ticket => { const stock = availability?.items.find(item => item.ticket_type_id === ticket.id); const max = Math.min(stock?.remaining ?? 0, ticket.per_order_limit, 100); return <div className="event-ticket" key={ticket.id}><h3>{ticket.name}</h3><strong>{money(ticket.price_minor)}</strong><p>{stock ? ({ open: `${stock.remaining} available`, upcoming: "Sales have not started", closed: "Sales have closed", sold_out: "Sold out", unavailable: "Unavailable" })[stock.sales_status] : "Checking availability"}</p><label>Quantity for {ticket.name}<input type="number" min={0} max={max} step={1} value={quantities[ticket.id] ?? 0} disabled={stock?.sales_status !== "open" || (ticket.price_minor > 0 && !payments)} onChange={event => setQuantities(previous => ({ ...previous, [ticket.id]: Math.max(0, Math.min(max, Math.floor(Number(event.target.value) || 0))) }))} /></label>{ticket.price_minor > 0 && <small>{payments ? "Sandbox payment: test transactions only." : "Paid booking will open when payments are available."}</small>}</div>; })}
    </fieldset>{!tickets.length && <p>No ticket options are listed.</p>}
    <p><strong>{count} ticket(s) · {money(total)}</strong></p>{count > 100 && <p role="alert">Choose at most 100 tickets per order.</p>}
    {error && <p className="message error" role="alert">{error}</p>}{notice && <p className="message" role="status">{notice} <Link href="/account">Your account</Link></p>}
    <button className="primary" disabled={busy || (!locked && (unavailable || stale || !availability)) || !count || count > 100}>{busy ? "Reserving…" : locked ? "Recover reservation" : "Continue to registration"}</button>
    </form></aside>;
}
