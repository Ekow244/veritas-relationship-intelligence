import assert from "node:assert/strict";
import { IdempotencyStore } from "./idempotency.js";

const store = new IdempotencyStore();

// first sighting is new, second is a duplicate
assert.equal(store.seen("SM123"), false, "first delivery should be new");
assert.equal(store.seen("SM123"), true, "retried delivery should be flagged as seen");

// distinct ids are independent
assert.equal(store.seen("SM999"), false, "a different id should be new");

// expired entries are forgotten (negative TTL: every prior id is always stale)
const shortTtl = new IdempotencyStore(-1);
assert.equal(shortTtl.seen("X"), false);
assert.equal(shortTtl.seen("X"), false, "with an expired TTL the id is no longer remembered");

console.log("idempotency.test passed");
