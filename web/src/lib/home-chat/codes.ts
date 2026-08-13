/** Unambiguous nearby pairing codes (no 0/O/1/I). Length 32 so we can sample with a mask. */
export const HOME_CHAT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const HOME_CHAT_CODE_LENGTH = 8;
export const HOME_CHAT_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

const ALPHABET_MASK = 31;

export function generateHomeChatCode(
  randomBytes: (size: number) => Uint8Array = (size) =>
    crypto.getRandomValues(new Uint8Array(size)),
): string {
  if (HOME_CHAT_CODE_ALPHABET.length !== ALPHABET_MASK + 1) {
    throw new Error("Home Chat alphabet must stay 32 characters.");
  }
  const bytes = randomBytes(HOME_CHAT_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < HOME_CHAT_CODE_LENGTH; i += 1) {
    code += HOME_CHAT_CODE_ALPHABET[bytes[i]! & ALPHABET_MASK];
  }
  return code;
}

export function normalizeHomeChatCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[0O]/g, "G")
    .replace(/[1I]/g, "L")
    .replace(/[^A-Z2-9]/g, "")
    .slice(0, HOME_CHAT_CODE_LENGTH);
}

export function isHomeChatCode(value: string): boolean {
  return HOME_CHAT_CODE_PATTERN.test(value);
}
