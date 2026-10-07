"use client";

import Link from "next/link";
import { safeReturn } from "@/lib/checkout";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Compass, Users, ShieldCheck } from "lucide-react";

export function AccountForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  function switchForm(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(`${register ? "/login" : "/register"}${next ? `?next=${encodeURIComponent(safeReturn(next))}` : ""}`);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const data = new FormData(event.currentTarget);
    const body = { email: data.get("email"), password: data.get("password"), ...(register ? { display_name: data.get("display_name") } : {}) };
    try {
      const response = await fetch(`/api/v1/auth/${register ? "register" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Gather-Request": "1" }, body: JSON.stringify(body) });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(typeof result.detail === "string" ? result.detail : "Check your email, name and password, then try again.");
      }
      const next = new URLSearchParams(window.location.search).get("next");
      router.push(safeReturn(next)); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <section className="access-layout"><aside className="access-story"><span className="eyebrow">A little more out there</span><h1>Good things.<br />Your people.<br /><em>One account.</em></h1><p>Find a reason to go out, or bring a whole room together.</p><div className="access-benefits"><p><Compass size={20} aria-hidden /> Discover something new</p><p><Users size={20} aria-hidden /> Create a home for your team</p><p><ShieldCheck size={20} aria-hidden /> Keep your account in your hands</p></div><span className="story-mark" aria-hidden>✳</span></aside>
    <div className="access-card"><span className="eyebrow">Your Gather account</span><h2>{register ? "Make yourself at home." : "Welcome back."}</h2><p className="muted">{register ? "A few details, and you’re ready to get started." : "Sign in to your account and organiser workspaces."}</p>
      <form className="auth-form" onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy}>
          {register && <label>Your name<input name="display_name" autoComplete="name" placeholder="How should we call you?" required maxLength={120} /></label>}
          <label>Email address<input type="email" name="email" autoComplete="email" placeholder="you@example.com" required maxLength={320} /></label>
          <label htmlFor="password">Password</label><div className="password-field"><input id="password" type={visible ? "text" : "password"} name="password" autoComplete={register ? "new-password" : "current-password"} required minLength={12} maxLength={128} aria-describedby="password-help" /><button type="button" className="icon-button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          <p className="field-help" id="password-help">Use 12–128 characters.</p>
        </fieldset>
        {error && <div className="message error" role="alert">{error}</div>}
        <button className="primary" disabled={busy}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"}<ArrowRight size={17} aria-hidden /></button>
      </form>
      {!register && <p><Link href="/forgot-password">Forgot your password?</Link></p>}
      <p className="access-switch">{register ? "Already have an account? " : "New to Gather? "}<Link href={register ? "/login" : "/register"} onClick={switchForm}>{register ? "Sign in" : "Create an account"}</Link></p>
      <Link className="quiet-link" href="/">Keep exploring events →</Link>
    </div>
  </section>;
}
