import assert from "node:assert/strict";
import { resolveIsDark, THEME_PAGE_BG } from "@/lib/theme-chrome";

assert.equal(resolveIsDark("dark", false), true);
assert.equal(resolveIsDark("light", true), false);
assert.equal(resolveIsDark("system", true), true);
assert.equal(resolveIsDark("system", false), false);
assert.equal(THEME_PAGE_BG.dark, "#0b1220");
assert.equal(THEME_PAGE_BG.light, "#e8eef4");

console.log("theme-chrome.test.ts: ok");
