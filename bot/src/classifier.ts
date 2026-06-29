import type { BotMessage, InputKind } from "./types.js";

const greetingPattern = /^(hi|hello|hey|start|help)$/i;
const reportPattern = /^(scam|safe|unsure)(?:\s*[-:]\s*.+)?$/i;
const deletePattern = /^(delete|delete my data|erase|erase my data)$/i;

const scopeViolationPatterns = [
  /\b(hack|spy|track|gps|location|log in|password|private messages|stalk|surveil|impersonate|catfish them|find out where)\b/i,
  /\b(look up|investigate|find info on|background check).{0,80}\b(person|him|her|them)\b/i,
];

const crisisPatterns = [
  /\b(i lost|sent).{0,60}\b(\$|money|all my savings|life savings|rent|tuition)\b/i,
  /\b(suicidal|kill myself|end my life|can'?t go on|panic|desperate)\b/i,
];

const outOfScopePatterns = [
  /\b(rental|landlord|apartment|job offer|employment|crypto only|investment platform|marketplace|shipping item)\b/i,
];

const chatPattern = /\b(he said|she said|they said|he says|she says|they say|me:|him:|her:|them:|you:|i said|whatsapp|telegram|sent me|send me|asked me|wants me|video call|facetime|money|gift card|loves? (me|you)|love you)\b/i;

export function classifyMessage(message: BotMessage): InputKind {
  const text = message.text?.trim() ?? message.image?.caption?.trim() ?? "";
  if (message.image) return "image";
  if (!text) return "unknown";
  if (deletePattern.test(text)) return "delete_request";
  if (reportPattern.test(text)) return "report_back";
  if (crisisPatterns.some((pattern) => pattern.test(text))) return "crisis";
  if (scopeViolationPatterns.some((pattern) => pattern.test(text))) return "scope_violation";
  if (outOfScopePatterns.some((pattern) => pattern.test(text))) return "out_of_scope";
  if (greetingPattern.test(text)) return "greeting";
  if (chatPattern.test(text) || text.length > 180) return "chat_text";
  if (text.endsWith("?")) return "question";
  return "unknown";
}
