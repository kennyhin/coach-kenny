import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleTranscriber } from '../lib/transcriber/handler.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
};

const blocked = new Set(['.git', 'node_modules', '.data', '.env', '.netlify', '.vercel']);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/transcriber')) {
      await serveApi(req, res, url);
      return;
    }
    await serveStatic(req, res, url);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end('Server error');
  }
});

async function serveApi(req, res, url) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const headers = new Headers();
  const skip = new Set(['host', 'connection', 'content-length', 'transfer-encoding']);
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null || skip.has(key.toLowerCase())) continue;
    if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
    else headers.set(key, String(value));
  }
  const request = new Request(url, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
  });
  const response = await handleTranscriber(request);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key === 'content-length') return;
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }
  const rel = decodeURIComponent(url.pathname);
  if (rel.includes('\0') || rel.split('/').some((part) => part === '..' || blocked.has(part))) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  let file = path.join(root, rel);
  if (!file.startsWith(root)) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  let info;
  try {
    info = await stat(file);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  if (info.isDirectory()) file = path.join(file, 'index.html');
  let data;
  try {
    data = await readFile(file);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  const ext = path.extname(file).toLowerCase();
  res.setHeader('content-type', types[ext] || 'application/octet-stream');
  if (file.includes(`${path.sep}transcriber${path.sep}`)) res.setHeader('x-robots-tag', 'noindex');
  if (req.method === 'HEAD') res.end();
  else res.end(data);
}

server.listen(port, host, () => {
  console.log(`Transcriber dev server http://${host}:${port}/bible-study/transcriber/`);
});
