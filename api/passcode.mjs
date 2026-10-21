import { timingSafeEqual } from "node:crypto";

/** Constant-time check against FUNFRIDAY_PASSCODE. Empty expected passcode never matches. */
export function passcodeMatches(given, expected) {
  if (typeof given !== "string" || typeof expected !== "string" || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || a.length > 200) return false;
  return timingSafeEqual(a, b);
}
