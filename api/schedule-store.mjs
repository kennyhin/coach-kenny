import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { DEFAULT_SESSIONS, validateSessions } from "../funfriday/schedule.mjs";

const PATHNAME = "funfriday/schedule.json";

let memoryDoc = null;

export function resetScheduleStore() {
  memoryDoc = null;
}

function blobConfigured() {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
    (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)
  );
}

function backend() {
  if (process.env.FUNFRIDAY_STORE === "memory") return "memory";
  if (process.env.FUNFRIDAY_STORE === "file") return "file";
  if (blobConfigured()) return "blob";
  if (process.env.VERCEL) return "unconfigured";
  return "file";
}

/** Private Blob stores use OIDC + BLOB_STORE_ID. A public store uses the read-write token. */
function blobAccess() {
  const override = process.env.FUNFRIDAY_BLOB_ACCESS;
  if (override === "public" || override === "private") return override;
  return process.env.BLOB_STORE_ID ? "private" : "public";
}

function seedDocument() {
  return {
    sessions: structuredClone(DEFAULT_SESSIONS),
    updatedAt: new Date().toISOString(),
  };
}

function filePath() {
  return path.resolve(process.env.FUNFRIDAY_STORE_PATH || path.join(".data", "funfriday-schedule.json"));
}

function acceptStored(doc, storage) {
  const valid = validateSessions(doc && doc.sessions);
  if (!valid.ok) {
    const error = new Error("Stored lineup could not be read.");
    error.status = 500;
    throw error;
  }
  return {
    sessions: valid.sessions,
    updatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : null,
    storage,
  };
}

async function readFileStore() {
  try {
    const text = await readFile(filePath(), "utf8");
    return acceptStored(JSON.parse(text), "file");
  } catch (err) {
    if (err && err.code === "ENOENT") return writeFileStore(seedDocument());
    throw err;
  }
}

async function writeFileStore(doc) {
  const dest = filePath();
  await mkdir(path.dirname(dest), { recursive: true });
  const tmp = dest + ".tmp";
  await writeFile(tmp, JSON.stringify(doc));
  await rename(tmp, dest);
  return acceptStored(doc, "file");
}

async function readBlob() {
  const access = blobAccess();
  const result = await get(PATHNAME, { access, useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) {
    return writeBlob(seedDocument());
  }
  const text = await new Response(result.stream).text();
  return acceptStored(JSON.parse(text), "blob");
}

async function writeBlob(doc) {
  const access = blobAccess();
  await put(PATHNAME, JSON.stringify(doc), {
    access,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  return acceptStored(doc, "blob");
}

export async function readSchedule() {
  const kind = backend();
  if (kind === "unconfigured") {
    return {
      sessions: structuredClone(DEFAULT_SESSIONS),
      updatedAt: null,
      storage: "unconfigured",
    };
  }
  if (kind === "memory") {
    if (!memoryDoc) memoryDoc = seedDocument();
    return acceptStored(memoryDoc, "memory");
  }
  if (kind === "blob") return readBlob();
  return readFileStore();
}

export async function writeSchedule(sessions) {
  const doc = { sessions: structuredClone(sessions), updatedAt: new Date().toISOString() };
  const kind = backend();
  if (kind === "unconfigured") {
    const error = new Error("Shared storage is not connected.");
    error.status = 503;
    throw error;
  }
  if (kind === "memory") {
    memoryDoc = doc;
    return acceptStored(memoryDoc, "memory");
  }
  if (kind === "blob") return writeBlob(doc);
  return writeFileStore(doc);
}
