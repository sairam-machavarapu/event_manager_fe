"use client";

import Link from "next/link";
import { useState } from "react";

export function AccountLinkForm({ mode }: { mode: "recover" | "reset" | "verify" }) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (mode !== "recover" && !token) { setError("This link is incomplete. Request a new email."); setBusy(false); return; }
    const endpoint = mode === "recover" ? "recovery/request" : mode === "reset" ? "recovery/confirm" : "verification/confirm";
    const body = mode === "recover" ? { email: data.get("email") } : mode === "reset" ? { token, password: data.get("password") } : { token };
    try {
      const response = await fetch(`/api/v1/auth/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Gather-Request": "1" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "Check your details and try again.");
      setNotice(mode === "verify" ? "Your email is verified." : result.message);
      setDone(true);
      if (mode !== "recover") window.history.replaceState(null, "", window.location.pathname);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to connect. Try again."); }
    finally { setBusy(false); }
  }
  return <section className="page-title"><div className="panel account-link-panel"><span className="eyebrow">Your Gather account</span><h1>{mode === "recover" ? "Forgot your password?" : mode === "reset" ? "Set a new password." : "Verify your email."}</h1><p>{mode === "recover" ? "We’ll email you a link to reset it." : mode === "reset" ? "Changing your password signs out all devices." : "Confirm below to verify the address that received this link."}</p>
    {!done && <form className="auth-form" onSubmit={submit}><fieldset disabled={busy}>
      {mode === "recover" && <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={320} /></label>}
      {mode === "reset" && <label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /><span className="field-help">Use 12–128 characters.</span></label>}
    </fieldset><button className="primary" disabled={busy}>{busy ? "Please wait…" : mode === "recover" ? "Send reset link" : mode === "reset" ? "Change password" : "Verify email"}</button></form>}
    {error && <p className="message error" role="alert">{error}</p>}{notice && <p className="message success" role="status">{notice}</p>}
    <p><Link href="/login">Sign in</Link> · <Link href="/account">Your account</Link> · <Link href="/forgot-password">Request a reset link</Link></p>
  </div></section>;
}
