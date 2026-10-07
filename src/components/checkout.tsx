"use client";
import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { bookingFetch, CheckoutError, money, remainingSeconds, type Booking } from "@/lib/checkout";

export function Checkout({ bookingId, receipt = false }: { bookingId: string; receipt?: boolean }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [sdkReady, setSdkReady] = useState(false);
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  useEffect(() => { let active = true; void bookingFetch<{ enabled: boolean }>("/api/v1/payments/config").then(data => { if (active) setPaymentEnabled(data.enabled); }).catch(() => {}); return () => { active = false; }; }, []);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [account, setAccount] = useState<{ display_name: string; email: string; verified: boolean } | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState(0);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [retry, setRetry] = useState(0);
  const operation = useRef(false);
  const revision = useRef(0);
  const clock = useRef<{ booking: Booking; server: number; received: number } | null>(null);
  const path = `/api/v1/bookings/${encodeURIComponent(bookingId)}`;
  const returnPath = receipt ? `/orders/${bookingId}/confirmation` : `/checkout/${bookingId}`;
  function accept(data: Booking) {
    clock.current = { booking: data, server: Date.parse(data.server_time), received: performance.now() };
    setBooking(data); setSeconds(remainingSeconds(data, Date.parse(data.server_time), 0)); setStale(false);
  }
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function refresh() {
      if (operation.current) return;
      const version = ++revision.current;
      try {
        const [data, user] = await Promise.all([bookingFetch<Booking>(path, undefined, controller.signal), bookingFetch<{ display_name: string; email: string; verified: boolean }>("/api/v1/auth/me", undefined, controller.signal)]);
        if (active && !operation.current && version === revision.current) {
          clock.current = { booking: data, server: Date.parse(data.server_time), received: performance.now() };
          setBooking(data); setAccount(user); setSeconds(remainingSeconds(data, Date.parse(data.server_time), 0)); setStale(false); setError(""); setStatus(0);
          if (data.status === "confirmed" && !receipt) router.replace(`/orders/${data.id}/confirmation`);
        }
      } catch (cause) { if (active && !operation.current && version === revision.current) { setStale(true); setError(cause instanceof Error ? cause.message : "Unable to refresh registration."); setStatus(cause instanceof CheckoutError ? cause.status : 0); } }
    }
    void refresh(); const poll = setInterval(refresh, 5_000);
    const tick = setInterval(() => { const sample = clock.current; if (sample) setSeconds(remainingSeconds(sample.booking, sample.server, performance.now() - sample.received)); }, 1000);
    window.addEventListener("focus", refresh);
    return () => { active = false; controller.abort(); clearInterval(poll); clearInterval(tick); window.removeEventListener("focus", refresh); };
  }, [path, receipt, retry, router]);
  async function pay() {
    if (operation.current) return;
    revision.current += 1; operation.current = true; setBusy(true); setError("");
    try {
      const data = await bookingFetch<{ payment_session_id: string }>(`${path}/payment`, { phone });
      const sdk = (window as Window & { Cashfree?: (options: { mode: string }) => { checkout: (options: { paymentSessionId: string; redirectTarget: string }) => Promise<unknown> } }).Cashfree;
      if (!sdk) throw new Error("Payment checkout could not load. Refresh and try again.");
      await sdk({ mode: "sandbox" }).checkout({ paymentSessionId: data.payment_session_id, redirectTarget: "_self" });
    } catch (cause) { setStale(true); setError(cause instanceof Error ? cause.message : "Payment interrupted. Check payment status before retrying."); }
    finally { operation.current = false; setBusy(false); }
  }
  async function mutate(action: "release" | "confirm-free" | "payment-status" | "refund-status") {
    if (operation.current) return;
    revision.current += 1;
    operation.current = true; setBusy(true); setError("");
    try {
      const data = await bookingFetch<Booking>(`${path}/${action}`, {});
      accept(data); setStatus(0);
      if (data.status === "confirmed") router.replace(`/orders/${data.id}/confirmation`);
    } catch (cause) { setStale(true); setError(cause instanceof Error ? cause.message : "Connection interrupted. Refresh to check your registration before retrying."); setStatus(cause instanceof CheckoutError ? cause.status : 0); }
    finally { operation.current = false; setBusy(false); }
  }
  const count = booking?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const expired = booking?.status === "expired" || (booking?.status === "pending" && seconds === 0);
  return <section className="checkout-page">{paymentEnabled && <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" onReady={() => setSdkReady(true)} onError={() => setError("Payment checkout could not load. Try refreshing this page.")} />}<span className="eyebrow">Your Gather registration</span><h1>{booking?.status === "confirmed" ? "Youâ€™re on the list." : receipt ? "Registration status" : "Complete your registration"}</h1>
    {error && <div className="message error" role="alert"><p>{status === 404 ? "This reservation was not found or belongs to another account." : error}</p>{status === 401 ? <Link className="primary" href={`/login?next=${encodeURIComponent(returnPath)}`}>Sign in to continue</Link> : <button className="secondary" onClick={() => setRetry(value => value + 1)} disabled={busy}>Refresh status</button>}</div>}
    {!booking && !error && <p role="status">Loading your registrationâ€¦</p>}
    {booking && <div className="checkout-columns"><div className="panel"><h2>{booking.event_title}</h2><Link className="text-button" href={`/events/${encodeURIComponent(booking.event_slug)}`}>View event details</Link>
      {account && <section><h3>Registered account</h3><p>{account.display_name}<br />{account.email}</p><p>All selected tickets will belong to this account.</p>{!account.verified && <p className="message">Verify your email before confirming. <Link href="/account">Open your account</Link></p>}</section>}
      <section><h3>Your selection</h3>{booking.items.map(item => <p key={item.ticket_type_id}>{item.name}: {item.quantity} Ã— {money(item.unit_price_minor)} <strong>{money(item.quantity * item.unit_price_minor)}</strong></p>)}<p className="checkout-total">{count} ticket(s) Â· <strong>{money(booking.total_minor)}</strong></p></section>
      <small>Reservation reference: {booking.id}</small>
    </div><div className="panel checkout-actions">
      {stale && <p role="status">Status could not be refreshed. Check again before continuing.</p>}
      {booking.total_minor > 0 && booking.status !== "confirmed" && !booking.payment_review && !booking.refund && <button className="secondary" disabled={busy} onClick={() => mutate("payment-status")}>Check payment status</button>}
      {booking.refund ? <><h2>{booking.refund.status === "succeeded" ? "Refund confirmed" : booking.refund.status === "failed" ? "Refund needs attention" : "Refund in progress"}</h2><p>{money(booking.refund.amount_minor)} ? {booking.refund.status === "succeeded" ? "Cashfree confirmed your sandbox refund." : booking.refund.status === "failed" ? "Cashfree could not complete the refund. Contact the event organiser with the reference below." : "Your full sandbox refund is queued or processing. We will confirm completion separately."}</p><small>Refund reference: {booking.refund.reference}</small><p>Your reservation is no longer valid. Tickets cannot be used for admission.</p>{booking.refund.status !== "succeeded" && <button className="secondary" disabled={busy} onClick={() => mutate("refund-status")}>Check refund status</button>}</> : booking.payment_review ? <><h2>Payment needs review</h2><p>Your payment was received after this reservation became unavailable. Tickets have not been issued. Refund handling requires support review.</p></> : booking.status === "confirmed" ? <><span className="badge success">Confirmed</span><h2>Your registration is confirmed.</h2><p>{booking.ticket_ids.length} ticket record(s) have been issued. A confirmation email has been queued.</p><p>Your entry QR is available in My tickets. Keep this page as your registration receipt.</p><Link className="primary" href="/tickets">Open My tickets</Link><Link className="secondary" href="/">Discover more events</Link></> : booking.status === "cancelled" ? <><h2>Reservation cancelled</h2><p>This reservation no longer holds tickets.</p><Link className="primary" href={`/events/${encodeURIComponent(booking.event_slug)}`}>Return to the event</Link></> : expired ? <><h2>Your hold has expired</h2><p>The tickets have been released. Start a new selection to check current availability.</p><Link className="primary" href={`/events/${encodeURIComponent(booking.event_slug)}`}>Choose tickets again</Link></> : receipt ? <><h2>Registration is not confirmed</h2><Link className="primary" href={`/checkout/${booking.id}`}>Return to checkout</Link></> : <>
        <p className="hold-clock" aria-label="Time remaining">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p><p>Time remaining on your ticket hold. Leaving this page does not release it immediately.</p>
        {!booking.event_available && <p className="message error">This event is no longer accepting registrations. You can release your hold.</p>}
        {booking.total_minor > 0 ? <><p>Cashfree sandbox checkout uses test transactions only.</p>{paymentEnabled ? <><label>Mobile number for payment<input type="tel" autoComplete="tel-national" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} value={phone} onChange={event => setPhone(event.target.value)} /></label><button className="primary" disabled={busy || stale || !seconds || !booking.event_available || !account?.verified || !sdkReady || !/^[6-9][0-9]{9}$/.test(phone)} onClick={pay}>Pay {money(booking.total_minor)} in sandbox</button></> : <p>Sandbox payments are not configured yet.</p>}<p>After returning from payment, check status to confirm your registration.</p></> : <><p>Review your account and selection, then confirm your free registration.</p><button className="primary" disabled={busy || stale || !seconds || !booking.event_available || !account?.verified} onClick={() => mutate("confirm-free")}>{busy ? "Please waitâ€¦" : "Confirm free registration"}</button></>}
        <button className="secondary" disabled={busy || stale} onClick={() => mutate("release")}>Release tickets</button>
      </>}
    </div></div>}
  </section>;
}

