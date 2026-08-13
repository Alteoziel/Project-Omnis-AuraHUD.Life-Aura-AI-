import assert from "node:assert/strict";
import {
  APP_NAV_LINKS,
  homeChatLocksAppNav,
  primaryNavLinks,
  secondaryNavLinks,
} from "@/lib/app-nav";

assert.equal(homeChatLocksAppNav("idle"), false);
assert.equal(homeChatLocksAppNav("hosting"), true);
assert.equal(homeChatLocksAppNav("joining"), true);
assert.equal(homeChatLocksAppNav("connecting"), true);
assert.equal(homeChatLocksAppNav("chat"), true);

const open = primaryNavLinks(false);
assert.equal(open.length, APP_NAV_LINKS.length);
assert.equal(
  open.some((link) => link.href === "/hud"),
  true,
);
assert.equal(
  open.some((link) => link.href === "/budget"),
  true,
);

const locked = primaryNavLinks(true);
assert.deepEqual(
  locked.map((link) => link.href),
  ["/home-chat"],
);
assert.equal(secondaryNavLinks(false).length, 3);
assert.deepEqual(secondaryNavLinks(true), []);

console.log("app-nav.test.ts: ok");
