import { isHomeChatCode } from "@/lib/home-chat/codes";

export const HOME_CHAT_INVITE_PREFIX = "aurahud-home-chat:1:";

export type HomeChatInvite = {
  code: string;
  publicKey: string;
};

export function encodeHomeChatInvite(invite: HomeChatInvite): string {
  return `${HOME_CHAT_INVITE_PREFIX}${invite.code}:${invite.publicKey}`;
}

export function parseHomeChatInvite(raw: string): HomeChatInvite | null {
  const value = raw.trim();
  if (!value.startsWith(HOME_CHAT_INVITE_PREFIX)) return null;
  const rest = value.slice(HOME_CHAT_INVITE_PREFIX.length);
  const splitAt = rest.indexOf(":");
  if (splitAt < 0) return null;
  const code = rest.slice(0, splitAt);
  const publicKey = rest.slice(splitAt + 1);
  if (!isHomeChatCode(code) || publicKey.length < 40) return null;
  return { code, publicKey };
}
