import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { del, get, put } from '@vercel/blob';
import { getStore } from '@netlify/blobs';
import { env } from './env.js';
import { HttpError } from './errors.js';

const INDEX_KEY = 'transcripts/index.json';

let chain = Promise.resolve();

function lock(fn) {
  const run = chain.then(fn, fn);
  chain = run.then(() => {}, () => {});
  return run;
}

export function storageMode() {
  if (env('BLOB_READ_WRITE_TOKEN')) return 'vercel-blob';
  if (env('NETLIFY')) return 'netlify-blobs';
  if (env('VERCEL')) return 'unconfigured';
  return 'file';
}

function assertConfigured() {
  if (storageMode() === 'unconfigured') {
    throw new HttpError(503, 'BLOB_READ_WRITE_TOKEN is not set. Connect a private Vercel Blob store to this project.');
  }
}

export function createTranscript(doc) {
  assertConfigured();
  return lock(() => backend().create(doc));
}

export function updateTranscript(id, doc) {
  assertConfigured();
  return lock(() => backend().update(id, doc));
}

export function getTranscript(id) {
  assertConfigured();
  return backend().get(id);
}

export function deleteTranscript(id) {
  assertConfigured();
  return lock(() => backend().remove(id));
}

export async function listTranscripts(full) {
  assertConfigured();
  const items = await backend().list();
  const sorted = items.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  if (!full) return sorted.map(summary);
  const detailed = [];
  for (const item of sorted) {
    const doc = await backend().get(item.id);
    detailed.push(doc ? publicDoc(doc) : summary(item));
  }
  return detailed;
}

function summary(item) {
  return {
    id: item.id,
    title: item.title,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    characters: item.characters,
  };
}

function publicDoc(doc) {
  return {
    id: doc.id,
    title: doc.title,
    text: doc.text,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    characters: doc.text.length,
  };
}

function backend() {
  const mode = storageMode();
  if (mode === 'vercel-blob') return blobBackend();
  if (mode === 'netlify-blobs') return netlifyBackend();
  return fileBackend();
}

function blobBackend() {
  const access = 'private';
  return {
    async create(doc) {
      await writeBlob(itemKey(doc.id), doc);
      const index = await readIndexBlob();
      index.items = index.items.filter((item) => item.id !== doc.id);
      index.items.push(toIndex(doc));
      await writeBlob(INDEX_KEY, index);
      return publicDoc(doc);
    },
    async update(id, doc) {
      const current = await readBlob(itemKey(id));
      if (!current) return null;
      const next = { ...current, ...doc, id, createdAt: current.createdAt };
      await writeBlob(itemKey(id), next);
      const index = await readIndexBlob();
      index.items = index.items.map((item) => item.id === id ? toIndex(next) : item);
      if (!index.items.some((item) => item.id === id)) index.items.push(toIndex(next));
      await writeBlob(INDEX_KEY, index);
      return publicDoc(next);
    },
    async get(id) {
      const doc = await readBlob(itemKey(id));
      return doc ? publicDoc(doc) : null;
    },
    async remove(id) {
      const existed = await readBlob(itemKey(id));
      await del(itemKey(id), { access }).catch(() => {});
      const index = await readIndexBlob();
      index.items = index.items.filter((item) => item.id !== id);
      await writeBlob(INDEX_KEY, index);
      return Boolean(existed);
    },
    async list() {
      const index = await readIndexBlob();
      return index.items || [];
    },
  };
}

function itemKey(id) {
  return `transcripts/items/${id}.json`;
}

function toIndex(doc) {
  return {
    id: doc.id,
    title: doc.title,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    characters: doc.text.length,
  };
}

async function writeBlob(pathname, data) {
  await put(pathname, JSON.stringify(data), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}

async function readBlob(pathname) {
  const result = await get(pathname, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text);
}

async function readIndexBlob() {
  const data = await readBlob(INDEX_KEY);
  if (!data || !Array.isArray(data.items)) return { items: [] };
  return data;
}

function netlifyBackend() {
  const store = getStore({ name: 'transcriber', consistency: 'strong' });
  return {
    async create(doc) {
      await store.setJSON(itemKey(doc.id), doc);
      const index = await readIndexStore(store);
      index.items = index.items.filter((item) => item.id !== doc.id);
      index.items.push(toIndex(doc));
      await store.setJSON(INDEX_KEY, index);
      return publicDoc(doc);
    },
    async update(id, doc) {
      const current = await store.get(itemKey(id), { type: 'json' });
      if (!current) return null;
      const next = { ...current, ...doc, id, createdAt: current.createdAt };
      await store.setJSON(itemKey(id), next);
      const index = await readIndexStore(store);
      index.items = index.items.map((item) => item.id === id ? toIndex(next) : item);
      if (!index.items.some((item) => item.id === id)) index.items.push(toIndex(next));
      await store.setJSON(INDEX_KEY, index);
      return publicDoc(next);
    },
    async get(id) {
      const doc = await store.get(itemKey(id), { type: 'json' });
      return doc ? publicDoc(doc) : null;
    },
    async remove(id) {
      const existed = await store.get(itemKey(id), { type: 'json' });
      await store.delete(itemKey(id));
      const index = await readIndexStore(store);
      index.items = index.items.filter((item) => item.id !== id);
      await store.setJSON(INDEX_KEY, index);
      return Boolean(existed);
    },
    async list() {
      const index = await readIndexStore(store);
      return index.items || [];
    },
  };
}

async function readIndexStore(store) {
  const data = await store.get(INDEX_KEY, { type: 'json' });
  if (!data || !Array.isArray(data.items)) return { items: [] };
  return data;
}

function dataDir() {
  return env('TRANSCRIBER_DATA_DIR') || path.join(process.cwd(), '.data', 'transcripts');
}

function fileBackend() {
  const root = dataDir();
  const indexPath = path.join(root, 'index.json');
  return {
    async create(doc) {
      await writeJson(itemPath(root, doc.id), doc);
      const index = await readIndexFile(indexPath);
      index.items = index.items.filter((item) => item.id !== doc.id);
      index.items.push(toIndex(doc));
      await writeJson(indexPath, index);
      return publicDoc(doc);
    },
    async update(id, doc) {
      const current = await readJson(itemPath(root, id));
      if (!current) return null;
      const next = { ...current, ...doc, id, createdAt: current.createdAt };
      await writeJson(itemPath(root, id), next);
      const index = await readIndexFile(indexPath);
      index.items = index.items.map((item) => item.id === id ? toIndex(next) : item);
      if (!index.items.some((item) => item.id === id)) index.items.push(toIndex(next));
      await writeJson(indexPath, index);
      return publicDoc(next);
    },
    async get(id) {
      const doc = await readJson(itemPath(root, id));
      return doc ? publicDoc(doc) : null;
    },
    async remove(id) {
      const file = itemPath(root, id);
      const existed = await readJson(file);
      await rm(file, { force: true });
      const index = await readIndexFile(indexPath);
      index.items = index.items.filter((item) => item.id !== id);
      await writeJson(indexPath, index);
      return Boolean(existed);
    },
    async list() {
      const index = await readIndexFile(indexPath);
      return index.items || [];
    },
  };
}

function itemPath(root, id) {
  return path.join(root, 'items', `${id}.json`);
}

async function readIndexFile(file) {
  const data = await readJson(file);
  if (!data || !Array.isArray(data.items)) return { items: [] };
  return data;
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    if (err && err.code === 'ENOENT') return null;
    throw err;
  }
}

async function writeJson(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data));
  await rename(tmp, file);
}
