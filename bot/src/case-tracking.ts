import { createHash } from "node:crypto";
import type {
  BotMessage,
  CaseEvent,
  CaseEventType,
  CaseInputSummary,
  DetectedEntity,
  DetectedEntityType,
  ScamType,
  Session,
  SessionInput,
  Signal,
  StoredCase,
  Verdict,
} from "./types.js";
import { makeId, nowIso } from "./utils.js";

const promptVersion = "veritas-romance-v1";

export function buildStoredCase(input: {
  verdict: Verdict;
  session: Session;
  message: BotMessage;
  userRef: string;
  ttlMs: number;
  modelVersion?: string;
}): StoredCase {
  return {
    id: input.verdict.caseId,
    createdAt: input.verdict.createdAt,
    channel: input.message.provider === "simulator" ? "simulator" : "whatsapp",
    userRef: input.userRef,
    scamType: inferScamType(input.verdict.signals, input.session.inputs),
    inputsSummary: input.session.inputs.map(summarizeInput),
    status: "verdict_created",
    ttlExpiresAt: new Date(Date.now() + input.ttlMs).toISOString(),
    modelVersion: input.modelVersion,
    promptVersion,
    verdict: {
      riskLevel: input.verdict.riskLevel,
      score: input.verdict.score,
      // Drop each signal's raw `evidence` window (can contain phone/email/URL
      // from the chat) and the LLM `explanation` (prompted to quote phrases).
      // Only derived signal metadata is persisted.
      signals: input.verdict.signals.map((signal) => ({
        type: signal.type,
        label: signal.label,
        confidence: signal.confidence,
        weight: signal.weight,
        source: signal.source,
      })),
      balancingSignals: input.verdict.balancingSignals,
      uncertainty: input.verdict.uncertainty,
      nextSteps: input.verdict.nextSteps,
      doNotDo: input.verdict.doNotDo,
      requiresHumanReview: input.verdict.requiresHumanReview,
      disclaimer: input.verdict.disclaimer,
      createdAt: input.verdict.createdAt,
    },
  };
}

export function buildCaseEvent(input: {
  userRef: string;
  type: CaseEventType;
  caseId?: string;
  metadata?: CaseEvent["metadata"];
}): CaseEvent {
  return {
    id: makeId("event"),
    caseId: input.caseId,
    userRef: input.userRef,
    type: input.type,
    createdAt: nowIso(),
    metadata: input.metadata ?? {},
  };
}

export function extractDetectedEntities(input: {
  caseId: string;
  userRef: string;
  session: Session;
  salt: string;
}): DetectedEntity[] {
  const found = new Map<string, DetectedEntity>();
  const add = (type: DetectedEntityType, value: string, source: DetectedEntity["source"], confidence: number) => {
    const normalized = normalizeEntityValue(type, value);
    if (!normalized) return;

    const key = `${type}:${normalized}`;
    if (found.has(key)) return;

    found.set(key, {
      id: makeId("entity"),
      caseId: input.caseId,
      userRef: input.userRef,
      type,
      valueHash: hashEntity(normalized, input.salt),
      valuePreview: previewEntity(type, normalized),
      source,
      confidence,
      createdAt: nowIso(),
    });
  };

  for (const sessionInput of input.session.inputs) {
    const text = sessionInput.text ?? "";
    for (const match of text.matchAll(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g)) {
      add("phone_number", match[0], "regex", 0.72);
    }
    for (const match of text.matchAll(/\bhttps?:\/\/[^\s<>"']+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"']*)?/gi)) {
      add("url", match[0], "regex", 0.82);
    }
    for (const match of text.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)) {
      add("email", match[0], "regex", 0.86);
    }
    for (const match of text.matchAll(/\b(?:cash ?app|paypal|venmo|zelle|momo|mobile money|wallet|bank account)\b.{0,48}/gi)) {
      add("payment_handle", match[0], "regex", 0.58);
    }
    for (const match of text.matchAll(/\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,59}\b|\b0x[a-fA-F0-9]{40}\b/g)) {
      add("crypto_wallet", match[0], "regex", 0.9);
    }

    const images = sessionInput.images ?? (sessionInput.image ? [sessionInput.image] : []);
    for (const image of images) {
      const imageRef = image.id ?? image.url ?? image.mimeType;
      if (imageRef) add("image_reference", imageRef, "image_metadata", 0.62);
    }
  }

  return [...found.values()];
}

export function summarizeInput(input: SessionInput): CaseInputSummary {
  const imageCount = input.images?.length ?? (input.image ? 1 : 0);
  return {
    kind: input.kind,
    receivedAt: new Date(input.receivedAt).toISOString(),
    textLength: input.text?.length ?? 0,
    imageCount,
  };
}

function inferScamType(signals: Signal[], inputs: SessionInput[]): ScamType {
  const text = inputs.map((input) => input.text ?? "").join(" ").toLowerCase();
  if (/\b(rent|rental|landlord|apartment|deposit|viewing|lease)\b/.test(text)) return "rental";
  if (/\b(invest|profit|forex|crypto|trading|returns?)\b/.test(text)) return "investment";
  if (/\b(nude|intimate|blackmail|expose|sextortion)\b/.test(text)) return "sextortion";
  if (signals.some((signal) => signal.type === "classic_unavailable_persona")) return "romance";
  if (signals.some((signal) => ["love_bombing", "future_faking", "refuses_video"].includes(signal.type))) {
    return "romance";
  }
  if (/\b(pretending|impersonat|fake profile|not who)\b/.test(text)) return "impersonation";
  return "unknown";
}

function normalizeEntityValue(type: DetectedEntityType, value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  if (type === "phone_number") return trimmed.replace(/[^\d+]/g, "");
  if (type === "url") {
    try {
      const url = trimmed.startsWith("http") ? new URL(trimmed) : new URL(`https://${trimmed}`);
      return `${url.hostname}${url.pathname === "/" ? "" : url.pathname}`.replace(/^www\./, "");
    } catch {
      return trimmed.replace(/^www\./, "");
    }
  }
  return trimmed.replace(/\s+/g, " ");
}

function hashEntity(value: string, salt: string): string {
  return createHash("sha256").update(`${salt}:entity:${value}`).digest("hex");
}

function previewEntity(type: DetectedEntityType, value: string): string {
  if (type === "phone_number") {
    return value.length > 4 ? `...${value.slice(-4)}` : "...";
  }
  if (type === "email") {
    const [name, domain] = value.split("@");
    return `${name?.slice(0, 2) ?? ""}...@${domain ?? "unknown"}`;
  }
  if (type === "crypto_wallet") {
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  }
  if (type === "url") {
    // host only — never the full path/query (which can carry identifiers)
    return value.split("/")[0] || "link";
  }
  if (type === "payment_handle") {
    // the leading provider keyword only, never the raw trailing capture
    return `${value.split(/\s+/)[0] ?? "payment"} handle`;
  }
  if (type === "image_reference") return "image";
  // No raw fall-through for any PII-bearing type.
  return "redacted";
}
