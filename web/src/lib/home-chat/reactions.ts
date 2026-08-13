export const TAPBACK_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🔥"] as const;
export const MAX_REACTION_CHARS = 16;

export type ChatReaction = {
  from: "me" | "them";
  emoji: string;
};

export function firstGrapheme(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return [...segmenter.segment(trimmed)][0]?.segment ?? "";
  }
  return [...trimmed][0] ?? "";
}

export function normalizeReactionEmoji(value: string): string {
  const emoji = firstGrapheme(value);
  if (!emoji || emoji.length > MAX_REACTION_CHARS) return "";
  if (/\s/.test(emoji)) return "";
  return emoji;
}

export function upsertReaction(
  reactions: ChatReaction[] | undefined,
  from: "me" | "them",
  emoji: string,
): ChatReaction[] {
  const next = (reactions ?? []).filter((row) => row.from !== from);
  const normalized = normalizeReactionEmoji(emoji);
  if (!normalized) return next;
  next.push({ from, emoji: normalized });
  return next;
}
