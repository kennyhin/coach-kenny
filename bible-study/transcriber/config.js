// coachkenny.org is GitHub Pages and cannot run the API. When this is set,
// the page on that host calls the API origin (no trailing slash).
// Leave empty to use the same origin (local dev, Vercel, Netlify).
export const REMOTE_API = '';

export function apiOrigin() {
  const remote = String(REMOTE_API || '').replace(/\/$/, '');
  if (typeof location === 'undefined') return remote;
  const host = location.hostname;
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.netlify.app')
  ) {
    return '';
  }
  return remote;
}
