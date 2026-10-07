import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PageMotion } from "@/components/page-motion";
import "./globals.css";
import "./moments.css";

export const metadata: Metadata = { title: "Gather — A little more out there", description: "Discover events, find your people, and bring an idea to life." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <a className="skip-link" href="#main">Skip to content</a>
    <SiteHeader />
    <main id="main"><PageMotion>{children}</PageMotion></main>
    <footer><Link className="brand" href="/">gather<span>✳</span></Link><span>Good things happen when we get together.</span><small><Link href="/">Discover</Link> · <Link href="/organise">Organise</Link> · <Link href="/account">Your account</Link></small></footer>
  </body></html>;
}

