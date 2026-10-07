"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { Media } from "@/lib/event-draft";

export function EventMedia({ path, disabled, onChange, onBusyChange }: { path: string; disabled: boolean; onChange?: (rows: Media[]) => void; onBusyChange?: (busy: boolean) => void }) {
  const [items, setItems] = useState<Media[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const response = await fetch(path, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Unable to load event images.");
        const rows: Media[] = await response.json();
        setItems(rows); setLoaded(true); onChange?.(rows);
        if (rows.some(row => row.status === "processing")) timer = setTimeout(load, 3000);
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load images."); }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [path, revision, onChange]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("image") as File;
    if (file.size > 8 * 1024 * 1024) { setError("Choose an image smaller than 8 MiB."); return; }
    setBusy(true); setError("");
    try {
      const query = new URLSearchParams({ kind: String(data.get("kind")), alt_text: String(data.get("alt_text")) });
      const response = await fetch(`${path}?${query}`, { method: "POST", headers: { "X-Gather-Request": "1", "Content-Type": "application/octet-stream" }, body: file });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(typeof result.detail === "string" ? result.detail : "Unable to upload image.");
      }
      form.reset(); setRevision(value => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to upload image."); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${path}/${id}`, { method: "DELETE", headers: { "X-Gather-Request": "1" } });
      if (!response.ok) throw new Error("Unable to remove image.");
      setRevision(value => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to remove image."); }
    finally { setBusy(false); }
  }
  return <div className="panel"><h3>Poster and gallery</h3><p className="field-help">JPEG, PNG or WebP, up to 8 MiB and 20 million pixels. Add a poster for publication and gallery images to tell the story.</p>
    {error && <p role="alert" className="message error">{error}<button type="button" className="text-button" onClick={() => { setError(""); setRevision(value => value + 1); }}>Try again</button></p>}
    {!loaded && !error && <p role="status">Loading images…</p>}
    <div className="media-grid">{items.map(item => <article className="media-card" key={item.id}>
      {item.thumbnail_url && <Image src={item.thumbnail_url} alt={item.alt_text} width={240} height={180} unoptimized />}
      <strong>{item.kind}</strong><p role="status">{item.status === "processing" ? "Processing image…" : item.status === "failed" ? item.error || "Image processing failed. Remove and upload again." : "Ready"}</p><p>{item.alt_text}</p>
      <button type="button" className="secondary" disabled={disabled || busy} onClick={() => remove(item.id)}>Remove image</button>
    </article>)}</div>
    <form className="auth-form" onSubmit={upload}><fieldset disabled={disabled || busy}>
      <label>Image purpose<select name="kind"><option value="poster">Poster</option><option value="gallery">Gallery</option></select></label>
      <label>Image file<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
      <label>Image description<input name="alt_text" required maxLength={300} placeholder="Describe what is shown" /></label>
    </fieldset><button className="primary" disabled={disabled || busy}>{busy ? "Uploading…" : "Upload image"}</button></form>
  </div>;
}
