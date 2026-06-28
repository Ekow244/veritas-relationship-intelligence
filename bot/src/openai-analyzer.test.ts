import assert from "node:assert/strict";
import { buildContent } from "./openai-analyzer.js";

// text only -> one text part
let c = buildContent("hello", []);
assert.equal(c.length, 1);
assert.equal(c[0].type, "input_text");

// multiple images + text -> one text part + one input_image per image
c = buildContent("caption", ["data:image/png;base64,AAA", "data:image/png;base64,BBB"]);
assert.equal(c.filter((p) => p.type === "input_image").length, 2);
assert.equal(c.filter((p) => p.type === "input_text").length, 1);

// images only (no text) -> just the images
c = buildContent(undefined, ["data:image/png;base64,AAA"]);
assert.equal(c.length, 1);
assert.equal(c[0].type, "input_image");

// nothing -> empty
assert.equal(buildContent(undefined, []).length, 0);

console.log("openai-analyzer.test passed");
