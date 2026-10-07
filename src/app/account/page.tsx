"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Copy, Compass, LogOut, Users, ShieldCheck } from "lucide-react";

type Account = { id: string; display_name: string; email: string; verified: boolean };
export default function AccountPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const display_name = new FormData(event.currentTarget).get("display_name");
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/v1/auth/me", { method: "PATCH", headers: { "Content-Type": "application/json", "X-Gather-Request": "1" }, body: JSON.stringify({ display_name }) });
      if (!response.ok) throw new Error("Unable to save your name. Check it and try again.");
      setAccount(await response.json()); setNotice("Profile saved.");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save profile."); }
    finally { setBusy(false); }
  }
  async function resendVerification() {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/v1/auth/verification/request", { method: "POST", headers: { "X-Gather-Request": "1" } });
      if (!response.ok) throw new Error("Unable to send verification email. Try again shortly.");
      setNotice("Check your inbox for a new verification link.");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to connect."); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/auth/me", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (response.status === 401) { router.replace("/login"); return; }
      if (!response.ok) throw new Error();
      setAccount(await response.json());
    }).catch(error => { if (error.name !== "AbortError") setError("We couldn’t load your account. Try again in a moment."); });
    return () => controller.abort();
  }, [router, retry]);
  async function logout() {
    setBusy(true); setSigningOut(true); setError("");
    try {
      const response = await fetch("/api/v1/auth/logout", { method: "POST", headers: { "X-Gather-Request": "1" } });
      if (!response.ok) throw new Error();
      router.replace("/login"); router.refresh();
    } catch { setError("Unable to sign out. Please try again."); }
    finally { setBusy(false); setSigningOut(false); }
  }
  async function copyId() {
    try { await navigator.clipboard.writeText(account!.id); setCopied(true); }
    catch { setError("Copy is unavailable. Select and copy the account ID below."); }
  }
  return <section className="page-title dashboard-page"><div className="page-heading"><div><span className="eyebrow">Your corner of Gather</span><h1>{account ? `Hello, ${account.display_name}.` : "Your account."}</h1><p className="intro">A place for your details, your team and your next idea.</p></div>{account && <button className="secondary" disabled={busy} onClick={logout}><LogOut size={16} aria-hidden />{signingOut ? "Signing out…" : "Sign out"}</button>}</div>
    {notice && <p className="message success" role="status">{notice}</p>}
    {account && <div className="panel"><form className="auth-form" onSubmit={saveProfile}><label>Your name<input name="display_name" required maxLength={120} defaultValue={account.display_name} /></label><button className="primary" disabled={busy}>Save profile</button></form>{!account.verified && <p><button className="secondary" disabled={busy} onClick={resendVerification}>Resend verification email</button></p>}<Link href="/forgot-password">Change your password</Link></div>}
    {error && <div className="message error" role="alert">{error}{!account && <button className="text-button" onClick={() => { setError(""); setRetry(value => value + 1); }}>Try again</button>}</div>}
    {account ? <div className="account-layout"><div className="panel profile-card"><div className="avatar" aria-hidden>{account.display_name.charAt(0).toUpperCase()}</div><h2>{account.display_name}</h2><p className="muted">{account.email}</p><span className={`badge ${account.verified ? "success" : "pending"}`}>{account.verified ? "Email verified" : "Email not verified"}</span><div className="account-detail"><h3>Your account ID</h3><p className="field-help">Share this with a workspace owner to join their team.</p><code>{account.id}</code><button className="secondary" onClick={copyId}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy account ID"}</button></div></div>
      <div className="account-actions"><Link className="panel action-card" href="/organise"><Users size={24} aria-hidden /><div><h2>Your workspaces</h2><p>Create a workspace or manage the teams you’re part of.</p></div><ArrowUpRight size={20} aria-hidden /></Link><Link className="panel action-card" href="/"><Compass size={24} aria-hidden /><div><h2>Find your next outing</h2><p>Browse music, workshops and good conversations.</p></div><ArrowUpRight size={20} aria-hidden /></Link><div className="info-note"><ShieldCheck size={20} aria-hidden /><p>{account.verified ? "Your email is verified." : "Check your inbox to verify your email. You can request another link above."}</p></div></div>
    </div> : !error && <div className="panel loading-state" role="status"><span className="loading-dot" />Loading your account…</div>}
  </section>;
}
