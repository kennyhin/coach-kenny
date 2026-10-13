import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    await serveStatic(req, res, url);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end('Server error');
  }
});

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
