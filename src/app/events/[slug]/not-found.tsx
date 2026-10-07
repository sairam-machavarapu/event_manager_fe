import Link from "next/link";
export default function EventNotFound() {
  return <section className="empty"><h1>Event not found</h1><p>This event is unavailable or has not been published.</p><Link className="primary" href="/">Discover events</Link></section>;
}
