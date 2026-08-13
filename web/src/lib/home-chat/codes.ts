/** Unambiguous nearby pairing codes (no 0/O/1/I). */
export const HOME_CHAT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const HOME_CHAT_CODE_LENGTH = 8;
export const HOME_CHAT_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

export function generateHomeChatCode(
  randomBytes: (size: number) => Uint8Array = (size) =>
    crypto.getRandomValues(new Uint8Array(size)),
): string {
  const bytes = randomBytes(HOME_CHAT_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < HOME_CHAT_CODE_LENGTH; i += 1) {
    code += HOME_CHAT_CODE_ALPHABET[bytes[i]! % HOME_CHAT_CODE_ALPHABET.length];
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
