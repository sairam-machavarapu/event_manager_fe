export type SaveStatus = "saved" | "waiting" | "saving" | "error";

/** Coalesce edits, serialize writes, and retain the latest snapshot on failure. */
export class Autosave<T> {
  private pending: { value: T } | null = null;
  private flight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private failure: Error | null = null;
  private controller = new AbortController();
  private disposed = false;
  private save: (value: T, signal: AbortSignal) => Promise<void>;
  private notify: (status: SaveStatus, error?: Error) => void;
  private delay: number;

  constructor(save: (value: T, signal: AbortSignal) => Promise<void>, notify: (status: SaveStatus, error?: Error) => void, delay = 900) {
    this.save = save; this.notify = notify; this.delay = delay;
  }
  hasWork() { return Boolean(this.pending || this.flight || this.failure); }
  schedule(value: T) {
    if (this.disposed) return;
    this.pending = { value }; this.failure = null;
    clearTimeout(this.timer);
    this.notify(this.flight ? "saving" : "waiting");
    this.timer = setTimeout(() => { void this.flush().catch(() => {}); }, this.delay);
  }
  async flush(): Promise<void> {
    clearTimeout(this.timer);
    if (this.disposed) throw new Error("The draft editor is closed.");
    while (this.flight) await this.flight;
    if (this.failure) throw this.failure;
    while (this.pending && !this.disposed) {
      const snapshot = this.pending;
      this.pending = null;
      this.notify("saving");
      this.flight = this.save(snapshot.value, this.controller.signal);
      try { await this.flight; }
      catch (error) {
        if (!this.disposed) {
          this.pending ??= snapshot;
          this.failure = error instanceof Error ? error : new Error("Unable to save draft.");
          this.notify("error", this.failure);
        }
        throw error;
      } finally { this.flight = null; }
    }
    if (!this.disposed) this.notify("saved");
  }
  async retry() { this.failure = null; await this.flush(); }
  async discard() {
    clearTimeout(this.timer); this.pending = null;
    try { if (this.flight) await this.flight; } catch {}
    this.pending = null; this.failure = null;
  }
  dispose() {
    this.disposed = true; clearTimeout(this.timer); this.pending = null; this.controller.abort();
  }
}
