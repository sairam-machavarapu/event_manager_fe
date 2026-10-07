"use client";

import { useState } from "react";
import Link from "next/link";

export function EventReport({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [signIn, setSignIn] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const reason = String(new FormData(event.currentTarget).get("reason") || "").trim();
    setBusy(true); setMessage(""); setSignIn(false);
    try {
      const response = await fetch(`/api/v1/events/${eventId}/reports`, { method: "POST", headers: { "Content-Type": "application/json", "X-Gather-Request": "1" }, body: JSON.stringify({ reason }) });
      if (response.status === 401) { setSignIn(true); return; }
      if (!response.ok) { const data = await response.json(); throw new Error(typeof data.detail === "string" ? data.detail : "Unable to submit your report."); }
      setOpen(false); setMessage("Your report was sent to the moderation team.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to submit your report."); }
    finally { setBusy(false); }
  }
  return <section><button className="text-button" aria-expanded={open} disabled={busy} onClick={() => setOpen(!open)}>Report this event</button>{open && <form className="auth-form" onSubmit={submit}><label>Tell us what needs review<textarea name="reason" required maxLength={1000} rows={3} disabled={busy} /></label><button className="secondary" disabled={busy}>{busy ? "Sending…" : "Submit report"}</button></form>}{message && <p role="status">{message}</p>}{signIn && <p role="status"><Link href="/login">Sign in</Link> to report an event.</p>}</section>;
}
