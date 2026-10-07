export default function Loading() {
  return <div role="status" aria-label="Loading events"><div className="homepage-loading"><span className="eyebrow">Finding your next good time</span><h1>Discover what’s coming up.</h1></div><div className="grid discovery-skeleton" aria-hidden="true">{[1, 2, 3].map(item => <div className="card" key={item}><div className="skeleton-poster" /><div className="skeleton-lines"><span /><span /><span /></div></div>)}</div></div>;
}
