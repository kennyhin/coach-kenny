const STAMP_MS = 5 * 60 * 1000;

export function joinUtterance(existing, addition, elapsedMs) {
  const extra = String(addition || '').replace(/\s+/g, ' ').trim();
  const base = existing || '';
  if (!extra) return base;
  if (base.endsWith(extra)) return base;

  const stamp = stampFor(base, elapsedMs);
  let prefix = '';
  if (stamp) prefix = (base && !base.endsWith('\n') ? '\n\n' : '') + stamp + '\n';
  else if (base && !/\s$/.test(base)) prefix = ' ';
  return base + prefix + extra;
}

function stampFor(existing, elapsedMs) {
  if (!elapsedMs || elapsedMs < STAMP_MS) return '';
  const minutes = Math.floor(elapsedMs / STAMP_MS) * 5;
  const token = '[' + formatStamp(minutes) + ']';
  if (existing.includes(token)) return '';
  return token;
}

function formatStamp(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) return hours + ':' + String(mins).padStart(2, '0') + ':00';
  return mins + ':00';
}

export function downloadName(title) {
  const slug = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return (slug || 'transcript') + '.txt';
}

export function downloadBody(title, text, when) {
  const heading = String(title || 'Transcript').trim();
  const stamp = when ? String(when) : '';
  return heading + (stamp ? '\n' + stamp : '') + '\n\n' + String(text || '').replace(/\r\n/g, '\n');
}
