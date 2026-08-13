import assert from "node:assert/strict";
import {
  publicBasePath,
  withBasePath,
  withPagesTrailingSlash,
} from "@/lib/base-path";

assert.equal(typeof publicBasePath(), "string");
assert.equal(withBasePath("/hud"), `${publicBasePath()}/hud`);
assert.equal(withBasePath("login"), `${publicBasePath()}/login`);

assert.equal(withPagesTrailingSlash("/hud"), "/hud/");
assert.equal(withPagesTrailingSlash("/hud/"), "/hud/");
assert.equal(withPagesTrailingSlash("/"), "/");
assert.equal(
  withPagesTrailingSlash("/login?notice=hi&mode=signup"),
  "/login/?notice=hi&mode=signup",
);
assert.equal(withPagesTrailingSlash("/auth/callback#tokens"), "/auth/callback/#tokens");

console.log("base-path.test.ts: ok");
