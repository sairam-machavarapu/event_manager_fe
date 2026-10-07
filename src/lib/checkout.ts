export type Booking = {
  id: string; event_id: string; event_title: string; event_slug: string; event_available: boolean;
  status: "pending" | "confirmed" | "expired" | "cancelled";
  payment_review?: boolean;
  refund?: { reference: string; status: "queued" | "pending" | "succeeded" | "failed"; amount_minor: number; currency: string; completed_at: string | null } | null;
  total_minor: number; currency: string; expires_at: string | null; server_time: string;
  items: { ticket_type_id: string; name: string; quantity: number; unit_price_minor: number }[]; ticket_ids: string[];
};
export type Availability = { server_time: string; items: { ticket_type_id: string; remaining: number; sales_status: "open" | "upcoming" | "closed" | "sold_out" | "unavailable" }[] };
export type Selection = { ticket_type_id: string; quantity: number }[];
export function money(minor: number) { return minor === 0 ? "Free" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(minor / 100); }
export function safeReturn(value: string | null) {
  return value && (/^\/(organise|account|tickets|admin|saved)$/.test(value) || /^\/events\/[a-zA-Z0-9_-]+$/.test(value) || /^\/checkout\/[a-fA-F0-9-]{36}$/.test(value) || /^\/orders\/[a-fA-F0-9-]{36}\/confirmation$/.test(value)) ? value : "/account";
}
export function selectionKey(items: Selection) { return JSON.stringify([...items].sort((a, b) => a.ticket_type_id.localeCompare(b.ticket_type_id))); }
export function remainingSeconds(booking: Booking, serverAtReceipt: number, elapsedMs: number) {
  return booking.status === "pending" && booking.expires_at ? Math.max(0, Math.ceil((Date.parse(booking.expires_at) - serverAtReceipt - Math.max(0, elapsedMs)) / 1000)) : 0;
}
export class CheckoutError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
export async function bookingFetch<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { method: body === undefined ? "GET" : "POST", cache: "no-store", signal,
    ...(body === undefined ? {} : { headers: { "Content-Type": "application/json", "X-Gather-Request": "1" }, body: JSON.stringify(body) }) });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new CheckoutError(response.status, typeof data.detail === "string" ? data.detail : "Please check your selection and try again.");
  }
  return response.json();
}

