import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { handleTranscriber } from './handler.js';

let dir;
let pin;

before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'transcriber-'));
  pin = 'pin-' + Math.random().toString(36).slice(2);
  process.env.TRANSCRIBER_DATA_DIR = dir;
  process.env.TRANSCRIBER_PIN = pin;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.VERCEL;
  delete process.env.NETLIFY;
  delete process.env.OPENAI_API_KEY;
});

after(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('transcriber API', { concurrency: 1 }, () => {
  test('rejects a wrong PIN and accepts the server PIN', async () => {
    const wrong = await call('/api/transcriber/session', {
      method: 'POST',
      json: { pin: 'nope' },
    });
    assert.equal(wrong.status, 401);
    assert.equal((await wrong.json()).error, 'Wrong PIN');

    const ok = await call('/api/transcriber/session', {
      method: 'POST',
      json: { pin },
    });
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(typeof body.token, 'string');
    assert.ok(body.token.includes('.'));
  });

  test('stores, lists, updates, and returns full text', async () => {
    const token = await unlock();
    const created = await call('/api/transcriber/transcripts', {
      method: 'POST',
      token,
      json: { title: 'Gene Kim - Genesis 3', text: 'In the beginning.' },
    });
    assert.equal(created.status, 201);
    const first = await created.json();

    await new Promise((resolve) => setTimeout(resolve, 5));
    const secondRes = await call('/api/transcriber/transcripts', {
      method: 'POST',
      token,
      json: { title: 'Later study', text: 'And the earth.' },
    });
    const second = await secondRes.json();

    const summary = await call('/api/transcriber/transcripts', { token });
    assert.equal(summary.status, 200);
    const listed = await summary.json();
    assert.equal(listed.transcripts[0].id, second.id);
    assert.equal(listed.transcripts[0].text, undefined);
    assert.equal(listed.transcripts[1].title, 'Gene Kim - Genesis 3');

    const full = await call('/api/transcriber/transcripts?full=1', {
      token,
      pinHeader: true,
    });
    const fullBody = await full.json();
    assert.equal(fullBody.transcripts.find((item) => item.id === first.id).text, 'In the beginning.');

    const one = await call('/api/transcriber/transcripts/' + first.id, { token });
    assert.equal((await one.json()).text, 'In the beginning.');

    const updated = await call('/api/transcriber/transcripts', {
      method: 'POST',
      token,
      json: { id: first.id, title: 'Gene Kim - Genesis 3', text: 'In the beginning God created.' },
    });
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).text, 'In the beginning God created.');

    const removed = await call('/api/transcriber/transcripts/' + second.id, {
      method: 'DELETE',
      token,
    });
    assert.equal(removed.status, 200);
    const missing = await call('/api/transcriber/transcripts/' + second.id, { token });
    assert.equal(missing.status, 404);
  });

  test('requires the PIN header for the assistant', async () => {
    const open = await call('/api/transcriber/transcripts');
    assert.equal(open.status, 401);
    const header = await call('/api/transcriber/transcripts', { pinHeader: true });
    assert.equal(header.status, 200);
  });

  test('reports whether server speech-to-text is configured', async () => {
    const token = await unlock();
    const res = await call('/api/transcriber/config', { token });
    const body = await res.json();
    assert.equal(body.serverStt, false);
    assert.equal(body.storage, 'file');
  });

  test('transcribes a chunk when OPENAI_API_KEY is set', async () => {
    const token = await unlock();
    const missing = await call('/api/transcriber/transcribe', {
      method: 'POST',
      token,
      form: true,
    });
    assert.equal(missing.status, 501);

    process.env.OPENAI_API_KEY = 'sk-test';
    const original = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
      assert.equal(String(url), 'https://api.openai.com/v1/audio/transcriptions');
      assert.equal(opts.headers.Authorization, 'Bearer sk-test');
      return new Response(JSON.stringify({ text: 'In the beginning' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    try {
      const res = await call('/api/transcriber/transcribe', {
        method: 'POST',
        token,
        form: true,
      });
      assert.equal(res.status, 200);
      assert.equal((await res.json()).text, 'In the beginning');
    } finally {
      globalThis.fetch = original;
      delete process.env.OPENAI_API_KEY;
    }
  });

  test('allows the coachkenny.org browser to call the API', async () => {
    const res = await call('/api/transcriber/session', {
      method: 'OPTIONS',
      origin: 'https://coachkenny.org',
    });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://coachkenny.org');
    const blocked = await call('/api/transcriber/session', {
      method: 'OPTIONS',
      origin: 'https://example.com',
    });
    assert.equal(blocked.headers.get('access-control-allow-origin'), null);
  });

  test('refuses to run when the PIN is not configured', async () => {
    const saved = process.env.TRANSCRIBER_PIN;
    delete process.env.TRANSCRIBER_PIN;
    try {
      const res = await call('/api/transcriber/session', {
        method: 'POST',
        json: { pin: 'anything' },
      });
      assert.equal(res.status, 503);
    } finally {
      process.env.TRANSCRIBER_PIN = saved;
    }
  });
});

async function unlock() {
  const res = await call('/api/transcriber/session', { method: 'POST', json: { pin } });
  assert.equal(res.status, 200);
  return (await res.json()).token;
}

async function call(pathname, opts = {}) {
  const headers = new Headers();
  if (opts.origin) headers.set('origin', opts.origin);
  if (opts.token) headers.set('authorization', 'Bearer ' + opts.token);
  if (opts.pinHeader) headers.set('x-transcriber-pin', pin);
  let body;
  if (opts.json) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(opts.json);
  }
  if (opts.form) {
    const form = new FormData();
    form.append('audio', new Blob([new Uint8Array(1200)], { type: 'audio/webm' }), 'chunk.webm');
    body = form;
  }
  return handleTranscriber(new Request('http://127.0.0.1' + pathname, {
    method: opts.method || 'GET',
    headers,
    body,
  }));
}
