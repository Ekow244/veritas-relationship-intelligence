import type { BotConfig } from "./config.js";

export type GuardrailDecision = {
  allowed: boolean;
  reason?: "per_user_daily_limit" | "global_daily_limit" | "estimated_daily_cost_limit";
  retryAfterSeconds?: number;
};

type UsageBucket = {
  day: string;
  globalChecks: number;
  estimatedCostCents: number;
  perUserChecks: Map<string, number>;
};

export class GuardrailStore {
  private bucket: UsageBucket = newBucket();

  constructor(private readonly config: BotConfig["guardrails"]) {}

  /**
   * MUST stay synchronous. The read-check-increment is atomic only because it
   * runs to completion within a single event-loop tick. Adding `await` here
   * (e.g. for persistence) would open a TOCTOU window where concurrent webhook
   * requests bypass the limit — persist out-of-band instead.
   */
  recordCheck(userRef: string): GuardrailDecision {
    this.rotateIfNeeded();

    const userChecks = this.bucket.perUserChecks.get(userRef) ?? 0;
    if (userChecks >= this.config.perUserDailyLimit) {
      return this.denied("per_user_daily_limit");
    }
    if (this.bucket.globalChecks >= this.config.globalDailyCheckLimit) {
      return this.denied("global_daily_limit");
    }
    if (this.bucket.estimatedCostCents + this.config.estimatedCostCentsPerCheck > this.config.estimatedDailyCostCentsLimit) {
      return this.denied("estimated_daily_cost_limit");
    }

    this.bucket.perUserChecks.set(userRef, userChecks + 1);
    this.bucket.globalChecks += 1;
    this.bucket.estimatedCostCents += this.config.estimatedCostCentsPerCheck;
    return { allowed: true };
  }

  snapshot(): { day: string; globalChecks: number; estimatedCostCents: number; uniqueUsers: number } {
    this.rotateIfNeeded();
    return {
      day: this.bucket.day,
      globalChecks: this.bucket.globalChecks,
      estimatedCostCents: this.bucket.estimatedCostCents,
      uniqueUsers: this.bucket.perUserChecks.size,
    };
  }

  private denied(reason: GuardrailDecision["reason"]): GuardrailDecision {
    return {
      allowed: false,
      reason,
      retryAfterSeconds: secondsUntilTomorrow(),
    };
  }

  private rotateIfNeeded(): void {
    if (this.bucket.day !== dayKey()) {
      this.bucket = newBucket();
    }
  }
}

function newBucket(): UsageBucket {
  return {
    day: dayKey(),
    globalChecks: 0,
    estimatedCostCents: 0,
    perUserChecks: new Map(),
  };
}

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function secondsUntilTomorrow(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(now.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return Math.max(60, Math.ceil((tomorrow.getTime() - now.getTime()) / 1000));
}
