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

  const latestImage = [...session.inputs].reverse().find((input) => input.image?.dataUrl)?.image;

  const heuristic = detectHeuristicSignals(text);
  let signals = heuristic.signals;
  let balancingSignals = heuristic.balancingSignals;
  let explanation: string | undefined;
  let nextSteps: string[] | undefined;

  try {
    const llm = await analyzeWithOpenAI(config, {
      text: text || latestImage?.caption,
      imageDataUrl: latestImage?.dataUrl,
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

  if (latestImage && !config.openai.enabled) {
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

  return {
    caseId: makeId("case"),
    riskLevel,
    score,
    signals: signals.sort((a, b) => b.weight * b.confidence - a.weight * a.confidence).slice(0, 6),
    balancingSignals,
    explanation: explanation ?? buildHeuristicExplanation(riskLevel, signals, balancingSignals),
    nextSteps: nextSteps?.length ? nextSteps.slice(0, 4) : defaultNextSteps(riskLevel, signals),
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

  if (score >= 5.2 || (hasMoney && score >= 3.3) || (hasPhoto && score >= 3.8)) return "high";
  if (score >= 2.2) return "medium";
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
