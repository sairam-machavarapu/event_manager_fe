"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Library = { events: { id: string; title: string; slug: string; organizer: string; status: string; starts_at: string }[]; next_offset: number | null; follows_next: number | null; waitlists_next: number | null; waitlists: { ticket_type_id: string; ticket: string; title: string; slug: string | null; status: string; event_status: string }[]; follows: { id: string; name: string; status: string }[] };
export default function Saved() {
  const router = useRouter();
  const [data, setData] = useState<Library | null>(null);
  const [offset, setOffset] = useState(0);
  const [followsOffset, setFollowsOffset] = useState(0);
  const [waitlistsOffset, setWaitlistsOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/v1/engagement/library?offset=${offset}&follows_offset=${followsOffset}&waitlists_offset=${waitlistsOffset}`, { cache: "no-store", signal: controller.signal }).then(async response => {
      if (response.status === 401) { router.replace("/login?next=/saved"); return; }
      if (!response.ok) throw new Error("Unable to load saved events.");
      setData(await response.json());
    }).catch(error => { if (error.name !== "AbortError") setMessage(error.message); });
    return () => controller.abort();
  }, [offset, followsOffset, waitlistsOffset, revision, router]);
  async function remove(path: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/v1/engagement/${path}`, { method: "DELETE", headers: { "X-Gather-Request": "1" } });
      if (!response.ok) throw new Error("Unable to update your library. Please try again.");
      setRevision(value => value + 1);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update."); }
    finally { setBusy(false); }
  }
  return <section className="page-title dashboard-page"><span className="eyebrow">Good things to come back to</span><h1>Saved & following</h1><p className="intro">Your private event shortlist and organiser subscriptions.</p>{message && <p className="message error" role="alert">{message}<button className="text-button" onClick={() => setRevision(value => value + 1)}>Retry</button></p>}{!data ? <p role="status">Loading your library…</p> : <>
    <section className="panel"><h2>Saved events</h2>{data.events.length === 0 ? <p>No saved events here yet. <Link className="text-button" href="/">Discover events</Link></p> : <ul className="team-list">{data.events.map(event => <li key={event.id}><div className="member-name"><Link href={`/events/${event.slug}`}><strong>{event.title}</strong></Link><small>{event.organizer} · {event.status === "cancelled" ? "Cancelled" : new Date(event.starts_at).toLocaleString()}</small></div><button className="text-button" disabled={busy} onClick={() => void remove(`events/${event.id}/save`)}>Remove</button></li>)}</ul>}<div className="form-footer"><button className="secondary" disabled={busy || offset === 0} onClick={() => { setData(null); setOffset(Math.max(0, offset - 50)); }}>Previous</button><button className="secondary" disabled={busy || data.next_offset === null} onClick={() => { if (data.next_offset !== null) { setOffset(data.next_offset); setData(null); } }}>Next</button></div></section>
    <section className="panel engagement-panel"><h2>Following organisers</h2><p className="field-help">New event emails go to your verified address. Unfollow to stop future publication emails.</p>{data.follows.length === 0 ? <p>You aren’t following any organisers yet.</p> : <ul className="team-list">{data.follows.map(host => <li key={host.id}><div className="member-name"><strong>{host.name}</strong><small>{host.status}</small></div><button className="text-button" disabled={busy} onClick={() => void remove(`follows/${host.id}`)}>Unfollow</button></li>)}</ul>}<div className="form-footer"><button className="secondary" disabled={busy || followsOffset === 0} onClick={() => setFollowsOffset(Math.max(0, followsOffset - 50))}>Previous organisers</button><button className="secondary" disabled={busy || data.follows_next === null} onClick={() => { if (data.follows_next !== null) setFollowsOffset(data.follows_next); }}>More organisers</button></div></section>
    <section className="panel engagement-panel"><h2>Your waitlists</h2><p className="field-help">One availability alert per signup. An alert is not a reservation; inventory may change before booking.</p>{data.waitlists.length === 0 ? <p>You haven’t joined any waitlists.</p> : <ul className="team-list">{data.waitlists.map(entry => <li key={entry.ticket_type_id}><div className="member-name"><strong>{entry.slug ? <Link href={`/events/${entry.slug}`}>{entry.title}</Link> : entry.title}</strong><small>{entry.ticket} · {entry.event_status === "cancelled" ? "Event cancelled" : entry.status === "notified" ? "Availability alert processed" : "Waiting"}</small></div><button className="text-button" disabled={busy} onClick={() => void remove(`waitlists/${entry.ticket_type_id}`)}>Leave waitlist</button></li>)}</ul>}<div className="form-footer"><button className="secondary" disabled={busy || waitlistsOffset === 0} onClick={() => setWaitlistsOffset(Math.max(0, waitlistsOffset - 50))}>Previous waitlists</button><button className="secondary" disabled={busy || data.waitlists_next === null} onClick={() => { if (data.waitlists_next !== null) setWaitlistsOffset(data.waitlists_next); }}>More waitlists</button></div></section>
  </>}</section>;
}
