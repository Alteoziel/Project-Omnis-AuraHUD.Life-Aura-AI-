import assert from "node:assert/strict";
import { authCallbackCatchScript, absoluteUrl } from "@/lib/site-url";

const script = authCallbackCatchScript();
assert.equal(script.includes("/auth/callback"), true);
assert.equal(script.includes("token_hash"), true);
assert.equal(script.includes("access_token"), true);

assert.equal(absoluteUrl("/auth/callback/").endsWith("/auth/callback/"), true);

console.log("site-url.test.ts: ok");
