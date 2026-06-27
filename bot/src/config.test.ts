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

console.log("config.test passed");
