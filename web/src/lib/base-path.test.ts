import assert from "node:assert/strict";
import { publicBasePath, withBasePath } from "@/lib/base-path";

assert.equal(typeof publicBasePath(), "string");
assert.equal(withBasePath("/hud"), `${publicBasePath()}/hud`);
assert.equal(withBasePath("login"), `${publicBasePath()}/login`);

console.log("base-path.test.ts: ok");
