import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { env } from './env.js';
import { HttpError } from './errors.js';

const TOKEN_TTL_SEC = 18 * 60 * 60;

export function assertPinConfigured() {
  if (!env('TRANSCRIBER_PIN')) {
    throw new HttpError(503, 'TRANSCRIBER_PIN is not set on the server');
  }
}

export function pinMatches(provided) {
  const expected = env('TRANSCRIBER_PIN');
  if (!expected || typeof provided !== 'string' || provided.length === 0) return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function issueToken() {
  assertPinConfigured();
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  const body = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  const sig = createHmac('sha256', env('TRANSCRIBER_PIN')).update(body).digest('base64url');
  return { token: `${body}.${sig}`, expiresAt: new Date(exp * 1000).toISOString() };
}

export function tokenMatches(token) {
  if (!env('TRANSCRIBER_PIN') || typeof token !== 'string' || !token.includes('.')) return false;
  const dot = token.indexOf('.');
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', env('TRANSCRIBER_PIN')).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' && payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

export function authorized(req) {
  assertPinConfigured();
  const headerPin = req.headers.get('x-transcriber-pin');
  if (headerPin && pinMatches(headerPin.trim())) return true;
  const auth = req.headers.get('authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const bearer = match[1].trim();
  if (bearer.includes('.')) return tokenMatches(bearer);
  return pinMatches(bearer);
}

export function requireAuth(req) {
  if (!authorized(req)) throw new HttpError(401, 'Wrong PIN');
}
