import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { eventDate, type PublicEvent } from "@/lib/discovery";

export function HomeHero({ event }: { event?: PublicEvent }) {
  const date = event ? eventDate(event) : null;
  return <section className="moments-hero" aria-labelledby="home-heading">
    <div className="moments-topline"><span>Gather / Good moments start here</span><span>Experiences worth showing up for</span></div>
    <div className="moments-stage">
      <div className="moments-copy"><span className="eyebrow moments-eyebrow">For the moments that matter</span><h1 id="home-heading">Less ordinary.<br />More <em>together.</em></h1><p className="intro">Concerts that stay with you. Creative weekends. Conversations worth bringing everyone together for.</p><div className="moments-actions"><Link className="primary" href="#discover">Discover events <ArrowUpRight size={17} aria-hidden /></Link><Link className="secondary" href="/organise">Plan an event</Link></div><div className="moments-interests"><span>Live music</span><span>Workshops</span><span>Community</span></div></div>
      <div className="moments-art"><div className="moments-sticker">Make room<br />for more.</div><div className="moments-image">{event?.cover_url ? <Image src={event.cover_url} alt={`Poster for ${event.title}`} width={850} height={1050} unoptimized priority /> : <div className="moments-placeholder"><span aria-hidden>✳</span><p>A little less scrolling.<br /><em>A lot more living.</em></p></div>}</div>{event && date ? <Link className="moments-event" href={`/events/${encodeURIComponent(event.slug)}`}><div><span className="eyebrow">Your next good moment</span><strong>{event.title}</strong><small>{event.city || "Online"}</small></div><div className="moments-date"><small>{date.month}</small><b>{date.day}</b></div></Link> : <div className="moments-event"><div><span className="eyebrow">Your next good moment</span><strong>Find your people.</strong><small>Explore what is coming up.</small></div><ArrowUpRight size={28} aria-hidden /></div>}</div>
    </div>
    <a className="moments-scroll" href="#discover"><ArrowDown size={18} aria-hidden />Scroll to find your next moment</a>
  </section>;
}
