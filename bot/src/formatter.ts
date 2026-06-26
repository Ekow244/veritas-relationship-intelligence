import type { RiskLevel, Verdict } from "./types.js";

const riskEmoji: Record<RiskLevel, string> = {
  low: "🟢",
  medium: "🟠",
  high: "🔴",
};

export function greetingMessage(): string {
  return [
    "Hi — I’m Veritas.",
    "",
    "Paste a romantic chat, send a chat screenshot, or send profile photos. I’ll look for romance-scam signals and explain what I find.",
    "",
    "Privacy: I minimize what I store. Reply DELETE anytime to remove your session data.",
  ].join("\n");
}

export function analyzingMessage(): string {
  return "🔎 Analyzing the signals now. I’ll reply with a short verdict and the reasons.";
}

export function formatVerdict(verdict: Verdict): string {
  const reasons = verdict.signals.length
    ? verdict.signals
        .slice(0, 4)
        .map((signal, index) => `${index + 1}. ${signal.label}: “${signal.evidence}”`)
        .join("\n")
    : "No strong red flags found in the submitted sample.";

  const balancing = verdict.balancingSignals.length
    ? `\n\nBalancing signs:\n${verdict.balancingSignals.slice(0, 3).map((item) => `• ${item}`).join("\n")}`
    : "";

  return [
    `${riskEmoji[verdict.riskLevel]} Veritas verdict: ${verdict.riskLevel.toUpperCase()} risk`,
    "",
    verdict.explanation,
    "",
    "Top reasons:",
    reasons,
    balancing,
    "",
    "Next steps:",
    verdict.nextSteps.map((step) => `• ${step}`).join("\n"),
    "",
    verdict.disclaimer,
    "",
    "Reply SCAM, SAFE, or UNSURE later — your report helps improve detection without storing victim PII.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function reportThanksMessage(outcome: string): string {
  return `Thanks. I recorded this as ${outcome.toUpperCase()} feedback for the pattern library, not as a public profile on anyone.`;
}

export function deleteConfirmationMessage(removed: { casesRemoved: number; reportsRemoved: number }): string {
  return `Deleted your active session and removed stored derived records I could match. Cases removed: ${removed.casesRemoved}. Reports removed: ${removed.reportsRemoved}.`;
}

export function scopeRefusalMessage(): string {
  return [
    "I can’t help look someone up, track them, access private accounts, or build a dossier.",
    "",
    "What I can do: review messages, screenshots, or profile photos that were sent to you and explain scam-risk signals.",
  ].join("\n");
}

export function crisisMessage(): string {
  return [
    "I’m sorry you’re dealing with this. First: pause payments and don’t send more money or documents.",
    "",
    "If you may harm yourself or feel unsafe, contact local emergency services now or reach a trusted person immediately.",
    "",
    "For fraud: preserve screenshots, transaction IDs, phone numbers, wallet addresses, and report quickly to your bank/payment provider and local cybercrime/fraud authority.",
    "",
    "You can still paste the chat here and I’ll help identify the signals calmly.",
  ].join("\n");
}

export function outOfScopeMessage(): string {
  return [
    "This MVP is tuned for romance and relationship scams, so I can’t fully assess that category yet.",
    "",
    "General red flags: urgent payment pressure, refusal to verify identity live, secrecy, inconsistent details, and requests for gift cards/crypto/bank codes.",
  ].join("\n");
}

export function askForMoreMessage(): string {
  return [
    "I need a little more to give a useful verdict.",
    "",
    "Paste 10-30 lines of the conversation, send a chat screenshot, or include whether money/video calls/travel were mentioned.",
  ].join("\n");
}

export function imageNeedsVisionMessage(): string {
  return [
    "I received the image.",
    "",
    "For full screenshot/photo analysis, wire `OPENAI_API_KEY` and set `ENABLE_OPENAI_ANALYSIS=true`. For now, paste the chat text too and I can assess the behavior signals.",
  ].join("\n");
}
