import { EventEngagement } from "@/components/event-engagement";
import { EventReport } from "@/components/event-report";
import Link from "next/link";
import { TicketSelection } from "@/components/ticket-selection";
import Image from "next/image";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { eventDate, type PublicEvent } from "@/lib/discovery";

type Detail = PublicEvent & {
  description: string; status: "published" | "cancelled"; cancellation_reason: string | null; ended: boolean;
  gallery: { url: string; alt_text: string }[];
  tickets: { id: string; name: string; price_minor: number; per_order_limit: number; sales_start: string | null; sales_end: string | null; sales_status: "open" | "upcoming" | "closed" | "unavailable" }[];
};
export const dynamic = "force-dynamic";
const getEvent = cache(async (slug: string): Promise<Detail> => {
  const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000"}/api/v1/events/${encodeURIComponent(slug)}`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("Event details are unavailable");
  return response.json();
});
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const event = await getEvent((await params).slug);
  return { title: `${event.title} · Gather`, description: event.description.slice(0, 160), openGraph: { title: event.title, description: event.description.slice(0, 160), ...(event.cover_url ? { images: [event.cover_url] } : {}) } };
}
export default async function EventDetail({ params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent((await params).slug);
  const date = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: event.timezone }).format(new Date(value));

  return <article className="event-detail">
    <Link href="/" className="text-button">← Discover events</Link>
    <header><p className="eyebrow">{event.category} · {event.organizer.name}</p><h1>{event.title}</h1><p>{eventDate(event).full} · {event.timezone}</p></header>
    {event.status === "cancelled" ? <div className="message error" role="status"><strong>This event has been cancelled.</strong>{event.cancellation_reason && <p>{event.cancellation_reason}</p>}</div> : event.ended && <p className="message" role="status">This event has ended.</p>}
    {event.cover_url && <Image className="event-detail-cover" src={event.cover_url} alt={`Poster for ${event.title}`} width={1200} height={750} unoptimized priority />}
    <div className="event-detail-columns"><div>
      <section><h2>About the event</h2><p className="event-description">{event.description || "The organiser has not added a description."}</p></section>
      <section><h2>When and where</h2><p><strong>Starts:</strong> {date(event.starts_at)}<br /><strong>Ends:</strong> {date(event.ends_at)}<br />Timezone: {event.timezone}</p><p>{event.format === "online" ? "Online event. Access details are shared privately with attendees." : `${event.venue || "Venue to be announced"}${event.city ? ` · ${event.city}` : ""}`}</p>{event.format === "in_person" && event.venue && <a className="text-button" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.venue, event.city].filter(Boolean).join(", "))}`} target="_blank" rel="noopener noreferrer">View location on map ↗</a>}</section>
      <section><h2>Your organiser</h2><p>{event.organizer.name}</p></section>
      {event.gallery.length > 0 && <section><h2>A closer look</h2><div className="event-gallery">{event.gallery.map(image => <Image key={image.url} src={image.url} alt={image.alt_text} width={720} height={480} unoptimized />)}</div></section>}
      {event.status === "published" && !event.ended && <EventEngagement eventId={event.id} slug={event.slug} tickets={event.tickets} />}
      {event.status === "published" && <EventReport eventId={event.id} />}
    </div><TicketSelection eventId={event.id} slug={event.slug} tickets={event.tickets} unavailable={event.status === "cancelled" || event.ended} /></div>
  </article>;
}
