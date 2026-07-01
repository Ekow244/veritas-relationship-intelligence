// Deduplicates inbound webhook deliveries. Twilio and Meta both retry webhooks
// on timeout/non-2xx, which — without this — would re-run analysis and send a
// duplicate reply. In-memory + TTL-swept (single-instance MVP; move to Redis if
// the bot ever runs multiple instances).
export class IdempotencyStore {
  private readonly seenIds = new Map<string, number>();

  constructor(private readonly ttlMs: number = 10 * 60 * 1000) {}

  /** Returns true if this id was already seen; records it (as seen) if new. */
  seen(id: string): boolean {
    const now = Date.now();
    this.sweep(now);
    if (this.seenIds.has(id)) return true;
    this.seenIds.set(id, now);
    return false;
  }

  private sweep(now: number): void {
    for (const [id, ts] of this.seenIds) {
      if (now - ts > this.ttlMs) this.seenIds.delete(id);
    }
  }
}
