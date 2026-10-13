import { randomUUID } from 'node:crypto';
import { assertPinConfigured, issueToken, pinMatches, requireAuth } from './auth.js';
import { HttpError } from './errors.js';
import { serverSttEnabled, sttModel, readAudio, transcribeAudio } from './stt.js';
import {
  createTranscript,
  deleteTranscript,
  getTranscript,
  listTranscripts,
  storageMode,
  updateTranscript,
} from './store.js';

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function handleTranscriber(req) {
  const cors = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  try {
    const response = await route(req);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(cors)) headers.set(key, value);
    headers.set('x-content-type-options', 'nosniff');
    headers.set('referrer-policy', 'no-referrer');
    headers.set('x-robots-tag', 'noindex');
    return new Response(response.body, { status: response.status, headers });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (!(err instanceof HttpError) || (status >= 500 && status !== 501 && status !== 503)) console.error(err);
    const message = err instanceof HttpError ? err.message : 'Something went wrong';
    return json(cors, status, { error: message });
  }
}

async function route(req) {
  const url = new URL(req.url);
  const parts = pathnameOf(req, url).split('/').filter(Boolean);
  // api / transcriber / ...
  if (parts[0] !== 'api' || parts[1] !== 'transcriber') {
    throw new HttpError(404, 'Not found');
  }
  const action = parts[2] || '';
  const id = parts[3] || '';

  if (action === 'session' && req.method === 'POST') return session(req);
  if (action === 'config' && req.method === 'GET') return config(req);
  if (action === 'transcripts' && !id && req.method === 'GET') return list(req, url);
  if (action === 'transcripts' && !id && req.method === 'POST') return save(req);
  if (action === 'transcripts' && id && req.method === 'GET') return one(req, id);
  if (action === 'transcripts' && id && req.method === 'DELETE') return remove(req, id);
  if (action === 'transcribe' && req.method === 'POST') return transcribe(req);
  throw new HttpError(404, 'Not found');
}

function pathnameOf(req, url) {
  let pathname = url.pathname;
  if (pathname.includes('/.netlify/functions/')) {
    const forwarded = req.headers.get('x-nf-request-uri') || req.headers.get('x-forwarded-uri') || '';
    if (forwarded) pathname = forwarded.split('?')[0];
  }
  if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);
  return pathname;
}

async function session(req) {
  assertPinConfigured();
  const body = await readJson(req);
  const pin = typeof body.pin === 'string' ? body.pin.trim() : '';
  if (!pin) throw new HttpError(400, 'Enter the PIN');
  if (!pinMatches(pin)) {
    await delay(350);
    throw new HttpError(401, 'Wrong PIN');
  }
  const issued = issueToken();
  return json({}, 200, issued);
}

function config(req) {
  requireAuth(req);
  return json({}, 200, {
    serverStt: serverSttEnabled(),
    model: serverSttEnabled() ? sttModel() : '',
    storage: storageMode(),
  });
}

async function list(req, url) {
  requireAuth(req);
  const full = url.searchParams.get('full') === '1';
  const transcripts = await listTranscripts(full);
  return json({}, 200, { transcripts });
}

async function save(req) {
  requireAuth(req);
  const body = await readJson(req);
  const title = cleanTitle(body.title);
  const text = cleanText(body.text);
  const now = new Date().toISOString();
  if (body.id) {
    const id = cleanId(body.id);
    const updated = await updateTranscript(id, { title, text, updatedAt: now });
    if (!updated) throw new HttpError(404, 'Transcript not found');
    return json({}, 200, updated);
  }
  const created = await createTranscript({
    id: randomUUID(),
    title,
    text,
    createdAt: now,
    updatedAt: now,
  });
  return json({}, 201, created);
}

async function one(req, rawId) {
  requireAuth(req);
  const doc = await getTranscript(cleanId(rawId));
  if (!doc) throw new HttpError(404, 'Transcript not found');
  return json({}, 200, doc);
}

async function remove(req, rawId) {
  requireAuth(req);
  const ok = await deleteTranscript(cleanId(rawId));
  if (!ok) throw new HttpError(404, 'Transcript not found');
  return json({}, 200, { ok: true });
}

async function transcribe(req) {
  requireAuth(req);
  const audio = await readAudio(req);
  const result = await transcribeAudio(audio);
  return json({}, 200, result);
}

function cleanId(value) {
  const id = String(value || '');
  if (!ID_RE.test(id)) throw new HttpError(400, 'Unknown transcript');
  return id;
}

function cleanTitle(value) {
  const title = String(value || '').replace(/\s+/g, ' ').trim();
  if (!title) throw new HttpError(400, 'Add a title first');
  if (title.length > 180) throw new HttpError(400, 'Title is too long');
  return title;
}

function cleanText(value) {
  const text = String(value ?? '').replace(/\r\n/g, '\n');
  if (!text.trim()) throw new HttpError(400, 'Nothing to save yet');
  if (text.length > 1_500_000) throw new HttpError(413, 'Transcript is too large');
  return text;
}

async function readJson(req) {
  const text = await req.text();
  if (text.length > 2_000_000) throw new HttpError(413, 'Request is too large');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'Expected JSON');
  }
}

function json(cors, status, body) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...cors,
  };
  return new Response(JSON.stringify(body), { status, headers });
}

function corsHeaders(req) {
  const origin = req.headers.get('origin');
  if (!origin || !originAllowed(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
    'access-control-allow-headers': 'Authorization, Content-Type, X-Transcriber-Pin',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function originAllowed(origin) {
  try {
    const url = new URL(origin);
    const host = url.hostname;
    if (url.protocol === 'http:' && (host === 'localhost' || host === '127.0.0.1')) return true;
    if (url.protocol !== 'https:') return false;
    return host === 'coachkenny.org' || host === 'www.coachkenny.org' || host === 'kennyhin.github.io';
  } catch {
    return false;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
