import assert from "node:assert/strict";
import { safeInternalPath } from "@/lib/paths";

assert.equal(safeInternalPath("/budget"), "/budget");
assert.equal(safeInternalPath("/accounts/abc"), "/accounts/abc");
assert.equal(safeInternalPath("//evil.com"), "/hud");
assert.equal(safeInternalPath("/\\evil.com"), "/hud");
assert.equal(safeInternalPath("https://evil.com"), "/hud");
assert.equal(safeInternalPath("budget"), "/hud");
assert.equal(safeInternalPath(null, "/accounts"), "/accounts");
assert.equal(safeInternalPath("/%2f%2fevil.com"), "/hud");
assert.equal(safeInternalPath("/budget/../login"), "/hud");
assert.equal(safeInternalPath("/https://evil.com"), "/hud");

console.log("paths.test.ts: ok");
