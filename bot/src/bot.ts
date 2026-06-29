import type { BotConfig } from "./config.js";
import { analyzeSession } from "./analyzer.js";
import { buildCaseEvent, buildStoredCase, extractDetectedEntities } from "./case-tracking.js";
import { classifyMessage } from "./classifier.js";
import { detectHeuristicSignals } from "./taxonomy.js";
import {
  actionStepsMessage,
  analyzingMessage,
  askForMoreMessage,
  clarifyQuestion,
  crisisMessage,
  deleteConfirmationMessage,
  followUpMessage,
  formatVerdict,
  greetingMessage,
  imageNeedsVisionMessage,
  imageUnreadableMessage,
  outOfScopeMessage,
  reportReminderMessage,
  reportThanksMessage,
  scopeRefusalMessage,
} from "./formatter.js";
import type { BotMessage, InputKind, Session, SessionInput, StoredReport } from "./types.js";
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
      reportedOutcome: outcome.reportedOutcome,
      userAction: outcome.userAction,
      avertedHarm: outcome.avertedHarm,
      scamIndicators: session.lastVerdict?.signals.map((signal) => signal.type) ?? [],
      consentedToIntel: true,
      createdAt: nowIso(),
    };
    await runtime.data.appendReport(report);
    await runtime.data.appendCaseEvent(buildCaseEvent({
      userRef,
      caseId: report.caseId,
      type: "report_received",
      metadata: {
        reportedOutcome: report.reportedOutcome,
        userAction: report.userAction,
        avertedHarm: report.avertedHarm,
        consentedToIntel: report.consentedToIntel,
      },
    }));
    return [reportThanksMessage(report.reportedOutcome, report.avertedHarm)];
  }

  if (kind === "scope_violation") return [scopeRefusalMessage()];
  if (kind === "crisis") return [crisisMessage()];
  if (kind === "out_of_scope") return [outOfScopeMessage()];
  if (kind === "greeting") return [greetingMessage()];

  const input = toSessionInput(kind, message);
  const hasImage = Boolean(message.images?.some((i) => i.dataUrl) || message.image?.dataUrl);
  const shortText = (message.text ?? "").trim().length <= 60 && !/\n/.test(message.text ?? "");

  let updated: Session;
  if (session.stage === "awaiting_screening") {
    // the screening answer continues the current case
    updated = runtime.sessions.addInput(userRef, input);
  } else if (session.stage === "verdict_done" && shortText && !hasImage) {
    // a short follow-up augments the just-finished case
    updated = runtime.sessions.addInput(userRef, input);
  } else {
    // new primary submission (or first message) = fresh case
    updated = runtime.sessions.startCase(userRef, input);
    await runtime.data.appendCaseEvent(buildCaseEvent({
      userRef,
      type: "case_started",
      metadata: {
        provider: message.provider,
        inputKind: input.kind,
        hasImage,
      },
    }));
  }

  await runtime.data.appendCaseEvent(buildCaseEvent({
    userRef,
    type: "input_received",
    metadata: {
      provider: message.provider,
      inputKind: input.kind,
      textLength: input.text?.length ?? 0,
      imageCount: input.images?.length ?? (input.image ? 1 : 0),
    },
  }));

  const inboundImages = message.images ?? (message.image ? [message.image] : []);
  const anyImageHydrated = inboundImages.some((img) => img.dataUrl);
  if (inboundImages.length && !anyImageHydrated && !(message.text ?? "").trim()) {
    return [imageUnreadableMessage()];
  }

  if (kind === "image" && !runtime.config.openai.enabled && !message.image?.dataUrl) {
    return [imageNeedsVisionMessage()];
  }

  const combinedText = updated.inputs
    .filter((item) => item.text)
    .map((item) => item.text)
    .join(" ");
  const heuristic = detectHeuristicSignals(combinedText);
  const hasSignal = (type: string) => heuristic.signals.some((signal) => signal.type === type);
  const haveMoney = hasSignal("money_request");
  const haveVideo = hasSignal("refuses_video") || heuristic.balancingSignals.some((label) => /video/i.test(label));
  const haveOffApp = hasSignal("offplatform_pivot");
  const imageReady = updated.inputs.some((item) => item.image?.dataUrl);

  // Attentive touch: ask one verifying question before the first verdict, unless the
  // situation is already information-rich (an image, or money plus video/off-app context).
  const infoRich = imageReady || (haveMoney && (haveVideo || haveOffApp));
  if (!session.clarifierAsked && !infoRich) {
    runtime.sessions.markClarifierAsked(userRef);
    runtime.sessions.setStage(userRef, "awaiting_screening");
    const missing = !haveMoney ? "money" : !haveVideo ? "video" : "offplatform";
    return [clarifyQuestion(missing)];
  }

  const textSignalsReady = combinedText.length > 80 || heuristic.signals.length > 0;
  if (!textSignalsReady && !imageReady) {
    return [askForMoreMessage()];
  }

  const caseId = makeId("case");
  const detectedEntities = extractDetectedEntities({
    caseId,
    userRef,
    session: updated,
    salt: runtime.config.userHashSalt,
  });
  const intelMatches = await runtime.data.findEntityMatches(detectedEntities);
  const verdict = await analyzeSession(runtime.config, updated, { caseId, intelMatches });
  runtime.sessions.setVerdict(userRef, verdict);

  const storedCase = buildStoredCase({
    verdict,
    session: updated,
    message,
    userRef,
    ttlMs: runtime.config.sessionTtlMs,
    modelVersion: runtime.config.openai.enabled ? runtime.config.openai.model : "heuristic",
  });

  await runtime.data.appendCase(storedCase);
  await runtime.data.appendDetectedEntities(detectedEntities);
  await runtime.data.appendCaseEvent(buildCaseEvent({
    userRef,
    caseId: verdict.caseId,
    type: "verdict_created",
    metadata: {
      riskLevel: verdict.riskLevel,
      score: verdict.score,
      uncertaintyLevel: verdict.uncertainty.level,
      requiresHumanReview: verdict.requiresHumanReview,
      signalTypes: verdict.signals.map((signal) => signal.type),
      entityCount: detectedEntities.length,
      intelMatchCount: intelMatches.length,
    },
  }));
  runtime.sessions.setStage(userRef, "verdict_done");

  const replies = [formatVerdict(verdict)];
  if (verdict.riskLevel === "medium" || verdict.riskLevel === "high") {
    replies.push(actionStepsMessage());
    replies.push(reportReminderMessage());
  }
  replies.push(followUpMessage());
  return replies;
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
    images: message.images,
    receivedAt: Date.now(),
  };
}

function normalizeReportOutcome(text: string): Pick<StoredReport, "reportedOutcome" | "userAction" | "avertedHarm"> {
  const normalized = text.trim().toLowerCase();
  const reportedOutcome = normalized.startsWith("scam")
    ? "scam"
    : normalized.startsWith("safe")
      ? "safe"
      : "unsure";

  const userAction = /\b(blocked|block)\b/.test(normalized)
    ? "blocked"
    : /\b(stopped|cut contact|no contact|ended|walked away)\b/.test(normalized)
      ? "stopped_contact"
      : /\b(sent|paid|transferred|wired)\b/.test(normalized) && !/\b(did not|didn'?t|never|no)\s+(send|pay|transfer|wire)/.test(normalized)
        ? "sent_money"
        : /\b(did not|didn'?t|never|no)\s+(send|pay|transfer|wire)|\bnot send\b/.test(normalized)
          ? "did_not_send"
          : /\b(reported|filed a report|reportfraud|ic3|bank)\b/.test(normalized)
            ? "reported"
            : "unknown";

  const avertedHarm = reportedOutcome === "scam" && ["blocked", "stopped_contact", "did_not_send", "reported"].includes(userAction);
  return { reportedOutcome, userAction, avertedHarm };
}
