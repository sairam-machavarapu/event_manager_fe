"use client";
import Link from "next/link";
export default function EventError({ reset }: { reset: () => void }) {
  return <section className="empty" role="alert"><h1>Event details are unavailable</h1><p>Please try again in a moment.</p><button className="secondary" onClick={reset}>Try again</button> <Link href="/">Discover events</Link></section>;
}
