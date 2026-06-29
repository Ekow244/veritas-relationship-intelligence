import type { BotConfig } from "./config.js";
import { analyzeSession } from "./analyzer.js";
import { goldenSet, goldenSetVersion, type GoldenCase } from "./golden-set.js";
import type { RiskLevel, Session } from "./types.js";

export type GoldenResult = {
  id: string;
  category: GoldenCase["category"];
  expectedRisk: RiskLevel;
  actualRisk: RiskLevel;
  score: number;
  passed: boolean;
  failureType?: "false_positive" | "missed_high_risk" | "risk_mismatch";
};

export type GoldenEvaluation = {
  version: string;
  total: number;
  passed: number;
  failed: number;
  falsePositiveCount: number;
  missedHighRiskCount: number;
  results: GoldenResult[];
};

export async function evaluateGoldenSet(config: BotConfig): Promise<GoldenEvaluation> {
  const results: GoldenResult[] = [];

  for (const testCase of goldenSet) {
    const verdict = await analyzeSession(config, toSession(testCase));
    const failureType = classifyFailure(testCase.expectedRisk, verdict.riskLevel);
    results.push({
      id: testCase.id,
      category: testCase.category,
      expectedRisk: testCase.expectedRisk,
      actualRisk: verdict.riskLevel,
      score: verdict.score,
      passed: !failureType,
      failureType,
    });
  }

  return {
    version: goldenSetVersion,
    total: results.length,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    falsePositiveCount: results.filter((result) => result.failureType === "false_positive").length,
    missedHighRiskCount: results.filter((result) => result.failureType === "missed_high_risk").length,
    results,
  };
}

function toSession(testCase: GoldenCase): Session {
  const now = Date.now();
  return {
    userRef: `golden:${testCase.id}`,
    startedAt: now,
    updatedAt: now,
    greeted: true,
    inputs: [{
      kind: "chat_text",
      text: testCase.text,
      receivedAt: now,
    }],
  };
}

function classifyFailure(expected: RiskLevel, actual: RiskLevel): GoldenResult["failureType"] {
  if (expected === actual) return undefined;
  if (expected === "low" && actual !== "low") return "false_positive";
  if (expected === "high" && actual === "low") return "missed_high_risk";
  return "risk_mismatch";
}
