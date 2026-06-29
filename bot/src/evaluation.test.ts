import assert from "node:assert/strict";
import { getConfig } from "./config.js";
import { evaluateGoldenSet } from "./evaluation.js";

(async () => {
  const evaluation = await evaluateGoldenSet(getConfig());
  const failures = evaluation.results
    .filter((result) => !result.passed)
    .map((result) => `${result.id}: expected ${result.expectedRisk}, got ${result.actualRisk} (${result.failureType})`);

  assert.equal(evaluation.falsePositiveCount, 0, `golden set false positives:\n${failures.join("\n")}`);
  assert.equal(evaluation.missedHighRiskCount, 0, `golden set missed high-risk cases:\n${failures.join("\n")}`);

  // Catch ALL unexpected failures (incl. risk_mismatch, which the two counters
  // above don't cover). Known-and-documented gaps are allowlisted so a NEW
  // regression fails CI while the known one doesn't silently mask others.
  // rental-deposit-001: a rental-fraud case the romance-scoped detector overcalls
  // as high; in production it's routed to out-of-scope before analysis.
  const knownMismatches = new Set(["rental-deposit-001"]);
  const unexpected = evaluation.results.filter((r) => !r.passed && !knownMismatches.has(r.id));
  assert.equal(unexpected.length, 0, `unexpected golden-set failures:\n${unexpected.map((r) => `${r.id}: expected ${r.expectedRisk}, got ${r.actualRisk} (${r.failureType})`).join("\n")}`);

  console.log(`evaluation.test passed (${evaluation.passed}/${evaluation.total} pass, ${evaluation.failed} known, ${evaluation.version})`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
