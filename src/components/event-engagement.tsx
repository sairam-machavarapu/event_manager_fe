"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, Bell } from "lucide-react";

type State = { saved: boolean; following: boolean; organizer_id: string; waitlists: { ticket_type_id: string; status: string }[] };
export function EventEngagement({ eventId, slug, tickets }: { eventId: string; slug: string; tickets: { id: string; name: string }[] }) {
  const [state, setState] = useState<State | null>(null);
  const [soldOut, setSoldOut] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/v1/engagement/events/${eventId}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (response.status === 401) { setSignedOut(true); return; }
      if (!response.ok) throw new Error("Unable to load your saved event preferences.");
      setState(await response.json()); setSignedOut(false);
    }).catch(error => { if (error.name !== "AbortError") setMessage(error.message); });
    const availability = () => fetch(`/api/v1/events/${encodeURIComponent(slug)}/availability`, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (response.ok) { const data = await response.json(); setSoldOut(data.items.filter((item: { sales_status: string }) => item.sales_status === "sold_out").map((item: { ticket_type_id: string }) => item.ticket_type_id)); }
    }).catch(() => {});
    void availability(); const timer = setInterval(() => void availability(), 30000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [eventId, slug, revision]);
  async function mutate(path: string, method: string, notice: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/engagement/${path}`, { method, headers: { "X-Gather-Request": "1" }, cache: "no-store" });
      if (response.status === 401) { setSignedOut(true); return; }
      if (!response.ok) { const data = await response.json(); throw new Error(typeof data.detail === "string" ? data.detail : "Unable to update your preferences."); }
      setMessage(notice); setRevision(value => value + 1);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update your preferences."); }
    finally { setBusy(false); }
  }
  return <section className="engagement-panel panel" aria-label="Save, follow and waitlist"><h2>Keep this moment close</h2>{signedOut ? <p><Link className="text-button" href={`/login?next=${encodeURIComponent(`/events/${slug}`)}`}>Sign in</Link> to save events, follow organisers, or join a waitlist.</p> : state ? <>
    <div className="engagement-actions"><button className="secondary" disabled={busy} aria-pressed={state.saved} onClick={() => void mutate(`events/${eventId}/save`, state.saved ? "DELETE" : "PUT", state.saved ? "Event removed from saved events." : "Event saved.")}><Bookmark size={17} aria-hidden />{state.saved ? "Saved event" : "Save event"}</button><button className="secondary" disabled={busy} aria-pressed={state.following} onClick={() => void mutate(state.following ? `follows/${state.organizer_id}` : `events/${eventId}/follow`, state.following ? "DELETE" : "PUT", state.following ? "Organiser unfollowed." : "Following organiser. New event emails are enabled.")}><Bell size={17} aria-hidden />{state.following ? "Following organiser" : "Follow organiser"}</button></div>
    <p className="field-help">Following sends new-event emails to your verified address. Manage follows in <Link href="/saved">Saved & following</Link>.</p>
    {tickets.filter(ticket => soldOut.includes(ticket.id) || state.waitlists.some(entry => entry.ticket_type_id === ticket.id)).map(ticket => { const entry = state.waitlists.find(item => item.ticket_type_id === ticket.id); return <div className="waitlist-option" key={ticket.id}><div><strong>{ticket.name}</strong><p className="field-help">{entry?.status === "notified" ? "An availability alert has been queued. Check your inbox and current availability." : entry ? "You’re on the waitlist. We’ll email when tickets become available." : "Sold out? Get an email when tickets become available."}</p></div><button className="secondary" disabled={busy} onClick={() => void mutate(`waitlists/${ticket.id}`, entry ? "DELETE" : "PUT", entry ? "Left the waitlist." : "Joined the waitlist.")}>{entry ? "Leave waitlist" : "Join waitlist"}</button></div>; })}
    {(soldOut.length > 0 || state.waitlists.length > 0) && <p className="field-help">Alerts do not reserve tickets or guarantee availability. Booking remains first come, first served.</p>}
  </> : !message && <p role="status">Loading your preferences…</p>}{message && <p role="status">{message}</p>}</section>;
}
