import type { BotConfig } from "./config.js";
import { analyzeSession } from "./analyzer.js";
import { classifyMessage } from "./classifier.js";
import {
  analyzingMessage,
  askForMoreMessage,
  crisisMessage,
  deleteConfirmationMessage,
  formatVerdict,
  greetingMessage,
  imageNeedsVisionMessage,
  outOfScopeMessage,
  reportThanksMessage,
  scopeRefusalMessage,
} from "./formatter.js";
import type { BotMessage, InputKind, SessionInput, StoredCase, StoredReport } from "./types.js";
import type { DataStore } from "./storage.js";
import type { SessionStore } from "./session-store.js";
import { hashUser, makeId, nowIso } from "./utils.js";

export type BotRuntime = {
  config: BotConfig;
  sessions: SessionStore;
  data: DataStore;
};

export async function processIncomingMessage(runtime: BotRuntime, message: BotMessage): Promise<string[]> {
  const userRef = hashUser(message.from, runtime.config.userHashSalt);
  const kind = classifyMessage(message);
  const session = runtime.sessions.get(userRef);

  if (!session.greeted && kind === "greeting") {
    runtime.sessions.markGreeted(userRef);
    return [greetingMessage()];
  }

  if (!session.greeted) {
    runtime.sessions.markGreeted(userRef);
  }

  if (kind === "delete_request") {
    runtime.sessions.delete(userRef);
    const removed = await runtime.data.deleteUserData(userRef);
    return [deleteConfirmationMessage(removed)];
  }

  if (kind === "report_back") {
    const outcome = normalizeReportOutcome(message.text ?? "unsure");
    const report: StoredReport = {
      id: makeId("report"),
      caseId: session.lastVerdict?.caseId,
      userRef,
      reportedOutcome: outcome,
      scamIndicators: session.lastVerdict?.signals.map((signal) => signal.type) ?? [],
      consentedToIntel: true,
      createdAt: nowIso(),
    };
    await runtime.data.appendReport(report);
    return [reportThanksMessage(outcome)];
  }

  if (kind === "scope_violation") return [scopeRefusalMessage()];
  if (kind === "crisis") return [crisisMessage()];
  if (kind === "out_of_scope") return [outOfScopeMessage()];
  if (kind === "greeting") return [greetingMessage()];

  const input = toSessionInput(kind, message);
  const updated = runtime.sessions.addInput(userRef, input);

  if (kind === "image" && !runtime.config.openai.enabled && !message.image?.dataUrl) {
    return [imageNeedsVisionMessage()];
  }

  const textSignalsReady = updated.inputs.some((item) => item.kind === "chat_text" && item.text && item.text.length > 80);
  const imageReady = updated.inputs.some((item) => item.image?.dataUrl);

  if (!textSignalsReady && !imageReady) {
    return [askForMoreMessage()];
  }

  const verdict = await analyzeSession(runtime.config, updated);
  runtime.sessions.setVerdict(userRef, verdict);

  const storedCase: StoredCase = {
    id: verdict.caseId,
    createdAt: verdict.createdAt,
    channel: message.provider === "simulator" ? "simulator" : "whatsapp",
    userRef,
    inputsSummary: updated.inputs.map((item) => item.kind),
    status: "verdict_created",
    ttlExpiresAt: new Date(Date.now() + runtime.config.sessionTtlMs).toISOString(),
    verdict: {
      riskLevel: verdict.riskLevel,
      score: verdict.score,
      signals: verdict.signals,
      balancingSignals: verdict.balancingSignals,
      explanation: verdict.explanation,
      nextSteps: verdict.nextSteps,
      disclaimer: verdict.disclaimer,
      createdAt: verdict.createdAt,
    },
  };
  await runtime.data.appendCase(storedCase);

  return [formatVerdict(verdict)];
}

export async function processMetaMessageForWhatsApp(
  runtime: BotRuntime,
  message: BotMessage,
  send: (to: string, body: string) => Promise<void>,
): Promise<void> {
  const kind = classifyMessage(message);
  const shouldAck = kind === "chat_text" || kind === "image";
  if (shouldAck) {
    await send(message.from, analyzingMessage());
  }

  const replies = await processIncomingMessage(runtime, message);
  for (const reply of replies) {
    await send(message.from, reply);
  }
}

function toSessionInput(kind: InputKind, message: BotMessage): SessionInput {
  return {
    kind,
    text: message.text ?? message.image?.caption,
    image: message.image,
    receivedAt: Date.now(),
  };
}

function normalizeReportOutcome(text: string): "scam" | "safe" | "unsure" {
  const normalized = text.trim().toLowerCase();
  if (normalized === "scam") return "scam";
  if (normalized === "safe") return "safe";
  return "unsure";
}
