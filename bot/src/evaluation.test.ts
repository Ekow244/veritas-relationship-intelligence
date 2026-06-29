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

  console.log(`evaluation.test passed (${evaluation.passed}/${evaluation.total}, ${evaluation.version})`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
