import type { RiskLevel } from "./types.js";

export type GoldenCase = {
  id: string;
  category: "romance" | "rental" | "benign";
  text: string;
  expectedRisk: RiskLevel;
  notes: string;
};

export const goldenSetVersion = "2026-06-29-mvp-v1";

export const goldenSet: GoldenCase[] = [
  {
    id: "romance-money-video-001",
    category: "romance",
    expectedRisk: "high",
    text: "He says he loves me after two days, needs me to send money for a hospital emergency, and says his camera is broken every time I ask for a live video call.",
    notes: "Classic money request plus live-video avoidance.",
  },
  {
    id: "romance-offplatform-001",
    category: "romance",
    expectedRisk: "medium",
    text: "We matched yesterday and he told me to leave the app and message him on WhatsApp now. He calls me his soulmate but has not asked for money.",
    notes: "Fast off-platform pivot and love-bombing without financial request.",
  },
  {
    id: "benign-distance-001",
    category: "benign",
    expectedRisk: "low",
    text: "We have been talking for a few weeks about books, family, cooking, work schedules, and our neighborhoods. They have not asked for money and said yes to a video call today.",
    notes: "Genuine long-distance style context with balancing signals.",
  },
  {
    id: "benign-joke-001",
    category: "benign",
    expectedRisk: "low",
    text: "He joked that when he is rich he will buy a nice car for his wife. We were joking about dream cars and weekend plans.",
    notes: "Should not overreact to benign joking language.",
  },
  {
    id: "rental-deposit-001",
    category: "rental",
    expectedRisk: "medium",
    text: "The landlord says I cannot view the apartment but must send a deposit today by bank transfer to hold it before someone else takes it.",
    notes: "Rental pressure pattern; current MVP may classify as general payment pressure.",
  },
];
