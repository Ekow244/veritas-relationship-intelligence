import type { BotConfig } from "./config.js";
import { analyzeWithOpenAI } from "./openai-analyzer.js";
import { detectHeuristicSignals, scoreSignals } from "./taxonomy.js";
import type { RiskLevel, Session, Signal, Verdict } from "./types.js";
import { makeId, nowIso } from "./utils.js";

export async function analyzeSession(config: BotConfig, session: Session): Promise<Verdict> {
  const text = session.inputs
    .filter((input) => input.text)
    .map((input) => input.text)
    .join("\n\n");

  const caseImages = session.inputs
    .flatMap((input) => input.images ?? (input.image ? [input.image] : []))
    .filter((img) => img.dataUrl);
  const imageDataUrls = caseImages.map((img) => img.dataUrl as string);
  const captionText = caseImages.map((img) => img.caption).filter(Boolean).join("\n");

  const heuristic = detectHeuristicSignals(text);
  let signals = heuristic.signals;
  let balancingSignals = heuristic.balancingSignals;
  let explanation: string | undefined;
  let nextSteps: string[] | undefined;

  try {
    const llm = await analyzeWithOpenAI(config, {
      text: text || captionText || undefined,
      imageDataUrls,
    });

    if (llm) {
      signals = mergeSignals(signals, llm.signals);
      balancingSignals = [...new Set([...balancingSignals, ...llm.balancingSignals])];
      explanation = llm.explanation;
      nextSteps = llm.nextSteps;
    }
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      event: "openai_analysis_failed",
      message: error instanceof Error ? error.message : String(error),
    }));
  }

  if (caseImages.length && !config.openai.enabled) {
    signals.push({
      type: "image_received_not_analyzed",
      label: "Image received but not vision-analyzed",
      evidence: "Image analysis requires ENABLE_OPENAI_ANALYSIS=true and OPENAI_API_KEY, plus optional image-detection providers.",
      confidence: 0.3,
      weight: 0.2,
      source: "heuristic",
    });
  }

  const score = scoreSignals(signals, balancingSignals.length);
  const riskLevel = riskFromScore(score, signals);
  const sortedSignals = signals.sort((a, b) => b.weight * b.confidence - a.weight * a.confidence).slice(0, 6);

  return {
    caseId: makeId("case"),
    riskLevel,
    score,
    signals: sortedSignals,
    balancingSignals,
    counterSignals: balancingSignals,
    uncertainty: buildUncertainty(riskLevel, score, sortedSignals, balancingSignals, caseImages.length, config.openai.enabled),
    explanation: explanation ?? buildHeuristicExplanation(riskLevel, signals, balancingSignals),
    nextSteps: nextSteps?.length ? nextSteps.slice(0, 4) : defaultNextSteps(riskLevel, signals),
    doNotDo: defaultDoNotDo(riskLevel),
    requiresHumanReview: requiresHumanReview(riskLevel, score, sortedSignals, balancingSignals),
    disclaimer: "Signals are not proof. A low score is not a guarantee, and a high score still deserves careful verification.",
    createdAt: nowIso(),
  };
}

function mergeSignals(a: Signal[], b: Signal[]): Signal[] {
  const byType = new Map<string, Signal>();
  for (const signal of [...a, ...b]) {
    const existing = byType.get(signal.type);
    if (!existing || signal.confidence * signal.weight > existing.confidence * existing.weight) {
      byType.set(signal.type, signal);
    }
  }
  return [...byType.values()];
}

function riskFromScore(score: number, signals: Signal[]): RiskLevel {
  const hasMoney = signals.some((signal) => signal.type === "money_request" && signal.confidence >= 0.7);
  const hasPhoto = signals.some((signal) => ["ai_generated_photo", "reused_photo", "deepfake_or_faceswap"].includes(signal.type) && signal.confidence >= 0.7);
  // Medium-and-high-tier taxonomy rules carry weight >= 1.0; low-tier "soft" rules are below it.
  // A single substantive red flag should never read as LOW (unless balancing context cancels it out).
  const hasSubstantiveSignal = signals.some((signal) => signal.weight >= 1.0);

  if (score >= 5.2 || (hasMoney && score >= 3.0) || (hasPhoto && score >= 3.8)) return "high";
  if (score >= 2.2 || (hasSubstantiveSignal && score >= 0.8)) return "medium";
  return "low";
}

function buildHeuristicExplanation(
  riskLevel: RiskLevel,
  signals: Signal[],
  balancingSignals: string[],
): string {
  if (signals.length === 0) {
    return "I did not see strong romance-scam signals in the text provided. This may simply mean the sample is too short or missing key context.";
  }

  const top = signals.slice(0, 3).map((signal) => signal.label.toLowerCase()).join(", ");
  const balance = balancingSignals.length
    ? ` I also saw balancing context: ${balancingSignals.slice(0, 2).join("; ")}.`
    : "";
  return `This looks ${riskLevel} risk because I found patterns around ${top}.${balance}`;
}

function defaultNextSteps(riskLevel: RiskLevel, signals: Signal[]): string[] {
  const steps = [
    "Do not send money, gift cards, crypto, bank details, identity documents, or verification codes.",
    "Ask for a spontaneous live video call now, not a scheduled or pre-recorded clip.",
    "Share the situation with one trusted friend or family member before making a decision.",
  ];

  if (riskLevel === "low") {
    return [
      "Keep verifying gently: ask for mundane, consistent details and avoid financial pressure.",
      "If money, secrecy, or video-call avoidance appears later, send the new messages for a fresh check.",
    ];
  }

  if (signals.some((signal) => signal.type === "money_request")) {
    steps.unshift("Pause the conversation before replying to any financial request.");
  }

  return steps.slice(0, 4);
}

function defaultDoNotDo(riskLevel: RiskLevel): string[] {
  const base = [
    "Do not send money, gift cards, crypto, bank details, identity documents, or verification codes.",
    "Do not confront them with this result as proof; preserve screenshots and verify calmly.",
  ];

  if (riskLevel === "low") {
    return [
      "Do not treat a low-risk result as a guarantee.",
      "Do not ignore new money pressure, secrecy, or video-call avoidance if it appears later.",
    ];
  }

  return base;
}

function buildUncertainty(
  riskLevel: RiskLevel,
  score: number,
  signals: Signal[],
  balancingSignals: string[],
  imageCount: number,
  openAiEnabled: boolean,
): { level: RiskLevel; reasons: string[] } {
  const reasons: string[] = [];
  if (signals.length === 0) reasons.push("No strong scam signals were found in the submitted context.");
  if (balancingSignals.length > 0) reasons.push("Some details also point toward a genuine interaction.");
  if (imageCount > 0 && !openAiEnabled) reasons.push("Image evidence was received but not vision-analyzed.");
  if (riskLevel === "medium") reasons.push("The score sits in the middle band and should be treated as a signal check.");
  if (score > 0 && score < 2.6) reasons.push("The available evidence is limited or relatively weak.");

  if (reasons.length >= 2 || riskLevel === "medium") return { level: "medium", reasons };
  if (signals.length === 0 || (imageCount > 0 && !openAiEnabled)) return { level: "high", reasons };
  return { level: "low", reasons };
}

function requiresHumanReview(
  riskLevel: RiskLevel,
  score: number,
  signals: Signal[],
  balancingSignals: string[],
): boolean {
  const hasMoney = signals.some((signal) => signal.type === "money_request");
  const hasConflictingContext = signals.length > 0 && balancingSignals.length > 0;
  return (riskLevel === "high" && hasMoney) || score >= 5.2 || hasConflictingContext;
}
