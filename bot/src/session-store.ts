import type { Session, SessionInput, Verdict } from "./types.js";

export class SessionStore {
  private readonly sessions = new Map<string, Session>();

  constructor(private readonly ttlMs: number) {}

  get(userRef: string): Session {
    this.sweep();
    const existing = this.sessions.get(userRef);
    if (existing) return existing;

    const now = Date.now();
    const created: Session = {
      userRef,
      startedAt: now,
      updatedAt: now,
      greeted: false,
      inputs: [],
    };
    this.sessions.set(userRef, created);
    return created;
  }

  addInput(userRef: string, input: SessionInput): Session {
    const session = this.get(userRef);
    session.inputs.push(input);
    session.inputs = session.inputs
      .filter((item) => Date.now() - item.receivedAt <= this.ttlMs)
      .slice(-12);
    session.updatedAt = Date.now();
    this.sessions.set(userRef, session);
    return session;
  }

  markGreeted(userRef: string): void {
    const session = this.get(userRef);
    session.greeted = true;
    session.updatedAt = Date.now();
  }

  markClarifierAsked(userRef: string): void {
    const session = this.get(userRef);
    session.clarifierAsked = true;
    session.updatedAt = Date.now();
  }

  startCase(userRef: string, input: SessionInput): Session {
    const session = this.get(userRef);
    session.inputs = [input];
    session.stage = undefined;
    session.clarifierAsked = false;
    session.updatedAt = Date.now();
    this.sessions.set(userRef, session);
    return session;
  }

  setStage(userRef: string, stage: Session["stage"]): void {
    const session = this.get(userRef);
    session.stage = stage;
    session.updatedAt = Date.now();
  }

  setVerdict(userRef: string, verdict: Verdict): void {
    const session = this.get(userRef);
    session.lastVerdict = verdict;
    session.updatedAt = Date.now();
  }

  delete(userRef: string): void {
    this.sessions.delete(userRef);
  }

  private sweep(): void {
    const now = Date.now();
    for (const [userRef, session] of this.sessions) {
      if (now - session.updatedAt > this.ttlMs) {
        this.sessions.delete(userRef);
      }
    }
  }
}
