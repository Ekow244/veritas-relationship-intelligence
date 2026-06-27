import type { RiskLevel, Verdict } from "./types.js";

const riskEmoji: Record<RiskLevel, string> = {
  low: "🟢",
  medium: "🟠",
  high: "🔴",
};

export function greetingMessage(): string {
  return [
    "👋 Hi, I’m Veritas — I help you check if someone might be a romance scammer.",
    "",
    "Send me any of these about the person you’re talking to:",
    "• 📷 A screenshot of your chat",
    "• 💬 Copy-paste the messages they sent you",
    "• 🖼️ Their profile photo",
    "",
    "I’ll reply with a risk rating — 🟢 low / 🟠 medium / 🔴 high — and explain the warning signs.",
    "",
    "It helps to mention if they’ve asked for money, dodged a video call, or pushed to chat off the dating app.",
    "",
    "🔒 I don’t keep your chats or photos. Reply DELETE anytime to wipe your data.",
  ].join("\n");
}

export function analyzingMessage(): string {
  return "🔎 Got it — taking a look now…";
}

export function clarifyQuestion(missing: "money" | "video" | "offplatform"): string {
  switch (missing) {
    case "money":
      return "💰 Before I give you a read — has this person asked you for money, gift cards, or crypto, even a small “emergency” loan or “help”?";
    case "video":
      return "📹 One thing first — have they been willing to do a spontaneous live video call (not scheduled or pre-recorded)?";
    case "offplatform":
      return "📱 Quick check — did they push to move the chat off the dating app early, like to WhatsApp or Telegram?";
  }
}

export function followUpMessage(): string {
  return "👀 Anything else they’ve said or asked that felt off? Send it and I’ll factor it into the read.";
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
    "Reply SCAM, SAFE, or UNSURE later to tell me how it turned out — it helps me improve, and I don’t save anyone’s personal info.",
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
    "I need a bit more to give you a useful rating.",
    "",
    "Send a screenshot of the chat, or copy-paste 10+ of their messages.",
    "",
    "Helpful: did they ask for money, avoid a live video call, or push to move off the app?",
  ].join("\n");
}

export function imageNeedsVisionMessage(): string {
  return [
    "📷 I got your image but couldn’t read it this time.",
    "",
    "Please copy-paste the chat text instead and I’ll check it for scam warning signs.",
  ].join("\n");
}
