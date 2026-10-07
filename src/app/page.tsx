import Link from "next/link";
import { HomeHero } from "@/components/home-hero";
import { Discovery } from "@/components/discovery";
import { DiscoveryProvider } from "@/components/discovery-provider";
import { Button } from "@/components/ui/button";
import { listingUrl, parseFilters, type EventPage } from "@/lib/discovery";

export const dynamic = "force-dynamic";
async function initialData<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000"}${path}`, { cache: "no-store", signal: AbortSignal.timeout(2500) });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams);
  const [page, cities] = await Promise.all([initialData<EventPage>(listingUrl(filters)), initialData<string[]>("/api/v1/events/cities")]);
  return <>
    <HomeHero event={page?.items[0]} />
    <div id="discover">
    <DiscoveryProvider><Discovery key={JSON.stringify(filters)} initialFilters={filters} initialPage={page} initialCities={cities} /></DiscoveryProvider>
    </div>
    <section className="editor-note"><div><span className="eyebrow">For the people who bring people together</span><h2>Your next event starts here.</h2><p>Create a workspace, build an event, make it happen.</p></div><Button variant="outline" asChild><Link href="/organise">Explore organising ↗</Link></Button></section>
  </>;
}
