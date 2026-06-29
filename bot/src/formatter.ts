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

export function actionStepsMessage(): string {
  return [
    "If this worries you, a few concrete steps:",
    "",
    "• Don’t send money, gift cards, or crypto — and don’t send more if you already have.",
    "• Already sent money? Contact your bank, card issuer, or the gift-card company’s fraud line right away — speed matters for recovery.",
    "• Report it: FTC reportfraud.ftc.gov · FBI IC3 ic3.gov · UK Action Fraud actionfraud.police.uk.",
    "• Block and report the account in the app where you met.",
    "",
    "None of this is your fault — these scams are built to fool careful people. If you’d like to talk to someone, the AARP Fraud Watch helpline (877-908-3360) can help.",
  ].join("\n");
}

export function overloadedMessage(): string {
  return "⏳ I’m a bit overloaded right now — please resend your message in a minute and I’ll finish your read.";
}

export function rateLimitedMessage(): string {
  return "⏳ I’ve hit today’s safety limit for checks. Please try again tomorrow, or reply DELETE if you want me to remove your stored derived records.";
}

export function followUpMessage(): string {
  return "👀 Anything else they’ve said or asked that felt off? Send it and I’ll factor it into the read.";
}

export function formatVerdict(verdict: Verdict): string {
  // The rating line is code-templated (deterministic). The body is the natural,
  // LLM-authored explanation that weaves the evidence in conversationally.
  const uncertaintyLine = verdict.uncertainty.level === "low"
    ? undefined
    : `Uncertainty: ${verdict.uncertainty.reasons[0] ?? "This is a signal check, not proof."}`;

  return [
    `${riskEmoji[verdict.riskLevel]} Veritas verdict: ${verdict.riskLevel.toUpperCase()} risk`,
    "",
    verdict.explanation,
    uncertaintyLine ? "" : undefined,
    uncertaintyLine,
    "",
    verdict.disclaimer,
    "",
    "Reply SCAM, SAFE, or UNSURE later to tell me how it turned out. You can add what happened, like “SCAM - I blocked them and did not send money.”",
  ]
    .filter(Boolean)
    .join("\n");
}

export function reportReminderMessage(): string {
  return "🔎 Want a deeper, human investigation — identity and footprint checks with a documented report? You can request one at https://ekow244.github.io/veritas-relationship-intelligence/";
}

export function reportThanksMessage(outcome: string, avertedHarm = false): string {
  const impact = avertedHarm ? " I also marked it as likely averted harm." : "";
  return `Thanks. I recorded this as ${outcome.toUpperCase()} feedback for the pattern library, not as a public profile on anyone.${impact}`;
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

export function imageUnreadableMessage(): string {
  return "📷 I couldn’t open that image — please try resending it as a photo.";
}

export function imageNeedsVisionMessage(): string {
  return [
    "📷 I got your image but couldn’t read it this time.",
    "",
    "Please copy-paste the chat text instead and I’ll check it for scam warning signs.",
  ].join("\n");
}
