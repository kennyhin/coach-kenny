import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
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
});
