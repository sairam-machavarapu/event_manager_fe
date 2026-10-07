export const categories = ["Music", "Workshops", "Community", "Talks", "Food & drink", "Outdoors", "Other"];
export type PublicEvent = {
  id: string; slug: string; title: string; category: string; format: string; timezone: string;
  starts_at: string; ends_at: string; venue: string | null; city: string | null; cover_url: string | null;
  organizer: { name: string; slug: string }; price_minor: number; currency: "INR";
};
export type EventPage = { items: PublicEvent[]; next_cursor: string | null };
export type DiscoveryFilters = { q: string; city: string; category: string; price: "all" | "free" | "paid"; date_from: string; date_to: string };
export const emptyFilters: DiscoveryFilters = { q: "", city: "", category: "", price: "all", date_from: "", date_to: "" };

export function weekendDates(now = new Date()) {
  const saturday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = saturday.getUTCDay();
  saturday.setUTCDate(saturday.getUTCDate() + (day === 0 ? -1 : (6 - day)));
  const sunday = new Date(saturday); sunday.setUTCDate(sunday.getUTCDate() + 1);
  return { date_from: saturday.toISOString().slice(0, 10), date_to: sunday.toISOString().slice(0, 10) };
}

export function parseFilters(params: Record<string, string | string[] | undefined>): DiscoveryFilters {
  const single = (name: string) => typeof params[name] === "string" ? params[name] as string : "";
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value ? value : "";
  const category = single("category"), price = single("price");
  return { q: single("q").slice(0, 200), city: single("city").slice(0, 120), category: categories.includes(category) ? category : "", price: price === "free" || price === "paid" ? price : "all", date_from: validDate(single("date_from")), date_to: validDate(single("date_to")) };
}

export function filterParams(filters: DiscoveryFilters) {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(filters)) if (value && !(name === "price" && value === "all")) params.set(name, value);
  return params;
}
export function listingUrl(filters: DiscoveryFilters, cursor: string | null = null) {
  const params = filterParams(filters); params.set("limit", "20");
  if (cursor) params.set("cursor", cursor);
  return `/api/v1/events?${params}`;
}
export function eventPrice(event: PublicEvent) {
  return event.price_minor === 0 ? "Free entry" : `${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(event.price_minor / 100)} onwards`;
}
export function eventDate(event: PublicEvent) {
  const start = new Date(event.starts_at);
  return {
    month: new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: event.timezone }).format(start),
    day: new Intl.DateTimeFormat("en-IN", { day: "2-digit", timeZone: event.timezone }).format(start),
    full: new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: event.timezone }).format(start),
    time: new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: event.timezone }).format(start),
  };
}

export async function publicFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal, cache: "no-store" });
  if (!response.ok) {
    if (response.status === 422) throw new Error("Check your filters, or clear them and try again.");
    throw new Error("Events are unavailable right now. Please try again.");
  }
  return response.json();
}
