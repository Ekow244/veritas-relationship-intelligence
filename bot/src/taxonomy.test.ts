import assert from "node:assert/strict";
import { detectHeuristicSignals } from "./taxonomy.js";

// Regression: car/hobby banter must NOT trigger love-bombing ("my wife" about a car).
const banter = detectHeuristicSignals("haha when I grow up I'll buy a GLE for my wife and a truck for my brother");
assert.ok(!banter.signals.some((s) => s.type === "love_bombing"), "casual 'my wife' must not be love-bombing");

// Genuine endearment still fires.
const lb = detectHeuristicSignals("you are my soulmate and I love you so much already");
assert.ok(lb.signals.some((s) => s.type === "love_bombing"), "genuine love-bombing should still fire");

console.log("taxonomy.test passed");
