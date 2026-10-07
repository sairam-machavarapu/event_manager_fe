"use client";

import Image from "next/image";
import { useState } from "react";
import type { FormValues, Media, TicketType } from "@/lib/event-draft";

export function EventPreview({ form, media, tickets, workspaceName }: { form: FormValues; media: Media[]; tickets: TicketType[]; workspaceName: string }) {
  const [brokenImage, setBrokenImage] = useState("");
  const poster = media.find(item => item.kind === "poster" && item.status === "ready");
  let image = poster?.image_url ?? "";
  if (form.cover_url) {
    try { const url = new URL(form.cover_url); if (url.protocol === "https:" && !url.username && !url.password) image = url.href; } catch {}
  }
  function date(value: string) {
    if (!value) return "Date to be announced";
    try { return new Intl.DateTimeFormat("en-IN", { timeZone: form.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
    catch { return "Choose a valid date and timezone"; }
  }
  const available = tickets.filter(ticket => ticket.capacity > 0);
  return <aside className="event-preview" aria-label="Live event page preview"><div className="preview-label"><span className="eyebrow">Live preview</span><span className="badge neutral">Private preview</span></div>
    <article className="preview-page"><div className="preview-cover">{image && brokenImage !== image ? <Image src={image} alt={poster?.alt_text ?? "Event cover"} width={800} height={450} unoptimized onError={() => setBrokenImage(image)} /> : <div className="preview-placeholder"><span aria-hidden>✳</span><p>{brokenImage === image && image ? "Image unavailable" : "Your event poster goes here"}</p></div>}</div>
      <div className="preview-body"><span className="eyebrow">{form.category || "Your category"} · {workspaceName}</span><h2>{form.title.trim() || "Your next great gathering"}</h2>
        <p className="preview-date">{date(form.starts_at)}{form.ends_at && <><br />Ends {date(form.ends_at)}</>}<br /><small>{form.timezone || "Event timezone"}</small></p>
        <p className="preview-location">{form.format === "online" ? "Online event" : [form.venue, form.city].filter(Boolean).join(", ") || "Location to be announced"}</p>
        <h3>About this event</h3><p className="preview-description">{form.description.trim() || "Tell people what makes this event special."}</p>
        <div className="preview-tickets"><h3>Tickets</h3>{available.length ? <ul>{available.map(ticket => <li key={ticket.id}><span>{ticket.name}<small>Up to {ticket.per_order_limit} per order</small></span><strong>{ticket.price_minor === 0 ? "Free" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(ticket.price_minor / 100)}</strong></li>)}</ul> : <p>Add ticket types to preview admission options.</p>}<button className="primary" disabled>Registration preview</button></div>
        {media.some(item => item.kind === "gallery" && item.status === "ready") && <div className="preview-gallery"><h3>A closer look</h3>{media.filter(item => item.kind === "gallery" && item.status === "ready" && item.thumbnail_url).map(item => <Image key={item.id} src={item.thumbnail_url!} alt={item.alt_text} width={240} height={180} unoptimized />)}</div>}
      </div></article>
  </aside>;
}
