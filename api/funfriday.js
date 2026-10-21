import { passcodeMatches } from "./passcode.mjs";
import { readSchedule, writeSchedule } from "./schedule-store.mjs";
import { validateSessions } from "../funfriday/schedule.mjs";

const MAX_BODY = 20_000;

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function gate(request) {
  const expected = process.env.FUNFRIDAY_PASSCODE || "";
  if (!expected) {
    return json({ error: "Set FUNFRIDAY_PASSCODE on the server before editing." }, 503);
  }
  const given = request.headers.get("x-funfriday-passcode") || "";
  if (!passcodeMatches(given, expected)) {
    return json({ error: "That code is not right." }, 401);
  }
  return null;
}

export async function GET() {
  try {
    return json(await readSchedule());
  } catch (err) {
    console.error("funfriday read failed", err && err.message);
    return json({ error: "Could not load the shared lineup." }, err.status || 500);
  }
}

/** Check the passcode without changing the lineup. */
export async function POST(request) {
  const denied = gate(request);
  if (denied) return denied;
  return json({ ok: true });
}

export async function PUT(request) {
  const denied = gate(request);
  if (denied) return denied;
  let body;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ error: "That lineup is too big." }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "Send the lineup as JSON." }, 400);
  }
  const valid = validateSessions(body && body.sessions);
  if (!valid.ok) return json({ error: valid.error }, 400);
  try {
    return json(await writeSchedule(valid.sessions));
  } catch (err) {
    console.error("funfriday write failed", err && err.message);
    const status = err.status || 500;
    const error = status === 503
      ? "Shared storage is not connected yet."
      : "Could not save the shared lineup.";
    return json({ error }, status);
  }
}
