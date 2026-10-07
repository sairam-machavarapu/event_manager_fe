"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { categories, emptyFilters, eventDate, eventPrice, filterParams, listingUrl, publicFetch, weekendDates, type DiscoveryFilters, type EventPage, type PublicEvent } from "@/lib/discovery";

function Poster({ event, featured = false }: { event: PublicEvent; featured?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <div className="public-poster">{event.cover_url && !failed ? <Image src={event.cover_url} alt="" width={960} height={600} unoptimized priority={featured} onError={() => setFailed(true)} /> : <div className="public-poster-fallback"><span className="kicker">{event.organizer.name}</span><strong>{event.category}</strong><span className="poster-foot">{event.city || "Online"}</span></div>}</div>;
}
export function DiscoverySkeleton() {
  return <div className="grid discovery-skeleton" aria-hidden="true">{[1, 2, 3].map(item => <div className="card" key={item}><div className="skeleton-poster" /><div className="skeleton-lines"><span /><span /><span /></div></div>)}</div>;
}
export function Discovery({ initialFilters, initialPage, initialCities }: { initialFilters: DiscoveryFilters; initialPage: EventPage | null; initialCities: string[] | null }) {
  const [filters, setFilters] = useState(initialFilters);
  const [input, setInput] = useState(initialFilters.q);
  const initial = JSON.stringify(filters) === JSON.stringify(initialFilters);
  const invalidDates = Boolean(filters.date_from && filters.date_to && filters.date_to < filters.date_from);
  const listing = useInfiniteQuery({
    queryKey: ["events", filters], initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => publicFetch<EventPage>(listingUrl(filters, pageParam), signal),
    getNextPageParam: page => page.next_cursor ?? undefined,
    initialData: initial && initialPage ? { pages: [initialPage], pageParams: [null] } : undefined,
    initialDataUpdatedAt: 0, enabled: !invalidDates,
    refetchInterval: 30_000, refetchOnWindowFocus: "always",
  });
  const cities = useQuery({ queryKey: ["event-cities"], queryFn: ({ signal }) => publicFetch<string[]>("/api/v1/events/cities", signal), initialData: initialCities ?? undefined, initialDataUpdatedAt: 0, refetchInterval: 30_000 });
  const events = Array.from(new Map((listing.data?.pages.flatMap(page => page.items) ?? []).map(event => [event.id, event])).values());
  const spotlight = events[0];
  const active = filters.q || filters.city || filters.category || filters.price !== "all" || filters.date_from || filters.date_to;
  const weekend = weekendDates();
  const isWeekend = filters.date_from === weekend.date_from && filters.date_to === weekend.date_to;
  useEffect(() => {
    const timer = setTimeout(() => setFilters(previous => previous.q === input ? previous : { ...previous, q: input }), 350);
    return () => clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    const params = filterParams(filters).toString();
    const next = params ? `/?${params}` : "/";
    if (`${window.location.pathname}${window.location.search}` !== next) window.history.replaceState(null, "", next);
  }, [filters]);
  function reset() { setInput(""); setFilters(emptyFilters); }
  function filter<K extends keyof DiscoveryFilters>(name: K, value: DiscoveryFilters[K]) { setFilters(previous => ({ ...previous, [name]: value })); }
  return <>
    <div className="search"><label><Search size={19} aria-hidden /><input type="search" aria-label="Search events" maxLength={200} placeholder="An event, an interest, a little inspiration…" value={input} onChange={event => setInput(event.target.value)} /></label><select aria-label="Event city" value={filters.city} onChange={event => filter("city", event.target.value)}><option value="">All cities</option>{filters.city && !cities.data?.includes(filters.city) && <option>{filters.city}</option>}{cities.data?.map(city => <option key={city}>{city}</option>)}</select></div>
    {cities.isError && <p className="field-help">City choices are unavailable. <button className="text-button" onClick={() => cities.refetch()}>Retry city choices</button></p>}
    <div className="categories" aria-label="Event categories"><button className={`chip ${!filters.category ? "selected" : ""}`} aria-pressed={!filters.category} onClick={() => filter("category", "")}>All events</button>{categories.map(category => <button key={category} className={`chip ${filters.category === category ? "selected" : ""}`} aria-pressed={filters.category === category} onClick={() => filter("category", category)}>{category}</button>)}</div>
    <div className="discovery-filters"><button className={`chip ${isWeekend ? "selected" : ""}`} aria-pressed={isWeekend} onClick={() => setFilters(previous => ({ ...previous, ...(isWeekend ? { date_from: "", date_to: "" } : weekend) }))}>This weekend</button><button className={`chip ${filters.price === "free" ? "selected" : ""}`} aria-pressed={filters.price === "free"} onClick={() => filter("price", filters.price === "free" ? "all" : "free")}>Free events</button><button className={`chip ${filters.price === "paid" ? "selected" : ""}`} aria-pressed={filters.price === "paid"} onClick={() => filter("price", filters.price === "paid" ? "all" : "paid")}>Paid events</button><label>From<input type="date" value={filters.date_from} onChange={event => filter("date_from", event.target.value)} /></label><label>Through<input type="date" value={filters.date_to} onChange={event => filter("date_to", event.target.value)} /></label><small>Dates filter by UTC calendar day.</small></div>
    {!active && spotlight && !listing.isError && <section className="featured-event" aria-label="Featured upcoming event"><Poster key={spotlight.cover_url} event={spotlight} featured /><div><span className="eyebrow">In the spotlight · Coming up first</span><h2>{spotlight.title}</h2><p>{spotlight.organizer.name} · {spotlight.city || "Online"}</p><p>{eventDate(spotlight).full} · {spotlight.timezone}</p><strong>{eventPrice(spotlight)}</strong><Link className="primary" href={`/events/${encodeURIComponent(spotlight.slug)}`}>Take a look ↗</Link></div></section>}
    <section aria-busy={listing.isFetching}><div className="section-head"><div><h2>Something for your calendar</h2><p role="status" aria-live="polite">{invalidDates ? "Choose a valid date range" : listing.isPending ? "Finding events…" : listing.isFetchingNextPage ? "Loading more events…" : listing.isFetching ? "Refreshing events…" : `${events.length} upcoming events${listing.hasNextPage ? " loaded" : ""}`}</p></div><button className="text-button" onClick={reset}>Clear filters ↗</button></div>
      {invalidDates && <p className="message error" role="alert">The end date must be on or after the start date.</p>}
      {listing.isError && <div className="message error" role="alert"><p>{listing.error.message}</p><button className="secondary" onClick={() => listing.isFetchNextPageError ? listing.fetchNextPage() : listing.refetch()}>{listing.isFetchNextPageError ? "Retry loading more" : "Retry events"}</button>{events.length > 0 && <p>Displayed events may be out of date.</p>}</div>}
      {listing.isPending && !invalidDates ? <DiscoverySkeleton /> : <div className="grid">{events.map(event => { const date = eventDate(event); return <article className="card" key={event.id}><div className="card-top"><Link className="poster-link poster-button" aria-label={`View ${event.title}`} href={`/events/${encodeURIComponent(event.slug)}`}><Poster key={event.cover_url} event={event} /></Link></div><div className="card-body"><div className="date" aria-label={date.full}><small>{date.month}</small><b>{date.day}</b></div><div><span className="event-category">{event.category}</span><h3><Link className="title-button" href={`/events/${encodeURIComponent(event.slug)}`}>{event.title}</Link></h3><p className="meta">{event.venue || "Online"} · {date.time}</p><p className="meta">{event.city || "Online"} · {event.organizer.name}</p><span className="price">{eventPrice(event)}</span></div></div></article>; })}</div>}
      {!invalidDates && !listing.isPending && !listing.isError && !events.length && <div className="empty"><h3>{active ? "No events match these filters" : "Good things are on their way"}</h3><p>{active ? "Try another city, date or interest." : "Published events will appear here when organisers are ready."}</p>{active && <button className="secondary" onClick={reset}>Clear filters</button>}</div>}
      {listing.hasNextPage && !invalidDates && <div className="discovery-more"><button className="secondary" disabled={listing.isFetching} onClick={() => listing.fetchNextPage()}>{listing.isFetchingNextPage ? "Loading…" : "Load more events"}</button></div>}
    </section>
  </>;
}
