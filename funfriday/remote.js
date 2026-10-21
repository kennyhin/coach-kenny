/** Request shape for the Fun Friday Apps Script web app. */

export function scheduleGetRequest(url) {
  const join = url.includes("?") ? "&" : "?";
  return {
    url: url + join + "ts=" + Date.now(),
    method: "GET",
    redirect: "follow",
    cache: "no-store",
  };
}

/** sessions omitted = passcode check only. Content-Type stays text/plain so Apps Script accepts the POST. */
export function schedulePostRequest(url, passcode, sessions) {
  const body = sessions ? { passcode, sessions } : { passcode, check: true };
  return {
    url,
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(body),
    redirect: "follow",
  };
}

export function parseScheduleResponse(raw) {
  let data = null;
  try {
    data = JSON.parse(String(raw || ""));
  } catch {
    data = null;
  }
  if (!data || data.ok !== true) {
    const code = data && data.error;
    const error = code === "bad passcode"
      ? "That code is not right."
      : code === "no passcode"
        ? "Set the PASSCODE script property, then try again."
        : code === "bad lineup"
          ? "That lineup could not be saved."
          : code === "stored lineup could not be read"
            ? "The shared lineup could not be read."
            : (typeof code === "string" && code) || "Could not reach the lineup.";
    return { ok: false, error };
  }
  return {
    ok: true,
    sessions: Array.isArray(data.sessions) ? data.sessions : null,
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
  };
}
