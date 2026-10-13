export function driveRequest(url, pin, title, text) {
  return {
    url,
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ pin, title, text }),
    redirect: 'follow',
  };
}

export function parseDriveResponse(raw) {
  let data = null;
  try {
    data = JSON.parse(String(raw || ''));
  } catch {
    data = null;
  }
  if (!data || data.ok !== true) {
    const error = data && data.error === 'bad pin'
      ? 'Wrong PIN. Lock and enter it again.'
      : (data && data.error) || 'Could not save to Drive.';
    return { ok: false, error };
  }
  const url = typeof data.url === 'string' && data.url.startsWith('https://') ? data.url : '';
  return { ok: true, id: data.id || '', url, name: data.name || '' };
}
