import { env } from './env.js';
import { HttpError } from './errors.js';

const MAX_AUDIO = 4 * 1024 * 1024;
const ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';

export function serverSttEnabled() {
  return Boolean(env('OPENAI_API_KEY'));
}

export function sttModel() {
  return env('OPENAI_TRANSCRIBE_MODEL') || 'gpt-4o-mini-transcribe';
}

export async function readAudio(req) {
  const type = req.headers.get('content-type') || '';
  if (type.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('audio') || form.get('file');
    if (!file || typeof file === 'string') throw new HttpError(400, 'Attach an audio file');
    const bytes = new Uint8Array(await file.arrayBuffer());
    assertSize(bytes);
    return {
      bytes,
      type: file.type || 'audio/webm',
      name: file.name || filenameFor(file.type),
    };
  }
  if (type.startsWith('audio/')) {
    const bytes = new Uint8Array(await req.arrayBuffer());
    assertSize(bytes);
    return { bytes, type, name: filenameFor(type) };
  }
  throw new HttpError(400, 'Send audio as multipart field "audio"');
}

function assertSize(bytes) {
  if (!bytes || bytes.length < 32) throw new HttpError(400, 'Audio chunk was empty');
  if (bytes.length > MAX_AUDIO) throw new HttpError(413, 'Audio chunk is too large');
}

function filenameFor(type) {
  if (type.includes('wav')) return 'chunk.wav';
  if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) return 'chunk.mp4';
  if (type.includes('ogg')) return 'chunk.ogg';
  if (type.includes('mpeg') || type.includes('mp3')) return 'chunk.mp3';
  return 'chunk.webm';
}

export async function transcribeAudio(audio) {
  const key = env('OPENAI_API_KEY');
  if (!key) {
    throw new HttpError(501, 'OPENAI_API_KEY is not set. The page can still transcribe in Chrome without it.');
  }
  const preferred = sttModel();
  try {
    return await callModel(key, preferred, audio);
  } catch (err) {
    if (preferred !== 'whisper-1' && err instanceof HttpError && err.status === 400) {
      return callModel(key, 'whisper-1', audio);
    }
    throw err;
  }
}

async function callModel(key, model, audio) {
  const form = new FormData();
  form.append('file', new Blob([audio.bytes], { type: audio.type }), audio.name);
  form.append('model', model);
  form.append('language', 'en');
  form.append('response_format', 'json');
  form.append('prompt', 'Bible study lecture. Scripture names and verse references.');

  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: AbortSignal.timeout(50000),
    });
  } catch (err) {
    throw new HttpError(502, 'The speech service did not respond');
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload && payload.error && payload.error.message
      ? String(payload.error.message).slice(0, 240)
      : 'Speech service rejected the audio';
    throw new HttpError(res.status >= 500 ? 502 : 400, message);
  }
  return { text: String(payload.text || '').replace(/\s+/g, ' ').trim() };
}
