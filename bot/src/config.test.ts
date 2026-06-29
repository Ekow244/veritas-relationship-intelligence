import assert from "node:assert/strict";
import { getConfig } from "./config.js";

// apiBase defaults when env unset
delete process.env.TWILIO_API_BASE;
delete process.env.TWILIO_ACCOUNT_SID;
assert.equal(getConfig().twilio.apiBase, "https://api.twilio.com");
assert.equal(getConfig().twilio.accountSid, undefined);

// values are read from env
process.env.TWILIO_ACCOUNT_SID = "ACxxxx";
process.env.TWILIO_API_BASE = "http://127.0.0.1:9099";
assert.equal(getConfig().twilio.accountSid, "ACxxxx");
assert.equal(getConfig().twilio.apiBase, "http://127.0.0.1:9099");

process.env.PER_USER_DAILY_CHECK_LIMIT = "7";
process.env.GLOBAL_DAILY_CHECK_LIMIT = "70";
process.env.ESTIMATED_COST_CENTS_PER_CHECK = "4";
process.env.ESTIMATED_DAILY_COST_CENTS_LIMIT = "400";
assert.equal(getConfig().guardrails.perUserDailyLimit, 7);
assert.equal(getConfig().guardrails.globalDailyCheckLimit, 70);
assert.equal(getConfig().guardrails.estimatedCostCentsPerCheck, 4);
assert.equal(getConfig().guardrails.estimatedDailyCostCentsLimit, 400);

console.log("config.test passed");
