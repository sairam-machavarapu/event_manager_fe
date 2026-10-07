"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Bookmark, Compass, Ticket, Users, UserRound } from "lucide-react";

const links = [
  { href: "/", label: "Discover", icon: Compass },
  { href: "/saved", label: "Saved & following", icon: Bookmark },
  { href: "/tickets", label: "My tickets", icon: Ticket },
  { href: "/organise", label: "Workspaces", icon: Users },
  { href: "/account", label: "Account", icon: UserRound },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [admin, setAdmin] = useState(false);
  useEffect(() => { const controller = new AbortController(); fetch("/api/v1/auth/me", { cache: "no-store", signal: controller.signal }).then(async response => setAdmin(response.ok && (await response.json()).is_admin === true)).catch(() => setAdmin(false)); return () => controller.abort(); }, [pathname]);
  return <header className="site-header"><Link className="brand" href="/" aria-label="Gather home">gather<span aria-hidden>✳</span></Link>
    <p className="rail-tagline">Make room for more.</p>
    <nav aria-label="Main navigation">{links.map(({ href, label, icon: Icon }) => {
      const active = pathname === href || (href === "/account" && ["/login", "/register"].includes(pathname));
      return <Link key={href} href={href} className={`nav ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={16} aria-hidden /><span>{label}</span></Link>;
    })}{admin && <Link className={`nav ${pathname === "/admin" ? "active" : ""}`} href="/admin" aria-current={pathname === "/admin" ? "page" : undefined}>Admin</Link>}</nav><div className="rail-bottom"><p className="rail-quote">A little less scrolling.<br />A lot more living.</p><Link className="header-action" href="/organise">Bring people together <ArrowUpRight size={16} aria-hidden /></Link></div>
  </header>;
}
