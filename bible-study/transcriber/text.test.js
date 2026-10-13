import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { DRIVE_URL, PIN_HASH } from './config.js';
import { driveRequest, parseDriveResponse } from './drive.js';
import { pinHash, sameHash } from './pin.js';
import { downloadBody, downloadName, joinUtterance } from './text.js';

test('joins utterances and stamps every five minutes', () => {
  assert.equal(joinUtterance('', 'In the beginning', 1000), 'In the beginning');
  assert.equal(joinUtterance('In the beginning', 'God created', 2000), 'In the beginning God created');
  assert.equal(joinUtterance('In the beginning God created', 'God created', 2000), 'In the beginning God created');
  const stamped = joinUtterance('In the beginning', 'the earth', 5 * 60 * 1000);
  assert.equal(stamped, 'In the beginning\n\n[5:00]\nthe earth');
  assert.equal(joinUtterance(stamped, 'and the light', 6 * 60 * 1000), stamped + ' and the light');
  const hour = joinUtterance('Earlier words', 'more', 65 * 60 * 1000);
  assert.match(hour, /\[1:05:00\]/);
});

test('builds a text download', () => {
  assert.equal(downloadName('Gene Kim - Genesis 3'), 'gene-kim-genesis-3.txt');
  assert.equal(downloadName(''), 'transcript.txt');
  assert.match(downloadBody('Gene Kim', 'Hello', '2026-10-13T00:00:00.000Z'), /^Gene Kim\n2026-10-13T00:00:00.000Z\n\nHello$/);
});

test('Bible Study links to the PIN-locked transcriber', async () => {
  const hub = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const home = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  const robots = await readFile(new URL('../../robots.txt', import.meta.url), 'utf8');
  const page = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(hub, /href="\/bible-study\/transcriber\/"/);
  assert.match(hub, /Transcriber/);
  assert.match(hub, /class="lock"/);
  assert.equal(home.includes('/bible-study/transcriber'), false);
  assert.match(robots, /Disallow: \/bible-study\/transcriber\//);
  assert.match(page, /noindex/);
  assert.equal(page.includes('3144'), false);
  assert.match(page, /id="download"/);
  assert.equal(page.includes('id="saved"'), false);
  assert.equal(page.includes('api-help'), false);
});

test('Save posts the typed PIN to Drive and does not call the old API', async () => {
  const client = await readFile(new URL('./transcriber.js', import.meta.url), 'utf8');
  const config = await readFile(new URL('./config.js', import.meta.url), 'utf8');
  const files = [client, config, await readFile(new URL('./drive.js', import.meta.url), 'utf8')];
  for (const file of files) assert.equal(file.includes('3144'), false);
  assert.match(client, /DRIVE_URL/);
  assert.match(client, /enteredPin/);
  assert.equal(client.includes('/api/transcriber'), false);
  assert.equal(client.includes('apiOrigin'), false);
  const req = driveRequest(DRIVE_URL, 'typed-pin', 'Gene Kim - Genesis 3', 'In the beginning');
  assert.equal(req.method, 'POST');
  assert.equal(req.headers['Content-Type'], 'text/plain');
  assert.equal(req.redirect, 'follow');
  assert.equal(req.url, DRIVE_URL);
  assert.deepEqual(JSON.parse(req.body), {
    pin: 'typed-pin',
    title: 'Gene Kim - Genesis 3',
    text: 'In the beginning',
  });
  const saved = parseDriveResponse('{"ok":true,"id":"abc","url":"https://drive.google.com/file/d/abc","name":"notes.txt"}');
  assert.equal(saved.ok, true);
  assert.equal(saved.url, 'https://drive.google.com/file/d/abc');
  assert.equal(parseDriveResponse('{"ok":true,"url":"javascript:alert(1)"}').url, '');
  assert.equal(parseDriveResponse('{"ok":false,"error":"bad pin"}').error, 'Wrong PIN. Lock and enter it again.');
  assert.equal(parseDriveResponse('not json').ok, false);
});

test('the gate compares a hash and keeps the digits out of the page', async () => {
  const wrong = await pinHash('ck-transcriber-v1', '0000');
  assert.equal(sameHash(wrong, PIN_HASH), false);
  assert.equal(sameHash(PIN_HASH, PIN_HASH), true);
  assert.equal(PIN_HASH.length, 64);
});
