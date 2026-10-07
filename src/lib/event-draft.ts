export type Draft = {
  id: string; organizer_id: string; slug: string; revision: number; status: string;
  title: string | null; description: string | null; category: string | null;
  format: "in_person" | "online"; timezone: string;
  starts_at: string | null; ends_at: string | null;
  venue: string | null; city: string | null; online_url: string | null; cover_url: string | null;
  cancellation_reason: string | null;
};
export type TicketType = { id: string; name: string; price_minor: number; capacity: number; sales_start: string | null; sales_end: string | null; per_order_limit: number };
export type Media = { id: string; kind: string; status: string; alt_text: string; image_url: string | null; thumbnail_url: string | null; error: string | null };
export const draftFields = ["title", "description", "category", "format", "timezone", "starts_at", "ends_at", "venue", "city", "online_url", "cover_url"] as const;
export type FormValues = Record<typeof draftFields[number], string>;
export type DraftPayload = Record<typeof draftFields[number], string | null>;

export function formValues(draft: Draft): FormValues {
  return Object.fromEntries(draftFields.map(field => [field, draft[field] ?? ""])) as FormValues;
}
export function draftPayload(form: FormValues): DraftPayload {
  const body = Object.fromEntries(draftFields.map(field => [field, form[field].trim() || null])) as DraftPayload;
  if (!body.timezone) throw new Error("Choose the event timezone before saving.");
  try { new Intl.DateTimeFormat("en", { timeZone: body.timezone }).format(); }
  catch { throw new Error("Choose a valid timezone, such as Asia/Kolkata."); }
  for (const field of ["starts_at", "ends_at"] as const) {
    if (body[field]) {
      if (!/(Z|[+-]\d{2}:\d{2})$/i.test(body[field]) || !Number.isFinite(Date.parse(body[field]))) {
        throw new Error("Include a UTC offset in your dates, such as 2026-12-01T18:00:00+05:30.");
      }
      body[field] = new Date(body[field]).toISOString();
    }
  }
  if (body.starts_at && body.ends_at && Date.parse(body.ends_at) <= Date.parse(body.starts_at)) {
    throw new Error("End time must be after start time.");
  }
  for (const field of ["cover_url", "online_url"] as const) {
    if (!body[field]) continue;
    let url: URL;
    try { url = new URL(body[field]); } catch { throw new Error("Enter a complete image or meeting URL."); }
    if (field === "cover_url" && (url.protocol !== "https:" || url.username || url.password)) {
      throw new Error("Use an HTTPS cover image URL without credentials.");
    }
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Use an HTTP or HTTPS meeting URL.");
    body[field] = url.href;
  }
  return body;
}
export function changedFields(next: DraftPayload, previous: DraftPayload) {
  return Object.fromEntries(draftFields.filter(field => next[field] !== previous[field]).map(field => [field, next[field]]));
}
export async function responseError(response: Response, fallback: string) {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
    if (Array.isArray(body.detail)) return body.detail.map((item: { loc?: string[]; msg: string }) => `${item.loc?.slice(1).join(" ") || "Details"}: ${item.msg}`).join("; ");
  } catch {}
  return fallback;
}
