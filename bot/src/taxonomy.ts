import type { Signal } from "./types.js";
import { clamp01, truncate } from "./utils.js";

type TaxonomyRule = {
  type: string;
  label: string;
  weight: number;
  confidence: number;
  patterns: RegExp[];
};

const highWeightRules: TaxonomyRule[] = [
  {
    type: "money_request",
    label: "Money or financial request",
    weight: 3.4,
    confidence: 0.92,
    patterns: [
      /\b(send|transfer|wire|western union|moneygram|cash app|gift card|bitcoin|crypto|wallet|bank account|loan|borrow|fee|customs|medical bill|hospital|emergency|flight|ticket)\b/i,
      /\b(i need|can you help|help me with).{0,80}\b(money|funds|payment|fee|bill|card|rent|hospital|travel)\b/i,
    ],
  },
  {
    type: "refuses_video",
    label: "Avoids spontaneous live video",
    weight: 2.8,
    confidence: 0.78,
    patterns: [
      /\b(can'?t|cannot|not now|camera broken|bad camera|video.*later|no video|don'?t video|network.*bad)\b/i,
      /\b(camera|phone|network).{0,40}\b(broken|bad|not working|problem)\b/i,
      /\b(broken|bad|not working|problem).{0,40}\b(camera|phone|network)\b/i,
      /\b(video call|facetime|live call).{0,60}\b(later|busy|not possible|problem|broken)\b/i,
    ],
  },
  {
    type: "offplatform_pivot",
    label: "Moved off the dating platform quickly",
    weight: 2.2,
    confidence: 0.74,
    patterns: [
      /\b(whatsapp|telegram|signal|hangouts|google chat).{0,80}\b(now|instead|better|private|leave this app)\b/i,
      /\bmessage me on\b.{0,60}\b(whatsapp|telegram|signal|hangouts|google chat)\b/i,
    ],
  },
  {
    type: "classic_unavailable_persona",
    label: "Unavailable-but-plausible persona",
    weight: 2.4,
    confidence: 0.72,
    patterns: [
      /\b(oil rig|military|army|peacekeeping|doctor abroad|surgeon abroad|engineer on contract|contract in|deployed|ship captain|widowed)\b/i,
    ],
  },
];

const mediumWeightRules: TaxonomyRule[] = [
  {
    type: "love_bombing",
    label: "Fast intense affection",
    weight: 1.6,
    confidence: 0.68,
    patterns: [
      /\b(soulmate|my queen|my king|i love you|marry you|destiny|meant to be|my love|my darling)\b/i,
      /\b(love|loves|loving).{0,30}\b(me|you)\b/i,
      /\b(never felt this way|you are the one|spend my life with you)\b/i,
    ],
  },
  {
    type: "secrecy_pressure",
    label: "Secrecy or isolation pressure",
    weight: 1.9,
    confidence: 0.75,
    patterns: [
      /\b(don'?t tell|keep this between us|your family won'?t understand|secret from|hide this)\b/i,
    ],
  },
  {
    type: "future_faking",
    label: "Future-faking or rapid commitment",
    weight: 1.4,
    confidence: 0.64,
    patterns: [
      /\b(we will marry|our future|move to you|relocate|buy a house|start a family)\b/i,
      /\b(when i come|soon we will be together|after this contract)\b/i,
    ],
  },
  {
    type: "story_inconsistency",
    label: "Story or timeline inconsistency",
    weight: 1.7,
    confidence: 0.55,
    patterns: [
      /\b(that'?s not what|you said before|different name|different age|timezone|contradict|inconsistent|doesn'?t match)\b/i,
    ],
  },
];

const lowWeightRules: TaxonomyRule[] = [
  {
    type: "generic_scripted_language",
    label: "Script-like or unusually generic wording",
    weight: 0.7,
    confidence: 0.45,
    patterns: [
      /\b(dear beloved|honest and sincere|god fearing|serious relationship|i am real and honest)\b/i,
    ],
  },
  {
    type: "limited_verifiable_details",
    label: "Few mundane verifiable details",
    weight: 0.8,
    confidence: 0.42,
    patterns: [
      /\b(can'?t share|private person|trust me|no need to ask|why you doubt me)\b/i,
    ],
  },
];

export const taxonomyRules = [...highWeightRules, ...mediumWeightRules, ...lowWeightRules];

export const balancingPatterns = [
  {
    label: "Willing to do a spontaneous live video call",
    pattern: /\b(video call|facetime|live call).{0,60}\b(now|today|sure|yes|happy to)\b/i,
  },
  {
    label: "No money request visible in the submitted text",
    pattern: /\b(no money|never asked for money|hasn'?t asked for money)\b/i,
  },
  {
    label: "Comfortable involving friends or family",
    pattern: /\b(tell your family|meet your friends|talk to your family|bring a friend)\b/i,
  },
  {
    label: "Specific, mundane details appear consistent",
    pattern: /\b(work schedule|local time|neighborhood|same name|consistent|met in person)\b/i,
  },
];

export function detectHeuristicSignals(text: string): { signals: Signal[]; balancingSignals: string[] } {
  const signals: Signal[] = [];

  for (const rule of taxonomyRules) {
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (!match) continue;

      const evidence = extractEvidence(text, match.index ?? 0);
      signals.push({
        type: rule.type,
        label: rule.label,
        evidence,
        confidence: rule.confidence,
        weight: rule.weight,
        source: "heuristic",
      });
      break;
    }
  }

  const balancingSignals = balancingPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);

  return {
    signals: dedupeSignals(signals),
    balancingSignals,
  };
}

export function scoreSignals(signals: Signal[], balancingSignalCount: number): number {
  const weighted = signals.reduce((sum, signal) => {
    return sum + signal.weight * clamp01(signal.confidence);
  }, 0);
  const balanced = Math.max(0, weighted - balancingSignalCount * 0.7);
  return Math.round(balanced * 10) / 10;
}

function extractEvidence(text: string, index: number): string {
  const start = Math.max(0, index - 80);
  const end = Math.min(text.length, index + 180);
  return truncate(text.slice(start, end), 260);
}

function dedupeSignals(signals: Signal[]): Signal[] {
  const seen = new Set<string>();
  const result: Signal[] = [];
  for (const signal of signals.sort((a, b) => b.weight - a.weight)) {
    if (seen.has(signal.type)) continue;
    seen.add(signal.type);
    result.push(signal);
  }
  return result.slice(0, 8);
}
