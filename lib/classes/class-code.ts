import { randomBytes } from "crypto"

const CLASS_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

/** Generate a random 6-character alphanumeric class enrollment code. */
export function generateClassCode(): string {
  const bytes = randomBytes(6)
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += CLASS_CODE_CHARS[bytes[i] % CLASS_CODE_CHARS.length]
  }
  return code
}

export const CLASS_CODE_JOIN_RATE_LIMIT = 10
export const CLASS_CODE_JOIN_RATE_WINDOW_SECONDS = 300
